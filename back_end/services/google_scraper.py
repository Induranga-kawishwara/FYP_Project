import hashlib
import datetime
import logging
import asyncio

from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

# Setup
torch.set_num_threads(1)
nltk.download("stopwords", quiet=True)
nltk.download("wordnet", quiet=True)
nltk.download("omw-1.4", quiet=True)

stop_words = set(stopwords.words("english"))
lemmatizer = WordNetLemmatizer()

# Load model
tokenizer = AutoTokenizer.from_pretrained("models/aiReviewModel")
model = AutoModelForSequenceClassification.from_pretrained("models/aiReviewModel")
model.eval()

def preprocess_review(text):
    if not isinstance(text, str) or not text.strip():
        return ""
    return " ".join(lemmatizer.lemmatize(w.lower()) for w in text.split() if w.lower() not in stop_words)

def parse_relative_date(date_str):
    now = datetime.datetime.now()
    s = date_str.strip().lower().replace("edited", "").replace("ago", "")
    parts = s.split()
    try:
        if "today" in s:
            return now
        if "yesterday" in s:
            return now - datetime.timedelta(days=1)
        if len(parts) >= 2:
            num = 1 if parts[0] in ("a", "an") else int(parts[0])
            unit = parts[1]
            if "year" in unit: return now - datetime.timedelta(days=365 * num)
            if "month" in unit: return now - datetime.timedelta(days=30 * num)
            if "week" in unit: return now - datetime.timedelta(days=7 * num)
            if "day" in unit: return now - datetime.timedelta(days=num)
    except:
        pass
    return now

def detect_fake_reviews(texts):
    try:
        valid_texts = [t for t in texts if t.strip()]
        if not valid_texts:
            return [], []
        inputs = tokenizer(valid_texts, padding=True, truncation=True, return_tensors="pt", max_length=256)
        with torch.no_grad():
            logits = model(**inputs).logits
        preds = torch.argmax(logits, dim=-1).tolist()
        real = [t for t, p in zip(valid_texts, preds) if p == 0]
        fake = [t for t, p in zip(valid_texts, preds) if p == 1]
        return real, fake
    except Exception as e:
        logging.error(f"Error in detect_fake_reviews: {e}")
        return [], texts

async def fetch_real_reviews(place_id, max_reviews, retries=3):  
    logging.info(f"[{place_id}] Starting review fetch")
    reviews = []
    seen_hashes = set()
    scroll_fails = 0

    async with async_playwright() as p:
        logging.info(f"[{place_id}] Launching browser")
        try:
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--disable-gpu",
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--js-flags=--max-old-space-size=256"  
                ]
            )
            context = await browser.new_context(user_agent="Mozilla/5.0")
            page = await context.new_page()

            try:
                for attempt in range(1, retries + 1):
                    try:
                        logging.info(f"[{place_id}] Navigating to Google Maps (Attempt {attempt})")
                        await page.goto(f"https://www.google.com/maps/place/?q=place_id:{place_id}", timeout=30000)
                        break
                    except PlaywrightTimeout:
                        if attempt < retries:
                            logging.warning(f"[{place_id}] Timeout on attempt {attempt}, retrying...")
                            await asyncio.sleep(5 * attempt)
                        else:
                            logging.error(f"[{place_id}] Failed to load page after {retries} attempts")
                            return []

                logging.info(f"[{place_id}] Waiting for reviews button")
                await page.wait_for_selector("button[aria-label*='Reviews for']", timeout=10000)
                logging.info(f"[{place_id}] Clicking reviews tab")
                await page.click("button[aria-label*='Reviews for']")
                await page.wait_for_timeout(1000)

                while len(reviews) < max_reviews and scroll_fails < 2:
                    logging.info(f"[{place_id}] Querying review elements")
                    elements = await page.query_selector_all("div.jftiEf")
                    before = len(elements)
                    batch = []
                    for el in elements:
                        try:
                            await el.hover()
                            see_more = await el.query_selector("button[aria-label='See more']")
                            if see_more:
                                await see_more.click()

                            author_el = await el.query_selector("div.d4r55")
                            text_el = await el.query_selector("span.wiI7pd")
                            date_el = await el.query_selector("span.rsqaWe")

                            author = (await author_el.inner_text()).strip() if author_el else "Unknown"
                            text = (await text_el.inner_text()).strip() if text_el else ""
                            date_s = (await date_el.inner_text()).strip() if date_el else "today"

                            if not text:
                                continue

                            dt = parse_relative_date(date_s)
                            proc = preprocess_review(text)
                            if not proc:
                                continue
                            hash_key = hashlib.md5((author + text).encode()).hexdigest()
                            if hash_key in seen_hashes:
                                continue
                            seen_hashes.add(hash_key)

                            batch.append({
                                "author": author,
                                "text": text,
                                "date": dt,
                                "processed_text": proc
                            })
                        except Exception as e:
                            logging.warning(f"[{place_id}] Error extracting review: {e}")
                            continue

                    if batch:
                        real_proc, _ = detect_fake_reviews([b["processed_text"] for b in batch])
                        reviews += [r for r in batch if r["processed_text"] in real_proc]

                    after = len(await page.query_selector_all("div.jftiEf"))
                    scroll_fails = scroll_fails + 1 if after == before else 0

                    logging.info(f"[{place_id}] Reviews: {len(reviews)}, Scroll fails: {scroll_fails}")

                    try:
                        await page.eval_on_selector(
                            "div.m6QErb.DxyBCb.kA9KIf.dS8AEf",
                            "(el) => el.scrollBy(0, el.scrollHeight)"
                        )
                        await page.wait_for_timeout(1000)
                    except Exception as e:
                        logging.warning(f"[{place_id}] Scroll failed: {e}")
                        break

            except Exception as e:
                logging.error(f"[{place_id}] Unexpected error in review fetching: {e}")
                return []
            finally:
                logging.info(f"[{place_id}] Closing browser resources")
                try:
                    await page.close()
                    await context.close()
                    await browser.close()
                except Exception as e:
                    logging.error(f"[{place_id}] Error closing browser: {e}")

        except Exception as e:
            logging.error(f"[{place_id}] Failed to launch browser: {e}")
            return []

        reviews.sort(key=lambda x: x["date"], reverse=True)
        return reviews[:max_reviews]