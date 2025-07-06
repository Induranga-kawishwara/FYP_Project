import time
import requests
from utils import calculate_distance
from tenacity import retry, wait_fixed, stop_after_attempt
from config import Config  


@retry(wait=wait_fixed(2), stop=stop_after_attempt(3))
def get_google_response(url):
    response = requests.get(url, timeout=300)
    response.raise_for_status()
    return response.json()


def fetch_all_shops(product_name, lat, lng, radius):
 
    base_url = "https://maps.googleapis.com/maps/api/place/textsearch/json?"
    shops = []
    next_page_token = None

    while True:
        url = (
            f"{base_url}query={product_name} store near me&location={lat},{lng}"
            f"&radius={radius}&type=store&key={Config.GOOGLE_API_KEY}"
        )
        if next_page_token:
            url += f"&pagetoken={next_page_token}"
            time.sleep(2)  # Delay to prevent hitting API rate limits
        response = get_google_response(url)
        if "results" in response:
            shops.extend(response["results"])
        else:
            break
        next_page_token = response.get("next_page_token")
        if not next_page_token:
            break
    return shops



def fetch_place_details(place_id):

    details_url = (
        "https://maps.googleapis.com/maps/api/place/details/json"
        f"?place_id={place_id}"
        f"&fields=name,rating,user_ratings_total,reviews"
        f"&key={Config.GOOGLE_API_KEY}"
    )
    resp = requests.get(details_url, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return data.get("result", {})


def fetch_and_filter_shops_with_text(product_name, lat, lng, radius_km):

    candidate_shops = fetch_all_shops(product_name, lat, lng, radius_km)
    final_shops = []

    for shop in candidate_shops:
        if "place_id" not in shop or "rating" not in shop:
            continue

        place_id = shop["place_id"]
        shop_lat = shop["geometry"]["location"]["lat"]
        shop_lng = shop["geometry"]["location"]["lng"]
        
        # Calculate the distance from the center point to the shop
        distance = calculate_distance(lat, lng, shop_lat, shop_lng)
        
        # If the distance is within the radius, include the shop
        if distance <= radius_km:
            try:
                # Fetch detailed info (and reviews) for this shop
                details = fetch_place_details(place_id)
                reviews = details.get("reviews", [])
                has_text_review = any(review.get("text", "").strip() for review in reviews)

                # Only keep the shop if there is at least one review with non-empty text
                if has_text_review:
                    shop["rating"] = shop["rating"]  # Preserve the rating for sorting
                    shop["reviews"] = reviews  # Optionally store detailed reviews
                    final_shops.append(shop)
            except Exception as e:
                print(f"Error fetching details for shop {place_id}: {e}")
                continue

    # Sort the filtered shops by rating 
    final_shops.sort(key=lambda s: s.get("rating", 0), reverse=True)
    return final_shops