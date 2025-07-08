import datetime
import hashlib
import nltk
import torch
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

#  NLTK resources 
nltk.download("stopwords", quiet=True)
nltk.download("wordnet", quiet=True)
nltk.download("omw-1.4", quiet=True)

#  Load DistilBERT-based AI Review Detection Model 
tokenizer  = AutoTokenizer.from_pretrained("models/aiReviewModel")
model      = AutoModelForSequenceClassification.from_pretrained("models/aiReviewModel")
model.eval()

lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words("english"))

def parse_relative_date(date_str: str) -> datetime.datetime:

    now = datetime.datetime.now()
    s   = date_str.lower().replace("edited", "").replace("ago", "").strip()
    if "today"     in s:
        return now
    if "yesterday" in s:
        return now - datetime.timedelta(days=1)
    parts = s.split()
    try:
        num  = 1 if parts[0] in ("a", "an") else int(parts[0])
        unit = parts[1]
        if "year"  in unit:
            return now - datetime.timedelta(days=365 * num)
        if "month" in unit:
            return now - datetime.timedelta(days=30  * num)
        if "week"  in unit:
            return now - datetime.timedelta(days=7   * num)
        if "day"   in unit:
            return now - datetime.timedelta(days=num)
    except Exception:
        pass
    return now

def preprocess_review(text: str) -> str:

    return " ".join(
        lemmatizer.lemmatize(w.lower())
        for w in text.split()
        if w.lower() not in stop_words
    )

def detect_fake_reviews(reviews: list[str]) -> tuple[list[str], list[str]]:

    if not reviews:
        return [], []
    inputs = tokenizer(
        reviews,
        padding=True,
        truncation=True,
        return_tensors="pt",
        max_length=256
    )
    with torch.no_grad():
        logits = model(**inputs).logits
    preds = torch.argmax(logits, dim=-1).tolist()
    real = [r for r, p in zip(reviews, preds) if p == 0]
    fake = [r for r, p in zip(reviews, preds) if p == 1]
    return real, fake

def fetch_real_reviews(place_id: str, max_reviews: int = 50) -> list[dict]:

    raw_reviews = []
    seen_hashes = set()
    url = f"https://www.google.com/maps/place/?q=place_id:{place_id}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx     = browser.new_context()
        page    = ctx.new_page()

        try:
            page.goto(url, timeout=60_000)
            page.click("button[aria-label^='Reviews for']", timeout=10_000)
        except PlaywrightTimeout:
            ctx.close()
            browser.close()
            return []

        last_count      = 0
        scroll_attempts = 0

        while len(raw_reviews) < max_reviews and scroll_attempts < 5:
            # Wait up to 2s for any review card to appear
            try:
                page.wait_for_selector("div.jftiEf", timeout=2_000)
            except PlaywrightTimeout:
                break

            cards      = page.locator("div.jftiEf")
            curr_count = cards.count()

            if curr_count == last_count:
                scroll_attempts += 1
            else:
                scroll_attempts = 0
                last_count      = curr_count

            for i in range(curr_count):
                if len(raw_reviews) >= max_reviews:
                    break

                card = cards.nth(i)
                try:
                    # Expand truncated text if present
                    if card.locator("button[aria-label='See more']").count():
                        card.locator("button[aria-label='See more']").click()

                    # Check existence of elements
                    author_loc = card.locator("div.d4r55")
                    text_loc   = card.locator("span.wiI7pd")
                    date_loc   = card.locator("span.rsqaWe")

                    if not (author_loc.count() and text_loc.count() and date_loc.count()):
                        continue

                    # Extract with short per-element timeouts
                    author = author_loc.inner_text(timeout=2_000).strip()
                    text   = text_loc.inner_text(timeout=2_000).strip()
                    date_s = date_loc.inner_text(timeout=2_000).strip()
                except PlaywrightTimeout:
                    continue  
                except Exception:
                    continue  

                dt   = parse_relative_date(date_s)
                proc = preprocess_review(text)
                h    = hashlib.md5((text + author).encode()).hexdigest()

                if proc and h not in seen_hashes:
                    seen_hashes.add(h)
                    raw_reviews.append({
                        "author":         author,
                        "text":           text,
                        "date":           dt,
                        "processed_text": proc
                    })

            # Scroll the reviews pane to load more
            page.locator("div.m6QErb.DxyBCb.kA9KIf.dS8AEf") \
                .evaluate("e => e.scrollBy(0, e.scrollHeight)")

        ctx.close()
        browser.close()

    # Filter out fake reviews in one batch
    processed_texts = [r["processed_text"] for r in raw_reviews]
    real_texts, _   = detect_fake_reviews(processed_texts)
    filtered        = [r for r in raw_reviews if r["processed_text"] in real_texts]

    # Sort by date (newest first) and trim
    filtered.sort(key=lambda r: r["date"], reverse=True)
    return filtered[:max_reviews]
