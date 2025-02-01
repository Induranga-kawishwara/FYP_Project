import time
import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup

# Setup Selenium WebDriver
options = Options()
options.add_argument("--headless")
options.add_argument("window-size=1920,1080")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

# Convert Google Review Date Format to Datetime
def parse_review_date(date_text):
    """
    Converts Google review date text into a proper datetime object.
    """
    current_date = datetime.datetime.now()

    if "a day ago" in date_text:
        return current_date - datetime.timedelta(days=1)
    elif "a week ago" in date_text:
        return current_date - datetime.timedelta(weeks=1)
    elif "a month ago" in date_text:
        return current_date - datetime.timedelta(days=30)

    parts = date_text.split()
    if len(parts) == 3:
        try:
            num = int(parts[0])
            unit = parts[1]

            if "day" in unit:
                return current_date - datetime.timedelta(days=num)
            elif "week" in unit:
                return current_date - datetime.timedelta(weeks=num)
            elif "month" in unit:
                return current_date - datetime.timedelta(days=num * 30)
            elif "year" in unit:
                return current_date - datetime.timedelta(days=num * 365)
        except ValueError:
            return None

    return None

# Scroll to Load All Reviews
def scroll_reviews(driver):
    """Scrolls through all available reviews."""
    try:
        reviews_container = driver.find_element(By.CSS_SELECTOR, "div.m6QErb.DxyBCb.kA9KIf.dS8AEf")
        last_height = driver.execute_script("return arguments[0].scrollHeight;", reviews_container)

        while True:
            driver.execute_script("arguments[0].scrollTo(0, arguments[0].scrollHeight);", reviews_container)
            time.sleep(2)

            new_height = driver.execute_script("return arguments[0].scrollHeight;", reviews_container)
            if new_height == last_height:
                break

            last_height = new_height
    except Exception as e:
        print(f"Error while scrolling reviews: {e}")

# Scrape Reviews for a Specific Shop
def scrape_reviews(place_id):
    driver = webdriver.Chrome(options=options)
    reviews = []
    three_months_ago = datetime.datetime.now() - datetime.timedelta(days=90)

    url = f"https://www.google.com/maps/place/?q=place_id:{place_id}"
    driver.get(url)
    time.sleep(3)

    try:
        reviews_tab = driver.find_element(By.CSS_SELECTOR, "button[aria-label*='Reviews for']")
        reviews_tab.click()
        time.sleep(2)
    except Exception:
        driver.quit()
        return []

    scroll_reviews(driver)

    soup = BeautifulSoup(driver.page_source, "html.parser")
    review_divs = soup.find_all("div", class_="jftiEf")

    for review_div in review_divs:
        try:
            author = review_div.find('div', class_='d4r55').text.strip()
            date_text = review_div.find('span', class_='rsqaWe').text.strip()
            review_date = parse_review_date(date_text)

            if review_date and review_date >= three_months_ago:
                text = review_div.find('span', class_='wiI7pd').text.strip()
                reviews.append({
                    "author": author,
                    "date": review_date.strftime("%Y-%m-%d"),
                    "text": text
                })
        except Exception:
            continue
    print(reviews)
    driver.quit()
    return reviews  # Return reviews
