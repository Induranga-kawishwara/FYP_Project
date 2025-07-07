import json
import time
import logging
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from concurrent.futures import ThreadPoolExecutor, as_completed
from selenium.common.exceptions import WebDriverException

from utils import cache, convert_numpy_types, CachedShop, ZeroReviewShop
from services import (
    fetch_and_filter_shops_with_text,
    predict_review_rating_with_explanations,
    generate_summary,
    fetch_real_reviews
)

# Blueprint and Logger
product_bp = Blueprint('product', __name__, url_prefix='/product')
logger = logging.getLogger(__name__)

def apply_bayesian_rating(avg_pred, review_count, global_avg, m=3):
    if review_count == 0:
        return round(global_avg, 2)
    return round((avg_pred * review_count + global_avg * m) / (review_count + m), 2)


@product_bp.route("/search_product", methods=["POST", "OPTIONS"])
def search_product():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data = request.get_json()
    product_name = data.get("product")
    review_count = data.get("reviewCount", 5)
    coverage     = data.get("coverage", 1)
    location     = data.get("location")
    skip_ids     = data.get("offset", [])

    if not product_name:
        return jsonify({"error": "Product name is required"}), 400
    if not location or not location.get("lat") or not location.get("lng"):
        return jsonify({"error": "User location is required"}), 400

    radius = int(coverage) * 1000
    lat, lng = location["lat"], location["lng"]

    cache_key = f"shops_{product_name}_{lat}_{lng}_{radius}"
    shops_results = cache.get(cache_key)

    if isinstance(shops_results, str):
        try:
            shops_results = json.loads(shops_results)
        except json.JSONDecodeError:
            logger.error(f"Cache key {cache_key} contained invalid JSON, clearing cache")
            shops_results = None

    if shops_results is not None and not isinstance(shops_results, list):
        logger.error(f"Expected list in cache for {cache_key}, got {type(shops_results)}, clearing cache")
        shops_results = None

    if not shops_results:
        shops_results = fetch_and_filter_shops_with_text(product_name, lat, lng, radius)
        if shops_results:
            cache.set(cache_key, shops_results, timeout=300)

    if not shops_results:
        return jsonify({"error": "No shops found"}), 404

    cutoff = datetime.utcnow() - timedelta(days=1)
    filtered_shops = [
        shop for shop in shops_results
        if (
            isinstance(shop, dict)
            and shop.get("place_id") not in skip_ids
            and not ZeroReviewShop.objects(place_id=shop["place_id"], added_at__gte=cutoff).first()
        )
    ]

    desired_shop_count = 5
    valid_shops = []

    with ThreadPoolExecutor(max_workers=3) as executor:
        future_to_place = {
            executor.submit(process_shop_with_retry, shop, review_count): shop
            for shop in filtered_shops
        }
        for future in as_completed(future_to_place):
            place = future_to_place[future]
            try:
                shop = future.result()
                if shop:
                    valid_shops.append(convert_numpy_types(shop))
            except Exception as e:
                logger.error(f"Error processing shop {place.get('place_id')}: {e}", exc_info=True)

            if len(valid_shops) >= desired_shop_count:
                break

        for future in future_to_place:
            if not future.done():
                future.cancel()

    # Compute dynamic global average from all predictions
    all_preds = [s["predicted_rating"] for s in valid_shops if s.get("predicted_rating") > 0]
    global_avg = round(sum(all_preds) / len(all_preds), 2) if all_preds else 4.2

    # Apply Bayesian smoothing for fairer ranking
    for shop in valid_shops:
        shop["predicted_rating"] = apply_bayesian_rating(
            shop.get("predicted_rating", 0),
            shop.get("review_count", 0),
            global_avg
        )

    valid_shops.sort(key=lambda s: s["predicted_rating"], reverse=True)
    return jsonify({"shops": valid_shops[:desired_shop_count]})



def process_shop_with_retry(place, review_count, retries=3, delay=5):
    for attempt in range(1, retries + 1):
        try:
            return process_shop(place, review_count)
        except TimeoutError as e:
            logger.error(f"Timeout on attempt {attempt} for {place.get('place_id')}: {e}")
            time.sleep(delay * (2 ** (attempt - 1)))
        except Exception as e:
            logger.error(f"Error processing shop {place.get('place_id')}: {e}", exc_info=True)
            break
    return None


def process_shop(place, review_count):
    try:
        place_id = place["place_id"]
        logger.info(f"Processing shop {place_id}")

        # Skip recently zero‐reviewed shops
        zr = ZeroReviewShop.objects(place_id=place_id).first()
        if zr and zr.is_still_invalid():
            logger.info(f"Skipping zero-review shop {place_id}")
            return None

        # If cache valid and has at least N reviews, reuse
        cs = CachedShop.objects(place_id=place_id).first()
        if cs and cs.is_cache_valid() and len(cs.reviews or []) >= review_count:
            logger.info(f"Using cached reviews for {place_id}")
            sorted_reviews = sorted(cs.reviews, key=lambda r: r["date"], reverse=True)
            texts = [r["text"] for r in sorted_reviews[:review_count] if r.get("text")]

            xai = predict_review_rating_with_explanations(texts)
            avg_pred = round(sum(xai.get("ratings", [])) / len(texts), 2) if texts else 0
            summary = generate_summary(texts)

            return {
                "name": cs.name,
                "address": cs.address,
                "rating": cs.rating,
                "place_id": cs.place_id,
                "lat": cs.lat,
                "lng": cs.lng,
                "summary": summary,
                "review_count": len(texts),
                "predicted_rating": avg_pred,
                "xai_explanations": xai["user_friendly_explanation"],
                "raw_xai_explanation": xai["raw_explanation"]
            }

        # Otherwise scrape up to 100 reviews
        logger.info(f"Scraping reviews for {place_id}")
        valid_reviews = fetch_real_reviews(place_id, max_reviews=50)
        if not valid_reviews:
            ZeroReviewShop(place_id=place_id).save()
            logger.info(f"No valid reviews for {place_id}")
            return None

        valid_reviews = sorted(valid_reviews, key=lambda r: r["date"], reverse=True)
        top_n_reviews = valid_reviews[:review_count]
        top_n_texts = [r["text"] for r in top_n_reviews if r.get("text")]

        if not top_n_texts:
            ZeroReviewShop(place_id=place_id).save()
            logger.info(f"Empty reviews for {place_id}")
            return None

        logger.info(f"Running XAI predictions for {place_id}")
        xai = predict_review_rating_with_explanations(top_n_texts)
        avg_pred = round(sum(xai.get("ratings", [])) / len(top_n_texts), 2)
        summary = generate_summary(top_n_texts)

        # Cache all 100 reviews
        CachedShop(
            name=place["name"],
            place_id=place_id,
            rating=float(place.get("rating", 0)),
            reviews=valid_reviews,
            address=place.get("formatted_address", "N/A"),
            lat=float(place["geometry"]["location"]["lat"]),
            lng=float(place["geometry"]["location"]["lng"]),
            cached_at=datetime.utcnow()
        ).save()

        logger.info(f"Cached shop {place_id}")

        return {
            "name": place["name"],
            "address": place.get("formatted_address", "N/A"),
            "rating": float(place.get("rating", 0)),
            "place_id": place_id,
            "lat": float(place["geometry"]["location"]["lat"]),
            "lng": float(place["geometry"]["location"]["lng"]),
            "summary": summary,
            "predicted_rating": avg_pred,
            "review_count": len(top_n_texts),
            "xai_explanations": xai["user_friendly_explanation"],
            "raw_xai_explanation": xai["raw_explanation"]
        }


    except WebDriverException as e:
        logger.error(f"WebDriver error for {place.get('place_id')}: {e}")
        return None
    except Exception as e:
        logger.error(f"Unhandled error processing shop {place.get('place_id')}: {e}", exc_info=True)
        return None
