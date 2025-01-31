import json
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from bs4 import BeautifulSoup

# ✅ Setup Selenium WebDriver
options = Options()
options.add_argument("--headless")
options.add_argument("window-size=1920,1080")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")




def get_places(driver, lat, lng, radius_km, category, subcategory):
    places = []
    search_query = f'{subcategory} {category}'
    url = f'https://www.google.com/maps/search/{search_query}/@{lat},{lng},{radius_km}z'
    
    driver.get(url)
    time.sleep(2)  # Allow time for page to load

    page_content = driver.page_source
    soup = BeautifulSoup(page_content, "html.parser")
    data_elements = soup.find_all("div", class_="Nv2PK")
    
    for element in data_elements[:10]:
        try:
            name = element.select_one('.qBF1Pd').text.strip() if element.select_one('.qBF1Pd') else ''
            rating = element.select_one('.MW4etd').text.strip() if element.select_one('.MW4etd') else ''
            link = element.select_one('a').get('href') if element.select_one('a') else ''

            places.append({
                'name': name,
                'address': '',
                'phone_number': '',
                'rating': rating,
                'link': link,
                'reviews': []  # Placeholder for reviews
            })
        except Exception:
            continue
    
    return places

def scroll_reviews(driver):
    """ Scrolls down in the reviews section until no new reviews load. """
    try:
        # Locate the reviews container
        reviews_container = driver.find_element(By.CSS_SELECTOR, "div.m6QErb.DxyBCb.kA9KIf.dS8AEf")
        
        # Get the initial scroll height
        last_height = driver.execute_script("return arguments[0].scrollHeight;", reviews_container)
        
        while True:
            # Scroll down
            driver.execute_script("arguments[0].scrollTo(0, arguments[0].scrollHeight);", reviews_container)
            time.sleep(2)  # Allow time for new reviews to load
            
            # Get the new scroll height after scrolling
            new_height = driver.execute_script("return arguments[0].scrollHeight;", reviews_container)
            
            # If new_height is the same as last_height, stop scrolling
            if new_height == last_height:
                print("No more reviews to load.")
                break
            
            last_height = new_height  # Update last height for next comparison
    except Exception as e:
        print(f"Error while scrolling reviews: {e}")

def get_reviews(driver, place):
    reviews = []
    driver.get(place['link'])
    time.sleep(3)  # Allow time for page to load

    # Click on the "Reviews" tab
    try:
        reviews_tab_button = driver.find_element(By.CSS_SELECTOR, "button[aria-label*='Reviews for']")
        reviews_tab_button.click()
        time.sleep(2)
    except Exception:
        return place  # Return if reviews tab is not found

    # Scroll inside the reviews section until no more reviews load
    scroll_reviews(driver)

    # Scrape reviews
    page_content = driver.page_source
    soup = BeautifulSoup(page_content, "html.parser")
    review_divs = soup.find_all("div", class_="jftiEf")

    for review_div in review_divs:
        try:
            author = review_div.find('div', class_='d4r55').text.strip()
            date = review_div.find('span', class_='rsqaWe').text.strip()
            text = review_div.find('span', class_='wiI7pd').text.strip()

            reviews.append({
                'author': author,
                'date': date,
                'text': text
            })
        except Exception:
            continue

    place["reviews"] = reviews
    return place

if __name__ == "__main__":
    latitude = 30.7046
    longitude = 76.7179
    radius_km = 10
    category = 'Restaurant'
    subcategory = 'Vegetarian'

    driver = webdriver.Chrome(options=options)

    places = get_places(driver, latitude, longitude, radius_km, category, subcategory)

    for i, place in enumerate(places):
        places[i] = get_reviews(driver, place)

    driver.quit()

    output_file = "google_places_reviews.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(places, f, indent=4, ensure_ascii=False)

    print(f"🎉 Reviews saved successfully in '{output_file}'!")
