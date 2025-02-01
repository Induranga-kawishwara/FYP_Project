import time
import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup

# Setup Selenium WebDriver
options = Options()
options.add_argument("--headless")
options.add_argument("window-size=1920,1080")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (like Gecko) Chrome/91.0.4472.124 Safari/537.36")

# Convert Google Review Date Format to Datetime
def parse_review_date(date_text):
    """ Converts Google review date text into a proper datetime object. """
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

# Scroll to Load All Reviews (Stops when 5 consecutive old reviews are found)
def scroll_reviews(driver, three_month_window):
    """ Scrolls dynamically to load more reviews but stops if 5 consecutive old reviews are found. """
    try:
        reviews_container = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div.m6QErb.DxyBCb.kA9KIf.dS8AEf"))
        )
        last_height = driver.execute_script("return arguments[0].scrollHeight;", reviews_container)
        old_review_count = 0  # Track consecutive old reviews

        while True:
            driver.execute_script("arguments[0].scrollTo(0, arguments[0].scrollHeight);", reviews_container)
            time.sleep(2)

            # Check for stop condition
            soup = BeautifulSoup(driver.page_source, "html.parser")
            review_divs = soup.find_all("div", class_="jftiEf")

            for review_div in review_divs:
                date_text = review_div.find('span', class_='rsqaWe').text.strip()
                review_date = parse_review_date(date_text)

                if review_date:
                    if review_date < three_month_window:
                        old_review_count += 1  # Consecutive old review
                        print(f"Old Review Found: {review_date.strftime('%Y-%m-%d')} (Count: {old_review_count}/5)")
                    else:
                        old_review_count = 0  # Reset count when new review is found
                        print(f"Recent Review Found: {review_date.strftime('%Y-%m-%d')}, Resetting Counter.")

                if old_review_count >= 5:
                    print("Stopping scrolling: 5 consecutive old reviews found.")
                    return  # Stop scrolling

            new_height = driver.execute_script("return arguments[0].scrollHeight;", reviews_container)
            if new_height == last_height:
                break  # No more new reviews to load

            last_height = new_height
    except Exception as e:
        print(f"Error while scrolling reviews: {e}")

# Scrape Reviews with 5 Consecutive Old Review Stop Condition
def scrape_reviews(place_id):
    """
    Scrapes Google reviews for a given place ID.
    - Identifies the latest review date.
    - Collects only reviews within 3 months from the latest review.
    - Stops scrolling and scraping if 5 consecutive old reviews appear.
    """

    driver = webdriver.Chrome(options=options)
    reviews = []

    url = f"https://www.google.com/maps/place/?q=place_id:{place_id}"
    driver.get(url)

    try:
        # Click on Reviews Tab
        reviews_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button[aria-label*='Reviews for']"))
        )
        reviews_tab.click()
        time.sleep(2)
    except Exception:
        driver.quit()
        return []

    # find the latest review date
    soup = BeautifulSoup(driver.page_source, "html.parser")
    review_divs = soup.find_all("div", class_="jftiEf")
    
    latest_review_date = None
    for review_div in review_divs:
        date_text = review_div.find('span', class_='rsqaWe').text.strip()
        review_date = parse_review_date(date_text)
        if review_date:
            latest_review_date = review_date
            break  

    if latest_review_date is None:
        print("No valid reviews found.")
        driver.quit()
        return []

    # ✅ Define the **EXACT** 3-month review window
    three_month_window = latest_review_date - datetime.timedelta(days=90) 
    print(f"✅ Latest review: {latest_review_date.strftime('%Y-%m-%d')} | Collecting reviews from {three_month_window.strftime('%Y-%m-%d')} onwards")

    # Scroll while checking review dates
    scroll_reviews(driver, three_month_window)

    # Parse reviews after scrolling
    soup = BeautifulSoup(driver.page_source, "html.parser")
    review_divs = soup.find_all("div", class_="jftiEf")

    old_review_count = 0  # Track consecutive old reviews
    for review_div in review_divs:
        try:
            author = review_div.find('div', class_='d4r55').text.strip()
            date_text = review_div.find('span', class_='rsqaWe').text.strip()
            review_date = parse_review_date(date_text)

            if review_date:
                if review_date >= three_month_window:
                    text = review_div.find('span', class_='wiI7pd').text.strip()
                    reviews.append({
                        "author": author,
                        "date": review_date.strftime("%Y-%m-%d"),
                        "text": text
                    })
                    old_review_count = 0  # Reset old review counter
                    print(f"Collecting Review: {review_date.strftime('%Y-%m-%d')}")
                else:
                    old_review_count += 1
                    print(f"Old Review Ignored: {review_date.strftime('%Y-%m-%d')} (Count: {old_review_count}/5)")

                # Stop Scraping if 5 Old Reviews Are Collected Consecutively
                if old_review_count >= 5:
                    print("Stopping scraping: 5 consecutive older reviews found.")
                    break
        except Exception:
            continue

    driver.quit()

    return reviews  # Return only reviews within the 3-month window
