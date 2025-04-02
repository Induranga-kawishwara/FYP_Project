from flask import Blueprint, request, jsonify
from flask_caching import Cache
from services import fetch_all_shops
from services import predict_review_rating, generate_summary
from utils import convert_numpy_types
from services import scrape_reviews  
import logging

product_bp = Blueprint('product', __name__, url_prefix='/product')
# Setup a simple in-memory cache (suitable for development)
cache = Cache(config={'CACHE_TYPE': 'simple'})
cache.init_app(product_bp)

logger = logging.getLogger(__name__)

@product_bp.route("/search_product", methods=["POST", "OPTIONS"])
def search_product():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data = request.get_json()
    product_name = data.get("product")
    review_count = data.get("reviewCount")
    coverage = data.get("coverage")
    location = data.get("location")  # expects a dict with 'lat' and 'lng'

    if not product_name:
        return jsonify({"error": "Product name is required"}), 400
    if not location or not location.get("lat") or not location.get("lng"):
        return jsonify({"error": "User location is required"}), 400

    radius = int(coverage) * 1000  # Convert km to meters
    lat = location.get("lat")
    lng = location.get("lng")

    # Caching based on query parameters to speed up repeated calls
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
            combined_reviews = [" ".join([r["text"] for r in valid_reviews])]
            overall_predicted_rating = predict_review_rating(combined_reviews)
            summary = generate_summary(combined_reviews)
            shop["reviews"] = valid_reviews
            shop["summary"] = summary
            shop["predicted_rating"] = overall_predicted_rating
        else:
            shop["reviews"] = []
            shop["summary"] = "No reviews available."
            shop["predicted_rating"] = 0
        shops.append(convert_numpy_types(shop))

    return jsonify({"shops": shops})
