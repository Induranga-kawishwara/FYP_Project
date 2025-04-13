from flask import Blueprint, request, jsonify
from utils import cache, convert_numpy_types
from services import (
    fetch_all_shops,
    predict_review_rating_with_explanations,
    generate_summary,
    scrape_reviews
)
from utils import CachedShop  # Import the CachedShop model
import logging
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from selenium.common.exceptions import WebDriverException
import time

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
    location = data.get("location")  
    skip_ids = data.get("offset", [])  

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

    # Filter out already displayed shops based on skip_ids
    filtered_shops = [shop for shop in shops_results if shop["place_id"] not in skip_ids]

    shops = []

    # Initialize ThreadPoolExecutor with a maximum of 5 concurrent threads
    with ThreadPoolExecutor(max_workers=5) as executor:
        # Create a list of futures (tasks) for shop processing, but limit it to 5 new shops
        futures = [executor.submit(process_shop, place, review_count) for place in filtered_shops[:5]]  # Limit to 5 shops

        # Wait for all futures to complete and gather results
        for future in futures:
            try:
                shop = future.result()
                if shop:
                    shops.append(convert_numpy_types(shop))  # Ensure the correct format for the response
            except Exception as e:
                logger.error(f"Error processing shop: {e}")

    return jsonify({"shops": shops})


def process_shop(place, review_count):
    try:
        place_id = place["place_id"]
        cached_shop = CachedShop.objects(place_id=place_id).first()

        if cached_shop and cached_shop.is_cache_valid():
            # If the cached data is valid, use it
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
            }
        else:
            shop = {
                "name": place["name"],
                "address": place.get("formatted_address", "N/A"),
                "rating": float(place.get("rating", 0)),
                "place_id": place["place_id"],
                "lat": float(place["geometry"]["location"]["lat"]),
                "lng": float(place["geometry"]["location"]["lng"])
            }

            try:
                valid_reviews = scrape_reviews(shop["place_id"], review_count)
            except WebDriverException as e:
                logger.error(f"WebDriver exception while scraping reviews for place_id {shop['place_id']}: {e}")
                valid_reviews = []  # Handle WebDriver exceptions gracefully

            if valid_reviews:
                # Combine all review texts into one string.
                combined_reviews = [" ".join([r["text"] for r in valid_reviews])]
                # Predict rating and obtain XAI outputs (raw and user-friendly).
                xai_results = predict_review_rating_with_explanations(combined_reviews)
                summary = generate_summary(combined_reviews)
                shop["summary"] = summary
                shop["predicted_rating"] = xai_results["predicted_rating"]
                shop["xai_explanations"] = xai_results["explanations"]

                # Cache the shop data after scraping
                cached_shop = CachedShop(
                    name = shop["name"],
                    place_id = shop["place_id"],
                    rating = shop.get("rating", None),  # Use get() in case some fields are missing
                    reviews = valid_reviews,
                    summary = shop.get("summary", "No summary available"),  # Default value for summary
                    predicted_rating = shop.get("predicted_rating", None),
                    xai_explanations = shop.get("xai_explanations", "No explanations available"),
                    address = shop.get("address", "No address available"),  # Default value for address
                    lat = shop.get("lat", None),  # Handle cases where latitude might be missing
                    lng = shop.get("lng", None),  # Handle cases where longitude might be missing
                    cached_at = datetime.utcnow()  # Set the current time as the cache time
                )
                cached_shop.save()  
            else:
                shop["summary"] = "No reviews available."
                shop["predicted_rating"] = 0
                shop["xai_explanations"] = "NO Explanations available."

        return shop
    except Exception as e:
        logger.error(f"Error processing shop {place.get('place_id', 'unknown')}: {e}")
        return None
