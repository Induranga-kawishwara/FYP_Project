from flask import Blueprint, request, jsonify
from utils import cache, convert_numpy_types
from services import (
    fetch_and_filter_shops_with_text,
    predict_review_rating_with_explanations,
    generate_summary,
    scrape_reviews
)
from utils import CachedShop, ZeroReviewShop
import logging
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from selenium.common.exceptions import WebDriverException
import time

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
    coverage = data.get("coverage")
    location = data.get("location")
    skip_ids = data.get("offset", [])

    if not product_name:
        return jsonify({"error": "Product name is required"}), 400
    if not location or not location.get("lat") or not location.get("lng"):
        return jsonify({"error": "User location is required"}), 400

    radius = int(coverage) * 1000
    lat = location.get("lat")
    lng = location.get("lng")

    cache_key = f"shops_{product_name}_{lat}_{lng}_{radius}"
    shops_results = cache.get(cache_key)
    if not shops_results:
        shops_results = fetch_and_filter_shops_with_text(product_name, lat, lng, radius)
        if shops_results:
            cache.set(cache_key, shops_results, timeout=300)

    if not shops_results:
        return jsonify({"error": "No shops found"}), 404

    filtered_shops = [
        shop for shop in shops_results
        if shop["place_id"] not in skip_ids and not ZeroReviewShop.objects(
            place_id=shop["place_id"], added_at__gte=datetime.utcnow() - timedelta(days=1)
        ).first()
    ]

    desired_shop_count = 5
    valid_shops = []

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = []
        index = 0

        while len(valid_shops) < desired_shop_count and index < len(filtered_shops):
            while index < len(filtered_shops) and len(futures) < 3:
                futures.append(executor.submit(process_shop_with_retry, filtered_shops[index], review_count))
                index += 1

            for future in list(futures):
                try:
                    shop = future.result(timeout=180)
                    if shop:
                        valid_shops.append(convert_numpy_types(shop))
                except TimeoutError as e:
                    logger.error(f"Timeout error processing shop: {e}")
                except Exception as e:
                    logger.error(f"Error processing shop: {e}", exc_info=True)
                finally:
                    futures.remove(future)
                if len(valid_shops) >= desired_shop_count:
                    break

    valid_shops.sort(key=lambda shop: shop.get("predicted_rating", 0), reverse=True)

    return jsonify({"shops": valid_shops[:desired_shop_count]})


def process_shop_with_retry(place, review_count, retries=3, delay=5):
    for attempt in range(retries):
        try:
            return process_shop(place, review_count)
        except TimeoutError as e:
            logger.error(f"Timeout error on attempt {attempt+1}: {e}")
            time.sleep(delay * (2 ** attempt))
        except Exception as e:
            logger.error(f"Error processing shop {place.get('place_id', 'unknown')}: {e}")
            break
    return None


def process_shop(place, review_count):
    try:
        place_id = place["place_id"]
        logger.info(f"Processing shop {place_id} - {place['name']}")

        zero_entry = ZeroReviewShop.objects(place_id=place_id).first()
        if zero_entry and zero_entry.is_still_invalid():
            logger.info(f"Skipping shop {place_id} due to zero review flag.")
            return None

        cached_shop = CachedShop.objects(place_id=place_id).first()
        if cached_shop and cached_shop.is_cache_valid():
            shop = {
                "name": cached_shop.name,
                "address": cached_shop.address,
                "rating": cached_shop.rating,
                "place_id": cached_shop.place_id,
                "lat": cached_shop.lat,
                "lng": cached_shop.lng,
                "summary": cached_shop.summary,
                "predicted_rating": cached_shop.predicted_rating,
                "xai_explanations": cached_shop.xai_explanations,
                "raw_xai_explanation": getattr(cached_shop, "raw_xai_explanation", "")
            }
            logger.info(f"Using cached data for shop {place_id}.")
        else:
            logger.info(f"Fetching new data for shop {place_id}.")
            shop = {
                "name": place["name"],
                "address": place.get("formatted_address", "N/A"),
                "rating": float(place.get("rating", 0)),
                "place_id": place["place_id"],
                "lat": float(place["geometry"]["location"]["lat"]),
                "lng": float(place["geometry"]["location"]["lng"])
            }

            try:
                logger.info(f"Scraping reviews for shop {place_id}.")
                valid_reviews = scrape_reviews(shop["place_id"], review_count)
            except WebDriverException as e:
                logger.error(f"WebDriver exception: {e}")
                return None

            if not valid_reviews:
                ZeroReviewShop(place_id=shop["place_id"]).save()
                logger.info(f"No valid reviews for shop {place_id}.")
                return None

            combined_reviews = [" ".join([r["text"] for r in valid_reviews if r.get("text", "").strip()])]
            if not combined_reviews[0].strip():
                ZeroReviewShop(place_id=shop["place_id"]).save()
                logger.info(f"Empty reviews for shop {place_id}.")
                return None

            logger.info(f"Generating predictions for shop {place_id}.")
            xai_results = predict_review_rating_with_explanations(combined_reviews)
            summary = generate_summary(combined_reviews)

            shop["summary"] = summary
            shop["predicted_rating"] = xai_results["predicted_rating"]
            shop["xai_explanations"] = xai_results["user_friendly_explanation"]
            shop["raw_xai_explanation"] = xai_results["raw_explanation"]

            cached_shop = CachedShop(
                name=shop["name"],
                place_id=shop["place_id"],
                rating=shop.get("rating", None),
                reviews=valid_reviews,
                summary=shop.get("summary", "No summary available"),
                predicted_rating=shop.get("predicted_rating", None),
                xai_explanations=shop.get("xai_explanations", "No explanations available"),
                raw_xai_explanation=shop.get("raw_xai_explanation", ""),
                address=shop.get("address", "No address available"),
                lat=shop.get("lat", None),
                lng=shop.get("lng", None),
                cached_at=datetime.utcnow()
            )
            cached_shop.save()
            logger.info(f"Shop {place_id} cached.")

        return shop
    except Exception as e:
        logger.error(f"Unhandled error processing shop {place.get('place_id', 'unknown')}: {e}")
        return None
