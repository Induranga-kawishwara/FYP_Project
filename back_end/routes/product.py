import json
import time
import logging
import asyncio
import nest_asyncio
import threading
from datetime import datetime, timedelta, time as _time
from flask import Blueprint, request, jsonify

from utils import (
    cache,
    convert_numpy_types,
    CachedShop,
    ZeroReviewShop,
    is_open_on
)
from services import (
    fetch_and_filter_shops_with_text,
    predict_review_rating_with_explanations,
    generate_summary,
    fetch_real_reviews
)

product_bp = Blueprint('product', __name__, url_prefix='/product')
logger = logging.getLogger(__name__)

#  AsyncIO setup 
nest_asyncio.apply()
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)
threading.Thread(target=lambda: loop.run_forever(), daemon=True).start()


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


def process_shop_with_retry(place, review_count, retries=3, delay=5):
    from concurrent.futures import TimeoutError as ConcurrentTimeoutError
    for attempt in range(1, retries + 1):
        try:
            return process_shop(place, review_count)
        except ConcurrentTimeoutError as e:
            logger.warning(f"Timeout on attempt {attempt} for {place['place_id']}: {e}")
            time.sleep(delay * (2 ** (attempt - 1)))
        except Exception as e:
            logger.warning(f"Shop retry error {place['place_id']}: {e}")
            break
    return None


def process_shop(place, review_count):

    try:
        place_id = place["place_id"]
        logger.info(f"Processing {place_id}")

        # Try zero‐review skip 
        zr = ZeroReviewShop.objects(place_id=place_id).first()
        if zr and zr.is_still_invalid():
            return None

        # ─Serve from cache if valid 
        cs = CachedShop.objects(place_id=place_id).first()
        if cs and cs.is_cache_valid() and len(cs.reviews or []) >= review_count:
            texts = [
                r["text"]
                for r in sorted(cs.reviews, key=lambda r: r["date"], reverse=True)[:review_count]
            ]
            xai = predict_review_rating_with_explanations(texts)
            avg_pred = round(sum(xai["ratings"]) / len(texts), 2) if texts else 0.0

            return {
                "name": cs.name,
                "address": cs.address,
                "rating": cs.rating,
                "place_id": cs.place_id,
                "lat": cs.lat,
                "lng": cs.lng,
                "review_count": len(texts),
                "predicted_rating": avg_pred,
                "summary": generate_summary(texts),
                "xai_explanations": xai["user_friendly_explanation"],
                "phone": cs.phone,
                "international_phone_number": cs.international_phone_number,
                "opening_hours": cs.opening_hours,
                "weekday_text": cs.weekday_text,
            }

        # Otherwise fetch live reviews 
        future = asyncio.run_coroutine_threadsafe(
            fetch_real_reviews(place_id, max_reviews=review_count),
            loop
        )
        try:
            valid_reviews = future.result(timeout=90)
        except Exception as e:
            logger.error(f"Timeout fetching reviews for {place_id}: {e}")
            ZeroReviewShop.objects(place_id=place_id).update_one(
                set__added_at=datetime.utcnow(), upsert=True
            )
            return None

        if not valid_reviews:
            ZeroReviewShop.objects(place_id=place_id).update_one(
                set__added_at=datetime.utcnow(), upsert=True
            )
            return None

        valid_reviews.sort(key=lambda r: r["date"], reverse=True)
        top = valid_reviews[:review_count]
        texts = [r["text"] for r in top if r.get("text")]
        if not texts:
            ZeroReviewShop.objects(place_id=place_id).update_one(
                set__added_at=datetime.utcnow(), upsert=True
            )
            return None

        xai = predict_review_rating_with_explanations(texts)
        avg_pred = round(sum(xai["ratings"]) / len(texts), 2)

        # pull lat/lng from place payload
        lat = float(place["geometry"]["location"]["lat"])
        lng = float(place["geometry"]["location"]["lng"])

        CachedShop.objects(place_id=place_id).update_one(
            set__name=place["name"],
            set__rating=float(place.get("rating", 0)),
            set__reviews=valid_reviews,
            set__address=place.get("formatted_address", "N/A"),
            set__lat=lat,
            set__lng=lng,
            set__cached_at=datetime.utcnow(),
            set__phone=place.get("phone"),
            set__international_phone_number=place.get("international_phone_number"),
            set__opening_hours=place.get("opening_hours", {}),
            set__weekday_text=place.get("weekday_text", []),
            upsert=True
        )

        return {
            "name": place["name"],
            "address": place.get("formatted_address", "N/A"),
            "rating": float(place.get("rating", 0)),
            "place_id": place_id,
            "lat": lat,
            "lng": lng,
            "review_count": len(texts),
            "predicted_rating": avg_pred,
            "summary": generate_summary(texts),
            "xai_explanations": xai["user_friendly_explanation"],
            "phone": place.get("phone"),
            "international_phone_number": place.get("international_phone_number"),
            "opening_hours": place.get("opening_hours", {}),
            "weekday_text": place.get("weekday_text", []),
        }

    except Exception as e:
        logger.exception(f"Process shop failed: {place.get('place_id')}")
        return None


@product_bp.route("/search_product", methods=["POST", "OPTIONS"])
def search_product():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data = request.get_json()
    product_name = data.get("product")
    review_count  = data.get("reviewCount", 5)
    coverage      = data.get("coverage", 1)
    location      = data.get("location")
    skip_ids      = data.get("offset", [])

    # read filter settings
    filter_type = data.get("filterType", "none")
    opening_date = None
    opening_time = None
    if filter_type in ("date", "datetime"):
        opening_date = datetime.strptime(data["openingDate"], "%Y-%m-%d").date()
        if filter_type == "datetime":
            opening_time = datetime.strptime(data["openingTime"], "%H:%M:%S").time()

    logger.info(f"Payload: {data}")
    logger.info(f"Searching product: {product_name} with {review_count} reviews")

    # validation
    if not product_name:
        return jsonify({"error": "Product name is required"}), 400
    if not location or not location.get("lat") or not location.get("lng"):
        return jsonify({"error": "User location is required"}), 400

    lat, lng = location["lat"], location["lng"]
    radius   = int(coverage) * 1000
    cache_key = f"shops_{product_name}_{lat}_{lng}_{radius}"
    shops_results = cache.get(cache_key)

    if isinstance(shops_results, str):
        try:
            shops_results = json.loads(shops_results)
        except:
            shops_results = None

    if not shops_results:
        try:
            shops_results = fetch_and_filter_shops_with_text(
                product_name, lat, lng, radius
            )
            cache.set(cache_key, shops_results, timeout=300)
        except Exception as e:
            return jsonify({"error": "Failed to fetch shops", "details": str(e)}), 500

    # apply opening-hours filter
    if filter_type in ("date", "datetime"):
        shops_results = [
            s for s in shops_results
            if is_open_on(s.get("opening_hours", {}),
                          opening_date, opening_time)
        ]

    if not shops_results:
        return jsonify({"error": "No shops found"}), 404

    cutoff = datetime.utcnow() - timedelta(days=1)
    filtered = [
        s for s in shops_results
        if s["place_id"] not in skip_ids
        and not ZeroReviewShop.objects(
            place_id=s["place_id"], added_at__gte=cutoff
        ).first()
    ]

    valid_shops = []
    desired_shop_count = 5

    for place in filtered:
        shop = process_shop_with_retry(place, review_count)
        if shop:
            clean = convert_numpy_types(shop)
            try:
                json.dumps(clean)
                valid_shops.append(clean)
            except:
                pass
        if len(valid_shops) >= desired_shop_count:
            break

    # Bayesian smoothing + sort
    try:
        preds = [s["predicted_rating"] for s in valid_shops if s["predicted_rating"] > 0]
        global_avg = round(sum(preds)/len(preds), 2) if preds else 4.2

        for s in valid_shops:
            s["predicted_rating"] = apply_bayesian_rating(
                s["predicted_rating"],
                s["review_count"],
                global_avg
            )

        valid_shops.sort(key=lambda s: s["predicted_rating"], reverse=True)
        return safe_jsonify(valid_shops)

    except Exception:
        return jsonify({"error": "Result preparation failed"}), 500
