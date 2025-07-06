import time
import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# NLTK Resources
nltk.download("stopwords")
nltk.download("wordnet")
nltk.download("omw-1.4")

# Load DistilBERT-based AI Review Detection Model
tokenizer = AutoTokenizer.from_pretrained("models/aiReviewModel")
model = AutoModelForSequenceClassification.from_pretrained("models/aiReviewModel")
model.eval()

lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words("english"))

# WebDriver options
options = Options()
options.add_argument("--headless")
options.add_argument("window-size=1920,1080")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
options.add_argument("--disable-images")
options.add_argument("--disable-extensions")
options.add_experimental_option('excludeSwitches', ['enable-logging'])

# Relative date parser
def parse_relative_date(date_str):
    now = datetime.datetime.now()
    date_str = date_str.strip().lower()
    try:
        date_str = date_str.replace("edited", "").replace("ago", "").strip()
        parts = date_str.split()
        if not parts:
            return now

        if "today" in date_str:
            return now
        elif "yesterday" in date_str:
            return now - datetime.timedelta(days=1)
        elif len(parts) >= 2:
            num = 1 if parts[0] in ["a", "an"] else int(parts[0])
            if "year" in date_str:
                return now - datetime.timedelta(days=num * 365)
            elif "month" in date_str:
                return now - datetime.timedelta(days=num * 30)
            elif "week" in date_str:
                return now - datetime.timedelta(days=num * 7)
            elif "day" in date_str:
                return now - datetime.timedelta(days=num)
    except Exception as e:
        print(f"Error parsing date '{date_str}': {e}")
    return now


# Detect fake reviews
def detect_fake_reviews(reviews):
    real_reviews, fake_reviews = [], []
    for review in reviews:
        inputs = tokenizer(review, padding="max_length", truncation=True, return_tensors="pt", max_length=256)
        with torch.no_grad():
            outputs = model(**inputs)
        prediction = torch.argmax(outputs.logits, dim=-1).item()
        (real_reviews if prediction == 0 else fake_reviews).append(review)
    print(f"Detected {len(real_reviews)} real and {len(fake_reviews)} Ai reviews.")
    return real_reviews, fake_reviews

# Preprocess text
def preprocess_review(review):
    words = review.split()
    cleaned = [lemmatizer.lemmatize(word.lower()) for word in words if word.lower() not in stop_words]
    return " ".join(cleaned)

# Expand review
def expand_review(driver, el):
    try:
        more_btn = el.find_element(By.XPATH, ".//button[@aria-label='See more']")
        if more_btn:
            driver.execute_script("arguments[0].click();", more_btn)
            time.sleep(1)
    except Exception:
        pass

# Scroll container
def scroll_reviews(driver):
    try:
        container = driver.find_element(By.CSS_SELECTOR, "div.m6QErb.DxyBCb.kA9KIf.dS8AEf")
        driver.execute_script("arguments[0].scrollTo(0, arguments[0].scrollHeight);", container)
        time.sleep(2)
    except Exception as e:
        print(f"Scroll error: {e}")

# WebDriver context manager
class ChromeDriver:
    def __init__(self, options):
        self.options = options
        self.driver = None

    def __enter__(self):
        self.driver = webdriver.Chrome(ChromeDriverManager().install(), options=self.options)
        return self.driver

    def __exit__(self, exc_type, exc_val, exc_tb):
        try:
            if self.driver:
                self.driver.quit()
        except Exception as e:
            print(f"Error quitting ChromeDriver: {e}")

# Main review scraping function
def scrape_reviews(place_id, max_reviews):
    valid_reviews = {}
    seen_texts = set()
    url = f"https://www.google.com/maps/place/?q=place_id:{place_id}"

    with ChromeDriver(options) as driver:
        driver.get(url)
        try:
            reviews_tab = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "button[aria-label*='Reviews for']"))
            )
            reviews_tab.click()
            time.sleep(2)
        except Exception as e:
            print(f"Cannot open reviews tab: {e}")
            return []

        scroll_attempts = 0

        while len(valid_reviews) < max_reviews:
            try:
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "div.m6QErb.DxyBCb.kA9KIf.dS8AEf"))
                )
            except:
                break

            review_elements = driver.find_elements(By.CSS_SELECTOR, "div.jftiEf")
            new_reviews = []

            for el in review_elements:
                try:
                    expand_review(driver, el)
                    author = el.find_element(By.CSS_SELECTOR, "div.d4r55").text.strip()
                    text = el.find_element(By.CSS_SELECTOR, "span.wiI7pd").text.strip()
                    date_str = el.find_element(By.CSS_SELECTOR, "span.rsqaWe").text.strip()
                    review_date = parse_relative_date(date_str)

                    if not text or text in seen_texts:
                        continue

                    seen_texts.add(text)
                    new_reviews.append({
                        "author": author,
                        "text": text,
                        "date": review_date,
                        "processed_text": preprocess_review(text)
                    })
                except:
                    continue

            if new_reviews:
                processed = [r["processed_text"] for r in new_reviews]
                real_texts, _ = detect_fake_reviews(processed)

                for r in new_reviews:
                    if r["processed_text"] in real_texts:
                        author = r["author"]
                        if author not in valid_reviews or r["date"] > valid_reviews[author]["date"]:
                            valid_reviews[author] = r
                        if len(valid_reviews) >= max_reviews:
                            break

            prev_count = len(review_elements)
            scroll_reviews(driver)
            curr_count = len(driver.find_elements(By.CSS_SELECTOR, "div.jftiEf"))
            if curr_count == prev_count:
                scroll_attempts += 1
                if scroll_attempts >= 3:
                    print("No more reviews.")
                    break
            else:
                scroll_attempts = 0

    return sorted(valid_reviews.values(), key=lambda r: r["date"], reverse=True)[:max_reviews]
