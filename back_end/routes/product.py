import json
import time
import logging
import asyncio
import nest_asyncio
import threading
from datetime import datetime, timedelta
from concurrent.futures import TimeoutError as ConcurrentTimeoutError
from flask import Blueprint, request, jsonify

from utils import (
    cache,
    CachedShop,
    ZeroReviewShop,
)
from services import (
    fetch_and_filter_shops_with_text,
    predict_review_rating_with_explanations,
    generate_summary,
    fetch_real_reviews,
    fetch_place_details
)

product_bp = Blueprint('product', __name__, url_prefix='/product')
logger = logging.getLogger(__name__)

# AsyncIO setup
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


def process_live_shop(place, review_count):
    place_id = place["place_id"]
    future = asyncio.run_coroutine_threadsafe(
        fetch_real_reviews(place_id, max_reviews=review_count), loop
    )
    try:
        reviews = future.result(timeout=90)
    except Exception:
        ZeroReviewShop.objects(place_id=place_id)\
                      .update_one(set__added_at=datetime.utcnow(), upsert=True)
        return None

    if not reviews:
        ZeroReviewShop.objects(place_id=place_id)\
                      .update_one(set__added_at=datetime.utcnow(), upsert=True)
        return None

    reviews.sort(key=lambda r: r["date"], reverse=True)
    texts = [r["text"] for r in reviews if r.get("text")]
    if not texts:
        ZeroReviewShop.objects(place_id=place_id)\
                      .update_one(set__added_at=datetime.utcnow(), upsert=True)
        return None

    xai = predict_review_rating_with_explanations(texts)
    avg_pred = round(sum(xai["ratings"]) / len(texts), 2)

    # cache full payload
    CachedShop.objects(place_id=place_id).update_one(
        set__name=place["name"],
        set__rating=float(place.get("rating", 0)),
        set__reviews=reviews,
        set__address=place.get("formatted_address", "N/A"),
        set__lat=float(place["geometry"]["location"]["lat"]),
        set__lng=float(place["geometry"]["location"]["lng"]),
        set__cached_at=datetime.utcnow(),
        upsert=True
    )

    return {
        "name":        place["name"],
        "address":     place.get("formatted_address", "N/A"),
        "rating":      float(place.get("rating", 0)),
        "place_id":    place_id,
        "lat":         place["geometry"]["location"]["lat"],
        "lng":         place["geometry"]["location"]["lng"],
        "review_count": len(texts),
        "predicted_rating": avg_pred,
        "summary":     generate_summary(texts),
        "xai_explanations": xai["user_friendly_explanation"],
    }


@product_bp.route("/search_product", methods=["POST", "OPTIONS"])
def search_product():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data = request.get_json()
    product_name = data.get("product")
    review_count  = data.get("reviewCount", 5)
    coverage      = data.get("coverage", 1)
    location      = data.get("location", {})
    skip_ids      = set(data.get("offset", []))

    # Validate inputs
    if not product_name:
        return jsonify({"error": "Product name is required"}), 400
    if not location.get("lat") or not location.get("lng"):
        return jsonify({"error": "User location is required"}), 400

    lat, lng = location["lat"], location["lng"]
    radius   = int(coverage) * 1000

    # Parse date/time filters
    opening_date = None
    opening_time = None
    filter_type = data.get("filterType", "none")
    if filter_type in ("date", "datetime"):
        opening_date = datetime.strptime(data["openingDate"], "%Y-%m-%d").date()
        if filter_type == "datetime":
            opening_time = datetime.strptime(data["openingTime"], "%H:%M:%S").time()

    # Fetch & filter by date/time (if any)
    cache_key = f"shops_{product_name}_{lat}_{lng}_{radius}_{opening_date}_{opening_time}"
    try:
        shops_results = cache.get(cache_key)
        if isinstance(shops_results, str):
            shops_results = json.loads(shops_results)
        if not shops_results:
            shops_results = fetch_and_filter_shops_with_text(
                product_name,
                lat, lng,
                radius,
                opening_date=opening_date,
                opening_time=opening_time
            )
            cache.set(cache_key, shops_results, timeout=300)
    except Exception as e:
        return jsonify({"error": "Failed to fetch shops", "details": str(e)}), 500

    if not shops_results:
        return jsonify({"error": "No shops found"}), 404

    # Zero-review & cache-check & live-scrape → build valid_shops
    valid_shops = []
    cutoff = datetime.utcnow() - timedelta(days=1)

    for place in shops_results:
        pid = place["place_id"]
        if pid in skip_ids:
            continue

        #  skip recent zero-review
        if ZeroReviewShop.objects(place_id=pid, added_at__gte=cutoff).first():
            continue

        # cache hit?
        cs = CachedShop.objects(place_id=pid).first()
        if cs and cs.is_cache_valid() and len(cs.reviews or []) >= review_count:
            texts = sorted(cs.reviews, key=lambda r: r["date"], reverse=True)[:review_count]
            xai = predict_review_rating_with_explanations([t["text"] for t in texts])
            avg_pred = round(sum(xai["ratings"]) / len(texts), 2) if texts else 0.0

            valid_shops.append({
                "name":        cs.name,
                "address":     cs.address,
                "rating":      cs.rating,
                "place_id":    cs.place_id,
                "lat":         cs.lat,
                "lng":         cs.lng,
                "review_count": len(texts),
                "predicted_rating": avg_pred,
                "summary":     generate_summary([t["text"] for t in texts]),
                "xai_explanations": xai["user_friendly_explanation"],
                "phone":       cs.phone or None,
                "opening_hours": cs.opening_hours or None,
                "weekday_text":  cs.weekday_text or []
            })
        else:
            # c) live scrape
            shop = process_live_shop(place, review_count)
            if shop:
                valid_shops.append(shop)

        if len(valid_shops) >= 5:
            break

    if not valid_shops:
        return jsonify({"error": "No valid shops after processing"}), 404

    preds = [s["predicted_rating"] for s in valid_shops if s["predicted_rating"] > 0]
    global_avg = round(sum(preds) / len(preds), 2) if preds else 4.2
    for s in valid_shops:
        s["predicted_rating"] = apply_bayesian_rating(
            s["predicted_rating"], s["review_count"], global_avg
        )
    valid_shops.sort(key=lambda s: s["predicted_rating"], reverse=True)
    final_shops = valid_shops[:5]

    # 4) Enrich phone/opening only if missing, then persist
    for shop in final_shops:
        need_fetch = not shop.get("phone") or not shop.get("opening_hours")
        if need_fetch:
            details = fetch_place_details(shop["place_id"])
            oh    = details.get("opening_hours", {}) or {}
            wd    = oh.get("weekday_text", [])
            phone = details.get("formatted_phone_number", "N/A")
            shop.update(opening_hours=oh, weekday_text=wd, phone=phone)
        else:
            # ensure weekday_text list exists even if only in cache
            shop.setdefault("weekday_text", [])

        # persist phone & opening if we fetched them just now
        CachedShop.objects(place_id=shop["place_id"]).update_one(
            set__phone=shop["phone"],
            set__opening_hours=shop["opening_hours"],
            set__weekday_text=shop["weekday_text"],
            upsert=True
        )

    return safe_jsonify(final_shops)
