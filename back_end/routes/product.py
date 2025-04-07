from flask import Blueprint, request, jsonify
from utils import cache, convert_numpy_types
from services import (
    fetch_all_shops,
    predict_review_rating_with_explanations,
    generate_summary,
    scrape_reviews
)
import logging

product_bp = Blueprint('product', __name__, url_prefix='/product')
logger = logging.getLogger(__name__)

@product_bp.route("/search_product", methods=["POST", "OPTIONS"])
def search_product():
    # Handle preflight OPTIONS request.
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data = request.get_json()
    product_name = data.get("product")
    review_count = data.get("reviewCount")
    coverage = data.get("coverage")
    location = data.get("location")  # Expects a dict with 'lat' and 'lng'

    if not product_name:
        return jsonify({"error": "Product name is required"}), 400
    if not location or not location.get("lat") or not location.get("lng"):
        return jsonify({"error": "User location is required"}), 400

    # Convert coverage (assumed in km) to meters and extract lat/lng.
    radius = int(coverage) * 1000  
    lat = location.get("lat")
    lng = location.get("lng")

    # Use caching to reduce repeated API calls.
    cache_key = f"shops_{product_name}_{lat}_{lng}_{radius}"
    shops_results = cache.get(cache_key)
    if not shops_results:
        shops_results = fetch_all_shops(product_name, lat, lng, radius)
        if shops_results:
            cache.set(cache_key, shops_results, timeout=300)  # Cache for 5 minutes

    if not shops_results:
        return jsonify({"error": "No shops found"}), 404

    shops = []
    for place in shops_results:
        shop = {
            "shop_name": place["name"],
            "address": place.get("formatted_address", "N/A"),
            "rating": float(place.get("rating", 0)),
            "place_id": place["place_id"],
            "lat": float(place["geometry"]["location"]["lat"]),
            "lng": float(place["geometry"]["location"]["lng"])
        }
        try:
            valid_reviews = scrape_reviews(shop["place_id"], review_count)
        except Exception as e:
            logger.error(f"Error scraping reviews for place_id {shop['place_id']}: {str(e)}")
            valid_reviews = []

        if valid_reviews:
            # Combine individual review texts into a single string for prediction.
            combined_reviews = [" ".join([r["text"] for r in valid_reviews])]
            # Predict rating and obtain XAI outputs (including user-friendly explanations).
            xai_results = predict_review_rating_with_explanations(combined_reviews)
            summary = generate_summary(combined_reviews)
            shop["reviews"] = valid_reviews
            shop["summary"] = summary
            shop["predicted_rating"] = xai_results["predicted_rating"]
            shop["xai_explanations"] = xai_results["explanations"]
        else:
            shop["reviews"] = []
            shop["summary"] = "No reviews available."
            shop["predicted_rating"] = 0
            shop["xai_explanations"] = []
        
        shops.append(convert_numpy_types(shop))

    return jsonify({"shops": shops})
