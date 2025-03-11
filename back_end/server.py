# Import Required Libraries
from flask import Flask, logging, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token, jwt_required, JWTManager, get_jwt_identity
import joblib
import pandas as pd
import googlemaps
import numpy as np
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from textblob import TextBlob
from transformers import pipeline
import lime.lime_text
import xgboost as xgb
import requests
import google_map_scraper  
from dotenv import load_dotenv
import os
from tenacity import retry, wait_fixed, stop_after_attempt

# Load environment variables from .env file
load_dotenv()

# Download NLTK Resources
nltk.download("stopwords")
nltk.download("wordnet")

# Initialize Flask App
app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
jwt = JWTManager(app)
CORS(app)
bcrypt = Bcrypt(app)

# Initialize Database Connection
import sqlite3
conn = sqlite3.connect('users.db', check_same_thread=False)
cursor = conn.cursor()

# Create Users Table if not exists
cursor.execute('''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
)
''')
conn.commit()

# Load Google API Key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
gmaps = googlemaps.Client(key=GOOGLE_API_KEY)

# Load Pretrained Models
review_model = joblib.load("reviewPrediction_models/best_xgboost_model.pkl")
fake_review_model = joblib.load("fakeReview_model/xgboost_fakereview_model.pkl")
vectorizer = joblib.load("reviewPrediction_models/tfidf_vectorizer.pkl")
scaler = joblib.load("fakeReview_model/scaler.pkl") 

# Load GPT-2 for Review Summarization
summarizer = pipeline("text-generation", model="gpt2")

# Load LIME Explainer
lime_explainer = lime.lime_text.LimeTextExplainer(class_names=["1-star", "2-star", "3-star", "4-star", "5-star"])

# Initialize Text Preprocessing
lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words("english"))

# Retry decorator for API calls
from tenacity import retry, wait_fixed, stop_after_attempt

@retry(wait=wait_fixed(2), stop=stop_after_attempt(3))
def get_google_response(url):
    response = requests.get(url, timeout=300)
    response.raise_for_status()
    return response.json()

def detect_fake_reviews(reviews):
    if not reviews:
        return [], []  # Return empty lists if no reviews

    feature_data = []
    flat_reviews = [str(review) for review in reviews]

    # Extract Features
    for review in flat_reviews:
        sentiment_score = TextBlob(review).sentiment.polarity
        contains_promo_words = int(any(word in review.lower() for word in ["best", "amazing", "awesome", "perfect", "incredible", "must-buy"]))
        contains_sarcasm_words = int(any(word in review.lower() for word in ["lmao", "lol", "smh", "yeah right"]))
        days_since_review = 0  # Assume new reviews have 0 days

        feature_data.append([sentiment_score, contains_promo_words, contains_sarcasm_words, days_since_review])

    # Convert to DataFrame
    feature_df = pd.DataFrame(feature_data, columns=["sentiment_score", "contains_promo_words", "contains_sarcasm_words", "days_since_review"])

    # Ensure Feature Names Match Training Data
    expected_features = ["sentiment_score", "contains_promo_words", "contains_sarcasm_words", "days_since_review"]
    feature_df = feature_df[expected_features]

    # Convert to DMatrix for XGBoost
    dtest = xgb.DMatrix(feature_df)

    # Predict Fake Reviews
    predictions = fake_review_model.predict(dtest)
    predictions = (predictions > 0.5).astype(int)  # Convert probabilities to 0 (real) or 1 (fake)

    # Separate Fake and Real Reviews
    real_reviews = [reviews[i] for i in range(len(reviews)) if predictions[i] == 0]
    fake_reviews = [reviews[i] for i in range(len(reviews)) if predictions[i] == 1]

    return real_reviews, fake_reviews

def predict_review_rating(reviews):
    """Predicts review ratings and returns a weighted average rating (0.00 format)."""
    if not reviews:
        return 0.0

    flat_reviews = [" ".join(str(r) for r in review) if isinstance(review, list) else str(review) for review in reviews]
    transformed_reviews = vectorizer.transform(flat_reviews)
    dtest = xgb.DMatrix(transformed_reviews)
    pred_probs = review_model.predict(dtest)  # shape: (num_reviews, 5)
    weighted_ratings = np.sum(pred_probs * np.arange(1, 6), axis=1)
    avg_rating = np.mean(weighted_ratings)
    return round(avg_rating, 2)

def classify_reviews_by_rating(reviews):
    """Classifies reviews into Positive & Negative using XGBoost predictions."""
    if not reviews:
        return [], [], 0, 0, 0

    processed_reviews = [review.lower() for review in reviews]
    tfidf_reviews = vectorizer.transform(processed_reviews)
    dtest = xgb.DMatrix(tfidf_reviews)
    pred_probs = review_model.predict(dtest)
    predicted_ratings = np.argmax(pred_probs, axis=1) + 1
    positive_reviews = [reviews[i] for i in range(len(reviews)) if predicted_ratings[i] >= 4]
    negative_reviews = [reviews[i] for i in range(len(reviews)) if predicted_ratings[i] <= 2]
    weighted_ratings = np.sum(pred_probs * np.arange(1, 6), axis=1)
    weighted_average_rating = np.mean(weighted_ratings)
    majority_rating = pd.Series(predicted_ratings).mode()[0]
    avg_rating = np.mean(predicted_ratings)
    return positive_reviews, negative_reviews, avg_rating, weighted_average_rating, majority_rating

def generate_summary(reviews):
    """Generates a structured summary based on the last 3 months' reviews."""
    if not reviews:
        return {
            "detailed_summary": "No reviews available for the last 3 months.",
            "average_rating": 0.00,
            "weighted_average_rating": 0.00,
            "most_common_rating": 0
        }

    positive_reviews, negative_reviews, avg_rating, weighted_avg, majority_rating = classify_reviews_by_rating(reviews)
    print(f"Positive Reviews Count (Last 3 Months): {len(positive_reviews)}")
    print(f"Negative Reviews Count (Last 3 Months): {len(negative_reviews)}")

    positive_text = "Positives (Based on last 3 months' reviews): " + ". ".join(positive_reviews[:5]) + "." if positive_reviews else "Positives (Last 3 months): No major positive feedback."
    negative_text = "Negatives (Based on last 3 months' reviews): " + ". ".join(negative_reviews[:5]) + "." if negative_reviews else "Negatives (Last 3 months): No major complaints."
    combined_text = positive_text + " " + negative_text

    try:
        raw_summary = summarizer(
            "Summarize the key points of these reviews: " + combined_text,
            max_length=100,
            num_return_sequences=1,
            max_new_tokens=80
        )[0]["generated_text"]

        raw_summary = (
            raw_summary.replace("I ", "Some visitors ")
                       .replace("We ", "Many visitors ")
                       .replace("My ", "Their ")
                       .replace("Our ", "The place's ")
        )
        summary_lines = raw_summary.split(". ")
        refined_summary = "\n- " + "\n- ".join(summary_lines[:5])
        if "Negatives:" not in refined_summary:
            refined_summary += "\n- Negatives (Last 3 months): No major complaints."
        return {
            "detailed_summary": f"📅 Summary based on last 3 months' reviews:\n{refined_summary.strip()}",
            "average_rating": round(avg_rating, 2),
            "weighted_average_rating": round(weighted_avg, 2),
            "most_common_rating": majority_rating
        }
    except IndexError as e:
        print(f"GPT-2 IndexError: {e}")
        return {
            "detailed_summary": "Error generating summary.",
            "average_rating": round(avg_rating, 2),
            "weighted_average_rating": round(weighted_avg, 2),
            "most_common_rating": majority_rating
        }

def convert_numpy_types(data):
    """Recursively convert numpy types to native Python types."""
    if isinstance(data, dict):
        return {key: convert_numpy_types(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [convert_numpy_types(item) for item in data]
    elif isinstance(data, np.int64):
        return int(data)
    elif isinstance(data, np.float64):
        return float(data)
    else:
        return data

def predict_proba(texts):
    """Predict probability distribution for LIME explainability."""
    texts = [str(text) for text in texts]
    transformed_texts = vectorizer.transform(texts)
    dtest = xgb.DMatrix(transformed_texts)
    probabilities = review_model.predict(dtest)
    if probabilities.ndim == 1:
        probabilities = np.expand_dims(probabilities, axis=1)
    return probabilities

@app.route("/explain_review", methods=["POST"])
def explain_review():
    review_text = request.json.get("review")
    if not review_text or not isinstance(review_text, str):
        return jsonify({"error": "Invalid review text"}), 400
    explanation = lime_explainer.explain_instance(
        review_text,
        predict_proba,
        num_features=10
    )
    explanation_list = [{"word": word, "weight": weight} for word, weight in explanation.as_list()]
    return jsonify({"explanation": explanation_list})

@app.route("/search_product", methods=["POST"])
def search_product():
    data = request.get_json()
    product_name = data.get("product")
    review_count = data.get("reviewCount")
    coverage = data.get("coverage")
    location = data.get("location")  # Expects a dict with 'lat' and 'lng'

    if not product_name:
        return jsonify({"error": "Product name is required"}), 400
    if not location or not location.get("lat") or not location.get("lng"):
        return jsonify({"error": "User location is required"}), 400

    # Determine the search radius based on coverage
    if coverage == "all":
        radius = 50000  # Use a large radius (50 km) for "all shops"
    else:
        try:
            radius = int(coverage) * 1000  # Convert coverage (km) to meters
        except Exception:
            return jsonify({"error": "Invalid coverage value"}), 400

    lat = location.get("lat")
    lng = location.get("lng")
    url = (
        f"https://maps.googleapis.com/maps/api/place/textsearch/json?"
        f"query={product_name} store near me&"
        f"location={lat},{lng}&"
        f"radius={radius}&"
        f"type=store&key={GOOGLE_API_KEY}"
    )
    response = get_google_response(url)
    if "results" not in response or not response["results"]:
        return jsonify({"error": "No shops found"}), 404

    shops = []
    for place in response["results"]:
        shop = {
            "shop_name": place["name"],
            "address": place.get("formatted_address", "N/A"),
            "rating": float(place.get("rating", 0)),
            "place_id": place["place_id"],
            "lat": float(place["geometry"]["location"]["lat"]),
            "lng": float(place["geometry"]["location"]["lng"])
        }

        # Scrape reviews until we have the required valid reviews
        valid_reviews = google_map_scraper.scrape_reviews(shop["place_id"], review_count)
        if valid_reviews:
            overall_predicted_rating = predict_review_rating([" ".join([r["text"] for r in valid_reviews])])
            summary = generate_summary([" ".join([r["text"] for r in valid_reviews])])
            shop["reviews"] = valid_reviews
            shop["summary"] = summary
            shop["predicted_rating"] = overall_predicted_rating
        else:
            shop["reviews"] = []
            shop["summary"] = "No reviews available."
            shop["predicted_rating"] = 0

        shop = convert_numpy_types(shop)
        shops.append(shop)

    return jsonify({"shops": shops})

@app.route("/search_shop", methods=["GET"])
def search_shop():
    shop_id = request.args.get("place_id")
    details_url = f"https://maps.googleapis.com/maps/api/place/details/json?placeid={shop_id}&fields=reviews&key={GOOGLE_API_KEY}"
    details_response = get_google_response(details_url)

    if "result" not in details_response or "reviews" not in details_response["result"]:
        return jsonify({"error": "No reviews found"}), 404

    reviews = [review["text"] for review in details_response["result"]["reviews"]]
    real_reviews, _ = detect_fake_reviews(reviews)
    predicted_ratings = predict_review_rating(real_reviews)
    summary = generate_summary(real_reviews)

    return jsonify({
        "reviews": [{"text": review, "predicted_rating": predicted_ratings} for review in real_reviews],
        "summary": summary
    })

@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    username = data["username"]
    password = bcrypt.generate_password_hash(data["password"]).decode("utf-8")
    cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, password))
    conn.commit()
    return jsonify({"message": "User registered successfully"}), 201

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data["username"]
    password = data["password"]
    cursor.execute("SELECT password FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    if user and bcrypt.check_password_hash(user[0], password):
        access_token = create_access_token(identity=username)
        return jsonify({"token": access_token}), 200
    return jsonify({"error": "Invalid credentials"}), 401

@app.route("/")
def home():
    return "Hello from Flask!"

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
