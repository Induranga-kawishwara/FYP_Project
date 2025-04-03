import time
import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from transformers import BertTokenizer, BertForSequenceClassification
import torch
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# Download NLTK resources (if not already downloaded)
nltk.download("stopwords")
nltk.download("wordnet")
nltk.download("omw-1.4")

# --- Initialize Models and Tools ---
# Load fake review model (make sure the model path is correct)
fake_review_tokenizer = BertTokenizer.from_pretrained("models/fakeReviewModel")
fake_review_model = BertForSequenceClassification.from_pretrained("models/fakeReviewModel")
fake_review_model.eval()

# Initialize lemmatizer and stopwords
lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words("english"))

# Setup Selenium WebDriver options
options = Options()
options.add_argument("--headless")
options.add_argument("window-size=1920,1080")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                     "AppleWebKit/537.36 (KHTML, like Gecko) "
                     "Chrome/91.0.4472.124 Safari/537.36")

# --- Helper: Parse relative date strings into a datetime object ---
def parse_relative_date(date_str):
    """
    Parse relative dates from Google reviews into a datetime object.
    Examples of date_str:
      - "Today"
      - "Yesterday"
      - "10 months ago"
      - "2 weeks ago"
      - "3 days ago"
    """
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
                num = 1
                # For strings like "a week ago"
                if parts[0] in ["a", "an"]:
                    num = 1
                else:
                    num = int(parts[0])
                    
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
    # Fallback: return current time if parsing fails
    return now

# --- Detect Fake Reviews using the trained model ---
def detect_fake_reviews(reviews):
    """
    Given a list of review texts, returns two lists:
    real_reviews and fake_reviews based on model predictions.
    """
    if not reviews:
        return [], []
    inputs = fake_review_tokenizer(reviews, padding=True, truncation=True, return_tensors="pt", max_length=256)
    with torch.no_grad():
        outputs = fake_review_model(**inputs)
    predictions = torch.argmax(outputs.logits, dim=-1).tolist()
    # Assuming label 0 means real and 1 means fake
    real_reviews = [reviews[i] for i, label in enumerate(predictions) if label == 0]
    fake_reviews = [reviews[i] for i, label in enumerate(predictions) if label == 1]
    return real_reviews, fake_reviews

# --- Preprocess Reviews (Remove stopwords and Lemmatize) ---
def preprocess_reviews(reviews):
    processed_reviews = []
    for review in reviews:
        words = review.split()
        cleaned_words = []
        for word in words:
            if word.lower() not in stop_words:  # Remove stopwords
                cleaned_word = lemmatizer.lemmatize(word.lower())
                cleaned_words.append(cleaned_word)
        processed_reviews.append(" ".join(cleaned_words))
    return processed_reviews

# --- Expand the review if a "More" button exists ---
def expand_review(driver, review_element):
    try:
        # Locate the "More" button inside this review element
        more_button = review_element.find_element(By.XPATH, ".//button[@aria-label='See more']")
        if more_button:
            driver.execute_script("arguments[0].click();", more_button)
            # Allow some time for the review text to expand
            time.sleep(1)
    except Exception as e:
        # If the button is not found or any error occurs, then ignore.
        pass

# --- Scroll the review container ---
def scroll_reviews(driver):
    try:
        reviews_container = driver.find_element(By.CSS_SELECTOR, "div.m6QErb.DxyBCb.kA9KIf.dS8AEf")
        driver.execute_script("arguments[0].scrollTo(0, arguments[0].scrollHeight);", reviews_container)
        time.sleep(2)  # Allow time for new reviews to load
    except Exception as e:
        print(f"Error while scrolling reviews: {e}")

# --- Main function to scrape reviews ---
def scrape_reviews(place_id, max_reviews):
    # We'll store valid reviews in a dictionary keyed by author.
    # For each author, we only keep the newest review.
    valid_reviews = {}  # key: author, value: review dict {"author":..., "text":..., "date":...}
    scraped_texts = set()    # To keep track of texts we have already seen

    driver = webdriver.Chrome(options=options)
    url = f"https://www.google.com/maps/place/?q=place_id:{place_id}"
    driver.get(url)
    
    try:
        # Wait for the Reviews tab to be clickable, then click it
        reviews_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button[aria-label*='Reviews for']"))
        )
        reviews_tab.click()
        time.sleep(2)
    except Exception as e:
        print(f"Error finding reviews tab: {e}")
        driver.quit()
        return []

    scroll_attempts = 0

    # Continue until we have enough unique valid reviews or no more reviews are loaded
    while len(valid_reviews) < max_reviews:
        try:
            # Wait for the reviews container to be present
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.m6QErb.DxyBCb.kA9KIf.dS8AEf"))
            )
        except Exception as e:
            print(f"Could not locate reviews container: {e}")
            break

        # Find all review elements
        review_elements = driver.find_elements(By.CSS_SELECTOR, "div.jftiEf")
        new_reviews = []

        for review_element in review_elements:
            try:
                # Expand the review text if there is a "More" button
                expand_review(driver, review_element)
                
                # Extract the author
                author_element = review_element.find_element(By.CSS_SELECTOR, "div.d4r55")
                author = author_element.text.strip() if author_element else "N/A"
                
                # Extract the review text
                text_element = review_element.find_element(By.CSS_SELECTOR, "span.wiI7pd")
                text = text_element.text.strip() if text_element else ""
                
                # Extract the review date (e.g., "10 months ago")
                date_element = review_element.find_element(By.CSS_SELECTOR, "span.rsqaWe")
                date_text = date_element.text.strip() if date_element else ""
                review_date = parse_relative_date(date_text)
                
                if not text or text in scraped_texts:
                    continue  # Skip if no text or already processed
                
                scraped_texts.add(text)
                new_reviews.append({"author": author, "text": text, "date": review_date})
            except Exception as e:
                # Skip review if any error occurs
                continue

        if new_reviews:
            # Preprocess the new reviews for the model prediction
            review_texts = [r["text"] for r in new_reviews]
            processed_reviews = preprocess_reviews(review_texts)
            real_texts, _ = detect_fake_reviews(processed_reviews)
            
            # For each new review, if it is predicted as real, update the valid_reviews dict.
            for idx, review_obj in enumerate(new_reviews):
                processed_version = preprocess_reviews([review_obj["text"]])[0]
                if processed_version in real_texts:
                    author = review_obj["author"]
                    # If author already exists, keep the one with the newer date.
                    if author in valid_reviews:
                        if review_obj["date"] > valid_reviews[author]["date"]:
                            valid_reviews[author] = review_obj
                    else:
                        valid_reviews[author] = review_obj

                    if len(valid_reviews) >= max_reviews:
                        break

        if len(valid_reviews) >= max_reviews:
            break

        # Scroll the reviews container to load more reviews
        previous_count = len(review_elements)
        scroll_reviews(driver)
        time.sleep(2)
        review_elements_after_scroll = driver.find_elements(By.CSS_SELECTOR, "div.jftiEf")
        current_count = len(review_elements_after_scroll)

        # If no new reviews are loaded, increase a counter and break if several attempts yield no change
        if current_count == previous_count:
            scroll_attempts += 1
            if scroll_attempts >= 3:
                print("No more reviews to load.")
                break
        else:
            scroll_attempts = 0

    driver.quit()
    # Return only the first max_reviews reviews (sorted by review date descending)
    final_reviews = sorted(valid_reviews.values(), key=lambda r: r["date"], reverse=True)
    return final_reviews[:max_reviews]
