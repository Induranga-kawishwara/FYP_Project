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
    scrape_reviews
)

# Blueprint and Logger
product_bp = Blueprint('product', __name__, url_prefix='/product')
logger = logging.getLogger(__name__)

@product_bp.route("/search_product", methods=["POST", "OPTIONS"])
def search_product():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data = request.get_json()
    product_name = data.get("product")
    review_count = data.get("reviewCount")
    coverage     = data.get("coverage")
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

    # If cached as JSON string, parse it
    if isinstance(shops_results, str):
        try:
            shops_results = json.loads(shops_results)
        except json.JSONDecodeError:
            logger.error(f"Cache key {cache_key} contained invalid JSON, clearing cache")
            shops_results = None

    # If it's not a list, drop it and refetch
    if shops_results is not None and not isinstance(shops_results, list):
        logger.error(f"Expected list in cache for {cache_key}, got {type(shops_results)}, clearing cache")
        shops_results = None

    # First‐time fetch or cache cleared
    if not shops_results:
        shops_results = fetch_and_filter_shops_with_text(product_name, lat, lng, radius)
        if shops_results:
            cache.set(cache_key, shops_results, timeout=300)

    if not shops_results:
        return jsonify({"error": "No shops found"}), 404

    # Filter out zero‐review flags and previously returned offsets
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

    # Process up to 3 shops in parallel, take the first 5 that finish
    with ThreadPoolExecutor(max_workers=3) as executor:
        future_to_place = {
            executor.submit(process_shop_with_retry, shop, review_count): shop
            for shop in filtered_shops
        }

        for future in as_completed(future_to_place):
            place = future_to_place[future]
            try:
                shop = future.result()  # no per‐future timeout
                if shop:
                    valid_shops.append(convert_numpy_types(shop))
            except Exception as e:
                logger.error(f"Error processing shop {place.get('place_id')}: {e}", exc_info=True)

            if len(valid_shops) >= desired_shop_count:
                break

        # cancel remaining tasks to free threads/drivers
        for future in future_to_place:
            if not future.done():
                future.cancel()

    valid_shops.sort(key=lambda s: s.get("predicted_rating", 0), reverse=True)
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

        zr = ZeroReviewShop.objects(place_id=place_id).first()
        if zr and zr.is_still_invalid():
            logger.info(f"Skipping zero‐review shop {place_id}")
            return None

        cs = CachedShop.objects(place_id=place_id).first()
        if cs and cs.is_cache_valid():
            logger.info(f"Using cache for {place_id}")
            return {
                "name": cs.name,
                "address": cs.address,
                "rating": cs.rating,
                "place_id": cs.place_id,
                "lat": cs.lat,
                "lng": cs.lng,
                "summary": cs.summary,
                "predicted_rating": cs.predicted_rating,
                "xai_explanations": cs.xai_explanations,
                "raw_xai_explanation": getattr(cs, "raw_xai_explanation", "")
            }

        logger.info(f"Scraping reviews for {place_id}")
        valid_reviews = scrape_reviews(place_id, review_count)
        if not valid_reviews:
            ZeroReviewShop(place_id=place_id).save()
            logger.info(f"No valid reviews for {place_id}")
            return None

        texts = [r["text"] for r in valid_reviews if r.get("text")]
        if not texts:
            ZeroReviewShop(place_id=place_id).save()
            logger.info(f"Empty reviews for {place_id}")
            return None

        logger.info(f"Running XAI predictions for {place_id}")
        xai = predict_review_rating_with_explanations(texts)
        ratings = xai.get("ratings", [])
        avg_pred = round(sum(ratings) / len(ratings), 2) if ratings else 0
        summary = generate_summary(texts)

        shop = {
            "name": place["name"],
            "address": place.get("formatted_address", "N/A"),
            "rating": float(place.get("rating", 0)),
            "place_id": place_id,
            "lat": float(place["geometry"]["location"]["lat"]),
            "lng": float(place["geometry"]["location"]["lng"]),
            "summary": summary,
            "predicted_rating": avg_pred,
            "xai_explanations": xai["user_friendly_explanation"],
            "raw_xai_explanation": xai["raw_explanation"]
        }

        CachedShop(
            name=shop["name"],
            place_id=place_id,
            rating=shop["rating"],
            reviews=valid_reviews,
            summary=summary,
            predicted_rating=avg_pred,
            xai_explanations=shop["xai_explanations"],
            raw_xai_explanation=shop["raw_xai_explanation"],
            address=shop["address"],
            lat=shop["lat"],
            lng=shop["lng"],
            cached_at=datetime.utcnow()
        ).save()
        logger.info(f"Cached shop {place_id}")

        return shop

    except WebDriverException as e:
        logger.error(f"WebDriver error for {place.get('place_id')}: {e}")
        return None
    except Exception as e:
        logger.error(f"Unhandled error processing shop {place.get('place_id')}: {e}", exc_info=True)
        return None
