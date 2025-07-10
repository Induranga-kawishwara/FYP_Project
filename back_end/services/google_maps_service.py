import time
import requests
from utils import calculate_distance
from tenacity import retry, wait_fixed, stop_after_attempt
from config import Config


@retry(wait=wait_fixed(2), stop=stop_after_attempt(3))
def get_google_response(url):
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.json()


def fetch_all_shops(product_name, lat, lng, radius):

    base = "https://maps.googleapis.com/maps/api/place/textsearch/json?"
    all_shops = []
    next_page = None

    while True:
        qs = (
            f"query={product_name}+store"
            f"&location={lat},{lng}"
            f"&radius={radius}"
            f"&type=store"
            f"&key={Config.GOOGLE_API_KEY}"
        )
        if next_page:
            qs += f"&pagetoken={next_page}"
            time.sleep(2)  # allow next_page_token to become valid

        data = get_google_response(base + qs)
        all_shops.extend(data.get("results", []))
        next_page = data.get("next_page_token")
        if not next_page:
            break

    return all_shops


def fetch_place_details(place_id):

    fields = [
        "name",
        "rating",
        "user_ratings_total",
        "reviews",
        "opening_hours",
        "formatted_phone_number",
        "international_phone_number",
    ]
    url = (
        "https://maps.googleapis.com/maps/api/place/details/json"
        f"?place_id={place_id}"
        f"&fields={','.join(fields)}"
        f"&key={Config.GOOGLE_API_KEY}"
    )
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.json().get("result", {})


def fetch_and_filter_shops_with_text(product_name, lat, lng, radius_km):

    candidates = fetch_all_shops(product_name, lat, lng, radius_km)
    final = []

    for shop in candidates:
        pid = shop.get("place_id")
        if not pid or "rating" not in shop:
            continue

        s_lat = shop["geometry"]["location"]["lat"]
        s_lng = shop["geometry"]["location"]["lng"]
        if calculate_distance(lat, lng, s_lat, s_lng) > radius_km:
            continue

        try:
            details = fetch_place_details(pid)
            reviews = details.get("reviews", [])
            # require at least one non-empty text review
            if not any(r.get("text", "").strip() for r in reviews):
                continue

            # preserve rating & attach extras
            shop["reviews"] = reviews

            # **FULL** opening_hours dict
            opening = details.get("opening_hours", {}) or {}
            shop["opening_hours"] = opening

            # for convenience, also top-level weekday_text
            shop["weekday_text"] = opening.get("weekday_text", [])

            # phone numbers
            shop["phone"]                     = details.get("formatted_phone_number")
            shop["international_phone_number"] = details.get("international_phone_number")

            final.append(shop)

        except Exception as e:
            print(f"Error fetching details for {pid}: {e}")
            continue

    # sort by rating descending
    final.sort(key=lambda s: s.get("rating", 0), reverse=True)
    return final
