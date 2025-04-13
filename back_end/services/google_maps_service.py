import time
import requests
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
            time.sleep(2)  # Adding a delay between requests to avoid hitting API rate limits
        response = get_google_response(url)
        if "results" in response:
            shops.extend(response["results"])
        else:
            break
        next_page_token = response.get("next_page_token")
        if not next_page_token:
            break
    # return shops[:2]
    return shops