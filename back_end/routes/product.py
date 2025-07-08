import json
import time
import logging
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from concurrent.futures import ThreadPoolExecutor, as_completed

from utils import cache, convert_numpy_types, CachedShop, ZeroReviewShop
from services import (
    fetch_and_filter_shops_with_text,
    predict_review_rating_with_explanations,
    generate_summary,
    fetch_real_reviews
)

product_bp = Blueprint('product', __name__, url_prefix='/product')
logger = logging.getLogger(__name__)


def apply_bayesian_rating(avg_pred, review_count, global_avg, m=3):
    if review_count == 0:
        return round(global_avg, 2)
    return round((avg_pred * review_count + global_avg * m) / (review_count + m), 2)


def safe_jsonify(data):
    try:
        payload = json.dumps({"shops": data}, default=str)
        return jsonify(json.loads(payload)), 200
    except Exception as e:
        logger.exception("Serialization failure")
        return jsonify({"error": "Serialization failed", "details": str(e)}), 500


@product_bp.route("/search_product", methods=["POST", "OPTIONS"])
def search_product():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data = request.get_json()
    product_name = data.get("product")
    review_count = data.get("reviewCount", 5)
    coverage = data.get("coverage", 1)
    location = data.get("location")
    skip_ids = data.get("offset", [])

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
            logger.error(f"Invalid JSON in cache key: {cache_key}")
            shops_results = None

    if shops_results is not None and not isinstance(shops_results, list):
        logger.error(f"Expected list in cache for {cache_key}, got {type(shops_results)}")
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
        if isinstance(shop, dict)
        and shop.get("place_id") not in skip_ids
        and not ZeroReviewShop.objects(place_id=shop["place_id"], added_at__gte=cutoff).first()
    ]

    valid_shops = []
    desired_shop_count = 5

    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_place = {
            executor.submit(process_shop_with_retry, shop, review_count): shop
            for shop in filtered_shops
        }
        for future in as_completed(future_to_place):
            place = future_to_place[future]
            try:
                shop = future.result()
                if shop:
                    try:
                        clean_shop = convert_numpy_types(shop)
                        json.dumps(clean_shop)
                        valid_shops.append(clean_shop)
                    except Exception as e:
                        logger.warning(f"Serialization failed for {shop.get('place_id')}: {e}")
            except Exception as e:
                logger.warning(f"Shop error {place.get('place_id')}: {e}")
            if len(valid_shops) >= desired_shop_count:
                break
        for future in future_to_place:
            if not future.done():
                future.cancel()

    try:
        all_preds = [float(s.get("predicted_rating", 0)) for s in valid_shops if float(s.get("predicted_rating", 0)) > 0]
        global_avg = round(sum(all_preds) / len(all_preds), 2) if all_preds else 4.2

        for shop in valid_shops:
            shop["predicted_rating"] = apply_bayesian_rating(
                shop.get("predicted_rating", 0),
                shop.get("review_count", 0),
                global_avg
            )

        valid_shops.sort(key=lambda s: s.get("predicted_rating", 0), reverse=True)
        return safe_jsonify(valid_shops)

    except Exception as e:
        logger.exception("Rating/sorting error")
        return jsonify({"error": "Result preparation failed"}), 500


def process_shop_with_retry(place, review_count, retries=3, delay=5):
    for attempt in range(1, retries + 1):
        try:
            return process_shop(place, review_count)
        except TimeoutError as e:
            logger.warning(f"Timeout on attempt {attempt} for {place.get('place_id')}: {e}")
            time.sleep(delay * (2 ** (attempt - 1)))
        except Exception as e:
            logger.warning(f"Shop retry error {place.get('place_id')}: {e}")
            break
    return None


def process_shop(place, review_count):
    try:
        place_id = place["place_id"]
        logger.info(f"Processing {place_id}")

        zr = ZeroReviewShop.objects(place_id=place_id).first()
        if zr and zr.is_still_invalid():
            return None

        cs = CachedShop.objects(place_id=place_id).first()
        if cs and cs.is_cache_valid() and len(cs.reviews or []) >= review_count:
            sorted_reviews = sorted(cs.reviews, key=lambda r: r["date"], reverse=True)
            texts = [r["text"] for r in sorted_reviews[:review_count] if r.get("text")]
            xai = predict_review_rating_with_explanations(texts)
            avg_pred = round(sum(xai.get("ratings", [])) / len(texts), 2) if texts else 0
            return {
                "name": cs.name,
                "address": cs.address,
                "rating": cs.rating,
                "place_id": cs.place_id,
                "lat": cs.lat,
                "lng": cs.lng,
                "review_count": len(texts),
                "predicted_rating": avg_pred,
                # "summary": generate_summary(texts),
                # "xai_explanations": xai["user_friendly_explanation"],
            }

        valid_reviews = fetch_real_reviews(place_id, max_reviews=50)
        if not valid_reviews:
            ZeroReviewShop.objects(place_id=place_id).update_one(set__added_at=datetime.utcnow(), upsert=True)
            return None

        valid_reviews.sort(key=lambda r: r["date"], reverse=True)
        top_n_reviews = valid_reviews[:review_count]
        top_n_texts = [r["text"] for r in top_n_reviews if r.get("text")]
        if not top_n_texts:
            ZeroReviewShop.objects(place_id=place_id).update_one(set__added_at=datetime.utcnow(), upsert=True)
            return None

        xai = predict_review_rating_with_explanations(top_n_texts)
        avg_pred = round(sum(xai.get("ratings", [])) / len(top_n_texts), 2)

        CachedShop.objects(place_id=place_id).update_one(
            set__name=place["name"],
            set__rating=float(place.get("rating", 0)),
            set__reviews=valid_reviews,
            set__address=place.get("formatted_address", "N/A"),
            set__lat=float(place["geometry"]["location"]["lat"]),
            set__lng=float(place["geometry"]["location"]["lng"]),
            set__cached_at=datetime.utcnow(),
            upsert=True
        )

        return {
            "name": place["name"],
            "address": place.get("formatted_address", "N/A"),
            "rating": float(place.get("rating", 0)),
            "place_id": place_id,
            "lat": float(place["geometry"]["location"]["lat"]),
            "lng": float(place["geometry"]["location"]["lng"]),
            "review_count": len(top_n_texts),
            "predicted_rating": avg_pred,
            # "summary": generate_summary(top_n_texts),
            # "xai_explanations": xai["user_friendly_explanation"],
        }

    except Exception as e:
        logger.exception(f"Process shop failed: {place.get('place_id')}")
        return None
