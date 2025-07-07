import time
import datetime
import hashlib
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
options.add_argument("--disable-gpu")
options.add_argument("window-size=1920,1080")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
options.add_argument("--disable-images")
options.add_argument("--disable-extensions")
options.add_experimental_option('excludeSwitches', ['enable-logging'])

# Relative date parser
def parse_relative_date(date_str):
    now = datetime.datetime.now()
    s = date_str.strip().lower().replace("edited", "").replace("ago", "").strip()
    parts = s.split()
    try:
        if "today" in s:
            return now
        if "yesterday" in s:
            return now - datetime.timedelta(days=1)
        if len(parts) >= 2:
            num = 1 if parts[0] in ("a", "an") else int(parts[0])
            unit = parts[1]
            if "year" in unit:
                return now - datetime.timedelta(days=365 * num)
            if "month" in unit:
                return now - datetime.timedelta(days=30 * num)
            if "week" in unit:
                return now - datetime.timedelta(days=7 * num)
            if "day" in unit:
                return now - datetime.timedelta(days=num)
    except:
        pass
    return now

# Batched fake review detector
def detect_fake_reviews(reviews):
    if not reviews:
        return [], []
    inputs = tokenizer(reviews, padding=True, truncation=True, return_tensors="pt", max_length=256)
    with torch.no_grad():
        logits = model(**inputs).logits
    preds = torch.argmax(logits, dim=-1).tolist()
    real = [r for r, p in zip(reviews, preds) if p == 0]
    fake = [r for r, p in zip(reviews, preds) if p == 1]
    return real, fake

# Preprocess text
def preprocess_review(text):
    tokens = text.split()
    return " ".join(lemmatizer.lemmatize(w.lower()) for w in tokens if w.lower() not in stop_words)

# Expand “See more”
def expand_review(driver, el):
    try:
        btn = el.find_element(By.XPATH, ".//button[@aria-label='See more']")
        driver.execute_script("arguments[0].click();", btn)
        time.sleep(0.3)
    except:
        pass

# Scroll reviews container
def scroll_reviews(driver):
    try:
        container = driver.find_element(By.CSS_SELECTOR, "div.m6QErb.DxyBCb.kA9KIf.dS8AEf")
        driver.execute_script("arguments[0].scrollTo(0, arguments[0].scrollHeight);", container)
        time.sleep(1)
    except:
        pass

# ChromeDriver context
class ChromeDriver:
    def __init__(self, options):
        self.options = options
        self.driver = None

    def __enter__(self):
        self.driver = webdriver.Chrome(ChromeDriverManager().install(), options=self.options)
        return self.driver

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass

# Fetch up to max_reviews real reviews
def fetch_real_reviews(place_id, max_reviews=50):
    real_reviews = []
    seen_hashes = set()
    url = f"https://www.google.com/maps/place/?q=place_id:{place_id}"

    with ChromeDriver(options) as driver:
        driver.get(url)
        try:
            tab = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "button[aria-label*='Reviews for']"))
            )
            tab.click()
            time.sleep(0.5)
        except:
            return []

        scroll_fails = 0

        while len(real_reviews) < max_reviews and scroll_fails < 5:
            elements = driver.find_elements(By.CSS_SELECTOR, "div.jftiEf")
            before = len(elements)

            batch = []
            for el in elements:
                try:
                    expand_review(driver, el)
                    author = el.find_element(By.CSS_SELECTOR, "div.d4r55").text.strip()
                    text = el.find_element(By.CSS_SELECTOR, "span.wiI7pd").text.strip()
                    date_s = el.find_element(By.CSS_SELECTOR, "span.rsqaWe").text.strip()
                    dt = parse_relative_date(date_s)

                    proc = preprocess_review(text)
                    hash_key = hashlib.md5((text + author).encode()).hexdigest()
                    if not proc or hash_key in seen_hashes:
                        continue
                    seen_hashes.add(hash_key)

                    batch.append({
                        "author": author,
                        "text": text,
                        "date": dt,
                        "processed_text": proc
                    })
                except:
                    continue

            # Detect and filter fakes
            if batch:
                processed_texts = [r["processed_text"] for r in batch]
                real_texts, _ = detect_fake_reviews(processed_texts)
                filtered = [r for r in batch if r["processed_text"] in real_texts]
                real_reviews.extend(filtered)

            after = len(driver.find_elements(By.CSS_SELECTOR, "div.jftiEf"))
            if after == before:
                scroll_fails += 1
            else:
                scroll_fails = 0

            scroll_reviews(driver)

        real_reviews.sort(key=lambda r: r["date"], reverse=True)
        return real_reviews[:max_reviews]
