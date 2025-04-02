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

# Load fake review model (reuse from review_service)
fake_review_tokenizer = BertTokenizer.from_pretrained("models/fakeReviewModel")
fake_review_model = BertForSequenceClassification.from_pretrained("models/fakeReviewModel")
fake_review_model.eval()

# Setup Selenium WebDriver options
options = Options()
options.add_argument("--headless")
options.add_argument("window-size=1920,1080")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (like Gecko) Chrome/91.0.4472.124 Safari/537.36")

def detect_fake_reviews(reviews):
    if not reviews:
        return [], []
    inputs = fake_review_tokenizer(reviews, padding=True, truncation=True, return_tensors="pt", max_length=256)
    with torch.no_grad():
        outputs = fake_review_model(**inputs)
    predictions = torch.argmax(outputs.logits, dim=-1).tolist()
    real_reviews = [reviews[i] for i, label in enumerate(predictions) if label == 0]
    fake_reviews = [reviews[i] for i, label in enumerate(predictions) if label == 1]
    return real_reviews, fake_reviews

def parse_review_date(date_text):
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

def scroll_reviews(driver):
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

def scrape_reviews(place_id, max_reviews):
    driver = webdriver.Chrome(options=options)
    valid_reviews = []
    scraped_texts = set()
    url = f"https://www.google.com/maps/place/?q=place_id:{place_id}"
    driver.get(url)
    try:
        reviews_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button[aria-label*='Reviews for']"))
        )
        reviews_tab.click()
        time.sleep(2)
    except Exception:
        driver.quit()
        return []
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
    return valid_reviews[:max_reviews]
