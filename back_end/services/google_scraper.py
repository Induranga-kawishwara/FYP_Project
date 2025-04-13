import time
import datetime
import tempfile
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from transformers import BertTokenizer, BertForSequenceClassification
import torch
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# Download NLTK resources if not already downloaded
nltk.download("stopwords")
nltk.download("wordnet")
nltk.download("omw-1.4")

# --- Initialize Models and Tools ---
fake_review_tokenizer = BertTokenizer.from_pretrained("models/fakeReviewModel")
fake_review_model = BertForSequenceClassification.from_pretrained("models/fakeReviewModel")
fake_review_model.eval()

lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words("english"))

# --- Setup Selenium WebDriver Options ---
options = Options()
options.add_argument("--headless")  # Run headless for background scraping
options.add_argument("window-size=1920,1080")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument(
    "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/91.0.4472.124 Safari/537.36"
)
options.add_experimental_option('excludeSwitches', ['enable-logging'])

# --- Helper: Parse Relative Date ---
def parse_relative_date(date_str):
    now = datetime.datetime.now()
    date_str = date_str.strip().lower()
    if "today" in date_str:
        return now
    elif "yesterday" in date_str:
        return now - datetime.timedelta(days=1)
    else:
        try:
            parts = date_str.split()
            if len(parts) >= 2:
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

# --- Detect Fake Reviews Using Model ---
def detect_fake_reviews(reviews):
    if not reviews:
        return [], []
    real_reviews = []
    fake_reviews = []
    for review in reviews:
        inputs = fake_review_tokenizer(
            review,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
            max_length=256
        )
        with torch.no_grad():
            outputs = fake_review_model(**inputs)
        prediction = torch.argmax(outputs.logits, dim=-1).item()
        if prediction == 0:
            real_reviews.append(review)
        else:
            fake_reviews.append(review)
    print(f"Detected {len(real_reviews)} real reviews and {len(fake_reviews)} fake reviews.")
    return real_reviews, fake_reviews

# --- Preprocess Reviews ---
def preprocess_review(review):
    words = review.split()
    cleaned_words = [
        lemmatizer.lemmatize(word.lower())
        for word in words
        if word.lower() not in stop_words
    ]
    return " ".join(cleaned_words)

# --- Expand Review if "More" Button Exists ---
def expand_review(driver, review_element):
    try:
        more_button = review_element.find_element(By.XPATH, ".//button[@aria-label='See more']")
        if more_button:
            driver.execute_script("arguments[0].click();", more_button)
            time.sleep(1)
    except Exception:
        pass

# --- Scroll Reviews Container ---
def scroll_reviews(driver):
    try:
        reviews_container = driver.find_element(By.CSS_SELECTOR, "div.m6QErb.DxyBCb.kA9KIf.dS8AEf")
        driver.execute_script("arguments[0].scrollTo(0, arguments[0].scrollHeight);", reviews_container)
        time.sleep(2)
    except Exception as e:
        print(f"Error while scrolling reviews: {e}")

# --- Context Manager for WebDriver ---
class ChromeDriver:
    def __init__(self, options):
        self.options = options
        self.driver = None

    def __enter__(self):
        self.driver = webdriver.Chrome(ChromeDriverManager().install(), options=self.options)
        return self.driver

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.driver:
            self.driver.quit()

# --- Scrape Reviews with Retry Logic ---
def scrape_reviews(place_id, max_reviews):
    valid_reviews = {}  # { author: review_dict }
    scraped_texts = set()

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
            print(f"Error finding reviews tab: {e}")
            return []

        scroll_attempts = 0

        while len(valid_reviews) < max_reviews:
            try:
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "div.m6QErb.DxyBCb.kA9KIf.dS8AEf"))
                )
            except Exception as e:
                print(f"Could not locate reviews container: {e}")
                break

            review_elements = driver.find_elements(By.CSS_SELECTOR, "div.jftiEf")
            new_reviews = []

            for review_element in review_elements:
                try:
                    expand_review(driver, review_element)
                    author_element = review_element.find_element(By.CSS_SELECTOR, "div.d4r55")
                    author = author_element.text.strip() if author_element else "N/A"

                    text_element = review_element.find_element(By.CSS_SELECTOR, "span.wiI7pd")
                    text = text_element.text.strip() if text_element else ""
                    
                    date_element = review_element.find_element(By.CSS_SELECTOR, "span.rsqaWe")
                    date_text = date_element.text.strip() if date_element else ""
                    review_date = parse_relative_date(date_text)

                    if not text or text in scraped_texts:
                        continue

                    scraped_texts.add(text)
                    new_reviews.append({
                        "author": author,
                        "text": text,
                        "date": review_date,
                        "processed_text": preprocess_review(text)
                    })
                except Exception:
                    continue

            if new_reviews:
                review_texts = [r["processed_text"] for r in new_reviews]
                real_texts, _ = detect_fake_reviews(review_texts)

                for review_obj in new_reviews:
                    if review_obj["processed_text"] in real_texts:
                        author = review_obj["author"]
                        if author in valid_reviews:
                            if review_obj["date"] > valid_reviews[author]["date"]:
                                valid_reviews[author] = review_obj
                        else:
                            valid_reviews[author] = review_obj
                        if len(valid_reviews) >= max_reviews:
                            break

            if len(valid_reviews) >= max_reviews:
                break

            prev_count = len(review_elements)
            scroll_reviews(driver)
            time.sleep(2)
            curr_count = len(driver.find_elements(By.CSS_SELECTOR, "div.jftiEf"))
            if curr_count == prev_count:
                scroll_attempts += 1
                if scroll_attempts >= 3:
                    print("No more reviews to load.")
                    break
            else:
                scroll_attempts = 0
    return sorted(valid_reviews.values(), key=lambda r: r["date"], reverse=True)[:max_reviews]
