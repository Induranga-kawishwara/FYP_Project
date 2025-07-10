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
            f"{base_url}query={product_name}+store&location={lat},{lng}"
            f"&radius={radius}&type=store&key={Config.GOOGLE_API_KEY}"
        )
        if next_page_token:
            url += f"&pagetoken={next_page_token}"
            time.sleep(2)
        resp = get_google_response(url)
        if "results" in resp:
            shops.extend(resp["results"])
        next_page_token = resp.get("next_page_token")
        if not next_page_token:
            break

    return shops


def fetch_place_details(place_id):

    details_url = (
        "https://maps.googleapis.com/maps/api/place/details/json"
        f"?place_id={place_id}"
        f"&fields=name,rating,user_ratings_total,reviews,opening_hours"
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
        distance = calculate_distance(lat, lng, shop_lat, shop_lng)

        if distance <= radius_km:
            try:
                details = fetch_place_details(place_id)
                reviews = details.get("reviews", [])

                # only keep shops with non-empty text reviews
                has_text_review = any(r.get("text", "").strip() for r in reviews)
                if not has_text_review:
                    continue

                # preserve original rating, attach detailed reviews & opening hours
                shop["rating"] = shop["rating"]
                shop["reviews"] = reviews
                shop["opening_hours"] = details.get("opening_hours", {})

                final_shops.append(shop)

            except Exception as e:
                print(f"Error fetching details for shop {place_id}: {e}")
                continue

    # sort by descending rating
    final_shops.sort(key=lambda s: s.get("rating", 0), reverse=True)
    return final_shops
