import datetime
import hashlib
import logging
import time
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# NLTK & model setup
nltk.download("stopwords", quiet=True)
nltk.download("wordnet", quiet=True)
nltk.download("omw-1.4", quiet=True)

tokenizer = AutoTokenizer.from_pretrained("models/aiReviewModel")
model     = AutoModelForSequenceClassification.from_pretrained("models/aiReviewModel")
model.eval()

stop_words = set(stopwords.words("english"))
lemmatizer = WordNetLemmatizer()
logger     = logging.getLogger(__name__)

def preprocess_review(text):
    return " ".join(
        lemmatizer.lemmatize(w.lower())
        for w in text.split()
        if w.lower() not in stop_words
    )

def parse_relative_date(date_str):
    now = datetime.datetime.now()
    s = date_str.lower().replace("edited","").replace("ago","")
    parts = s.split()
    try:
        if "today" in s: return now
        if "yesterday" in s: return now - datetime.timedelta(days=1)
        if len(parts)>=2:
            n = 1 if parts[0] in ("a","an") else int(parts[0])
            u = parts[1]
            if "year" in u:  return now - datetime.timedelta(days=365*n)
            if "month" in u: return now - datetime.timedelta(days=30*n)
            if "week" in u:  return now - datetime.timedelta(days=7*n)
            if "day" in u:   return now - datetime.timedelta(days=n)
    except:
        pass
    return now

def detect_fake_reviews(texts):
    if not texts:
        return [], []
    inp = tokenizer(texts, padding=True, truncation=True, return_tensors="pt", max_length=256)
    with torch.no_grad():
        logits = model(**inp).logits
    preds = torch.argmax(logits, dim=-1).tolist()
    real = [t for t,p in zip(texts,preds) if p==0]
    fake = [t for t,p in zip(texts,preds) if p==1]
    return real, fake

def fetch_real_reviews(place_id, max_reviews=50):
    reviews = []
    seen    = set()
    url     = f"https://www.google.com/maps/place/?q=place_id:{place_id}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx     = browser.new_context(user_agent="Mozilla/5.0", locale="en-US")
        page    = ctx.new_page()
        page.set_default_navigation_timeout(60000)

        # 1) Load until DOMContentLoaded
        try:
            page.goto(url, timeout=60000, wait_until="domcontentloaded")
            page.wait_for_timeout(1500)
        except PlaywrightTimeout as e:
            logger.error(f"[Timeout] Loading {place_id}: {e}")
            ctx.close(); browser.close()
            return []
        except Exception as e:
            logger.error(f"[Error] Loading {place_id}: {e}")
            ctx.close(); browser.close()
            return []

        # 2) Open reviews pane (fallback selectors)
        for sel in (
            "button[jsaction*='pane.reviewChart.moreReviews']",
            "button[aria-label*='All reviews']",
            "text=All reviews",
            "button[aria-label*='Reviews']"
        ):
            try:
                page.click(sel, timeout=3000)
                page.wait_for_timeout(800)
                break
            except:
                pass

        # 3) Wait for any review
        try:
            page.wait_for_selector("div[data-review-id]", timeout=10000)
        except:
            logger.warning(f"[No reviews] {place_id}")
            ctx.close(); browser.close()
            return []

        # 4) Scroll-loop inside the reviews container
        #    Look up the container once
        container = page.query_selector("div.m6QErb.DxyBCb.kA9KIf.dS8AEf")
        stall     = 0
        last      = 0
        while True:
            # decide scroll target
            if container:
                # scroll the reviews pane
                container.evaluate("(el) => el.scrollBy(0, el.scrollHeight)")
            else:
                # fallback to full page scroll
                page.evaluate("window.scrollBy(0, document.body.scrollHeight)")

            time.sleep(1.2)

            elems = page.query_selector_all("div[data-review-id]")
            count = len(elems)
            if count == last:
                stall += 1
            else:
                last = count
                stall = 0

            # accumulate reviews list for filtering
            # but don't break until we have enough or stall limit reached
            if last >= max_reviews or stall >= 15:
                break

        # 5) Extract up to max_reviews
        elems = page.query_selector_all("div[data-review-id]")[:max_reviews]
        for el in elems:
            try:
                a_el = el.query_selector("div.d4r55, span.X5PpBb")
                t_el = el.query_selector("span.wiI7pd, span[jsname='bN97Pc'], div.section-review-text")
                d_el = el.query_selector("span.rsqaWe, span.section-review-publish-date")
                if not (a_el and t_el and d_el):
                    continue

                author = a_el.inner_text().strip()
                text   = t_el.inner_text().strip()
                date   = parse_relative_date(d_el.inner_text().strip())
                proc   = preprocess_review(text)
                key    = hashlib.md5((text+author).encode()).hexdigest()
                if not proc or key in seen:
                    continue
                seen.add(key)
                reviews.append({
                    "author": author,
                    "text": text,
                    "date": date,
                    "processed_text": proc
                })
            except:
                continue

        # 6) Cleanup
        ctx.close()
        browser.close()

    # 7) Fake-review filter
    if reviews:
        txts       = [r["processed_text"] for r in reviews]
        real_txts, _ = detect_fake_reviews(txts)
        reviews    = [r for r in reviews if r["processed_text"] in real_txts]

    # sort by date desc
    reviews.sort(key=lambda r: r["date"], reverse=True)
    logger.info(f"[{place_id}] Scraped {len(reviews)} reviews")
    return reviews[:max_reviews]
