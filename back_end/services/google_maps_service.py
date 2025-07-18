import time
import requests
from datetime import datetime, date, time as _time
from tenacity import retry, wait_fixed, stop_after_attempt
from config import Config
from utils import calculate_distance, is_open_on

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
            time.sleep(2)
        data = get_google_response(base + qs)
        all_shops.extend(data.get("results", []))
        next_page = data.get("next_page_token")
        if not next_page:
            break

    return all_shops

def fetch_place_details(place_id):

    fields = ["name", "rating", "opening_hours", "formatted_phone_number"]
    url = (
        "https://maps.googleapis.com/maps/api/place/details/json"
        f"?place_id={place_id}"
        f"&fields={','.join(fields)}"
        f"&key={Config.GOOGLE_API_KEY}"
    )
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.json().get("result", {})

def fetch_and_filter_shops_with_text(
    product_name: str,
    lat: float,
    lng: float,
    radius_m: int,
    opening_date: date = None,
    opening_time: _time = None
):

    candidates = fetch_all_shops(product_name, lat, lng, radius_m)
    filtered = []

    for shop in candidates:
        pid = shop.get("place_id")
        if not pid or "rating" not in shop:
            continue

        # distance filter
        s_lat = shop["geometry"]["location"]["lat"]
        s_lng = shop["geometry"]["location"]["lng"]
        if calculate_distance(lat, lng, s_lat, s_lng) * 1000 > radius_m:
            continue

        # if no date/time filter, include basic info only
        if opening_date is None:
            filtered.append(shop)
            continue

        # fetch details for opening_hours & phone
        try:
            details = fetch_place_details(pid)
            oh = details.get("opening_hours", {}) or {}
        except Exception:
            continue  # skip on details-error

        # only include if open on that date/time
        if is_open_on(oh, opening_date, opening_time):
            shop["opening_hours"] = oh
            shop["weekday_text"]  = oh.get("weekday_text", [])
            shop["phone"]         = details.get("formatted_phone_number", "N/A")
            filtered.append(shop)

    # sort by Google rating desc
    filtered.sort(key=lambda s: s.get("rating", 0), reverse=True)
    return filtered
