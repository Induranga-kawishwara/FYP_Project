import time
import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from transformers import BertTokenizer, BertForSequenceClassification
import torch

# Load the BERT tokenizer and model from your fake review model directory
fake_review_tokenizer = BertTokenizer.from_pretrained("models/fakeReviewModel")
fake_review_model = BertForSequenceClassification.from_pretrained("models/fakeReviewModel")
fake_review_model.eval()  # set to evaluation mode

# Setup Selenium WebDriver
options = Options()
options.add_argument("--headless")
options.add_argument("window-size=1920,1080")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (like Gecko) Chrome/91.0.4472.124 Safari/537.36")


def detect_fake_reviews(reviews):
    """
    Given a list of review texts, returns two lists:
      - real_reviews: reviews predicted as real (label 0)
      - fake_reviews: reviews predicted as fake (label 1)
    """
    if not reviews:
        return [], []
    
    # Tokenize reviews
    inputs = fake_review_tokenizer(reviews, padding=True, truncation=True, return_tensors="pt", max_length=256)
    
    with torch.no_grad():
        outputs = fake_review_model(**inputs)
    
    # Get the predicted label for each review (assuming 0: real, 1: fake)
    predictions = torch.argmax(outputs.logits, dim=-1).tolist()
    
    real_reviews = [reviews[i] for i, label in enumerate(predictions) if label == 0]
    fake_reviews = [reviews[i] for i, label in enumerate(predictions) if label == 1]
    
    return real_reviews, fake_reviews

# Convert Google Review Date Format to Datetime
def parse_review_date(date_text):
    """Converts Google review date text into a proper datetime object."""
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
    """Scrolls dynamically to load more reviews but stops if 5 consecutive old reviews are found."""
    try:
        reviews_container = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div.m6QErb.DxyBCb.kA9KIf.dS8AEf"))
        )
        last_height = driver.execute_script("return arguments[0].scrollHeight;", reviews_container)
        old_review_count = 0  # Track consecutive old reviews

        while True:
            driver.execute_script("arguments[0].scrollTo(0, arguments[0].scrollHeight);", reviews_container)
            time.sleep(2)

            soup = BeautifulSoup(driver.page_source, "html.parser")
            review_divs = soup.find_all("div", class_="jftiEf")

            for review_div in review_divs:
                date_text = review_div.find('span', class_='rsqaWe').text.strip()
                review_date = parse_review_date(date_text)

                if review_date:
                    if review_date < three_month_window:
                        old_review_count += 1
                        print(f"Old Review Found: {review_date.strftime('%Y-%m-%d')} (Count: {old_review_count}/5)")
                    else:
                        old_review_count = 0
                        print(f"Recent Review Found: {review_date.strftime('%Y-%m-%d')}, Resetting Counter.")

                if old_review_count >= 5:
                    print("Stopping scrolling: 5 consecutive old reviews found.")
                    return

            new_height = driver.execute_script("return arguments[0].scrollHeight;", reviews_container)
            if new_height == last_height:
                break

            last_height = new_height
    except Exception as e:
        print(f"Error while scrolling reviews: {e}")

# Scrape Reviews with Stop Condition Based on Old Reviews
def scrape_reviews(place_id, max_reviews):
    """
    Scrapes reviews for a given place ID until at least max_reviews valid reviews are collected.
    Valid reviews are determined by the fake review detection model.
    """
    driver = webdriver.Chrome(options=options)
    valid_reviews = []
    scraped_texts = set()  # To avoid duplicates

    url = f"https://www.google.com/maps/place/?q=place_id:{place_id}"
    driver.get(url)

    try:
        # Click the Reviews Tab
        reviews_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button[aria-label*='Reviews for']"))
        )
        reviews_tab.click()
        time.sleep(2)
    except Exception:
        driver.quit()
        return []

    # Continuously scroll until enough valid reviews are collected
    while len(valid_reviews) < max_reviews:
        try:
            reviews_container = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.m6QErb.DxyBCb.kA9KIf.dS8AEf"))
            )
        except Exception as e:
            print("Could not locate reviews container:", e)
            break

        driver.execute_script("arguments[0].scrollTo(0, arguments[0].scrollHeight);", reviews_container)
        time.sleep(2)
        soup = BeautifulSoup(driver.page_source, "html.parser")
        review_divs = soup.find_all("div", class_="jftiEf")

        new_reviews = []
        for review_div in review_divs:
            try:
                author = review_div.find("div", class_="d4r55").text.strip()
                text = review_div.find("span", class_="wiI7pd").text.strip()
                if text in scraped_texts:
                    continue
                scraped_texts.add(text)
                new_reviews.append({"author": author, "text": text})
            except Exception:
                continue

        if new_reviews:
            # Run fake review detection on the new batch of reviews
            review_texts = [r["text"] for r in new_reviews]
            real_reviews, _ = detect_fake_reviews(review_texts)
            for review_obj in new_reviews:
                if review_obj["text"] in real_reviews:
                    valid_reviews.append(review_obj)
                    if len(valid_reviews) >= max_reviews:
                        break

        if not new_reviews:
            break

    driver.quit()
    print("Valid Reviews:")
    for review in valid_reviews[:max_reviews]:
        print(f"Author: {review['author']}")
        print(f"Review: {review['text']}\n")
        
    return valid_reviews[:max_reviews]
