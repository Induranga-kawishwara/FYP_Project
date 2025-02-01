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
import google_map_scraper  # Import scraper script
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
@retry(wait=wait_fixed(2), stop=stop_after_attempt(3))
def get_google_response(url):
    response = requests.get(url, timeout=300)
    response.raise_for_status()
    return response.json()

def detect_fake_reviews(reviews):
    if not reviews:
        return [], []  # Return empty lists if no reviews

    feature_data = []

    # Ensure all reviews are strings
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

    # Fix Feature Mismatch
    feature_df = feature_df[expected_features]  # Ensure only relevant features are used

    # Convert to DMatrix for XGBoost
    dtest = xgb.DMatrix(feature_df)

    # Predict Fake Reviews
    predictions = fake_review_model.predict(dtest)
    predictions = (predictions > 0.5).astype(int)  # Convert probabilities to 0 (real) or 1 (fake)

    # Separate Fake and Real Reviews
    real_reviews = [reviews[i] for i in range(len(reviews)) if predictions[i] == 0]  # 0 = Real
    fake_reviews = [reviews[i] for i in range(len(reviews)) if predictions[i] == 1]  # 1 = Fake

    return real_reviews, fake_reviews

def predict_review_rating(reviews):
    """Predicts review ratings and returns a weighted average rating (0.00 format)."""

    if not reviews:
        return 0.0  # Return 0 if there are no reviews

    # Ensure all reviews are strings
    flat_reviews = [" ".join(str(r) for r in review) if isinstance(review, list) else str(review) for review in reviews]

    # Vectorize reviews using the TF-IDF vectorizer
    transformed_reviews = vectorizer.transform(flat_reviews)  

    # Convert to DMatrix for XGBoost
    dtest = xgb.DMatrix(transformed_reviews)

    # Predict probability distribution for each rating (1-5)
    pred_probs = review_model.predict(dtest)  # shape: (num_reviews, 5)

    # Compute the Weighted Average Rating (1-5 scale)
    weighted_ratings = np.sum(pred_probs * np.arange(1, 6), axis=1)  # Multiply probabilities by 1,2,3,4,5
    avg_rating = np.mean(weighted_ratings)  # Compute final weighted average
    
    return round(avg_rating, 2)  # Return as 0.00 format



def classify_reviews_by_rating(reviews):
    """Classifies reviews into Positive & Negative using XGBoost predictions."""
    if not reviews:
        return [], [], 0, 0, 0  # Return empty lists if no reviews

    # Preprocess & Vectorize Reviews
    processed_reviews = [review.lower() for review in reviews]  # Simple preprocessing
    tfidf_reviews = vectorizer.transform(processed_reviews)

    # Convert to DMatrix for XGBoost
    dtest = xgb.DMatrix(tfidf_reviews)

    # Predict Star Ratings (1-5)
    pred_probs = review_model.predict(dtest)
    predicted_ratings = np.argmax(pred_probs, axis=1) + 1

    # Separate Positive & Negative Reviews
    positive_reviews = [reviews[i] for i in range(len(reviews)) if predicted_ratings[i] >= 4]
    negative_reviews = [reviews[i] for i in range(len(reviews)) if predicted_ratings[i] <= 2]

    # Compute Rating Statistics
    weighted_ratings = np.sum(pred_probs * np.arange(1, 6), axis=1)  # Weighted averaging
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

    # Classify reviews into positive & negative
    positive_reviews, negative_reviews, avg_rating, weighted_avg, majority_rating = classify_reviews_by_rating(reviews)  # <-- FIXED (Use reviews directly)

    # Log count of positive & negative reviews in the console
    print(f"Positive Reviews Count (Last 3 Months): {len(positive_reviews)}")
    print(f"Negative Reviews Count (Last 3 Months): {len(negative_reviews)}")

    # Construct summary text
    positive_text = "Positives (Based on last 3 months' reviews): " + ". ".join(positive_reviews[:5]) + "." if positive_reviews else "Positives (Last 3 months): No major positive feedback."
    negative_text = "Negatives (Based on last 3 months' reviews): " + ". ".join(negative_reviews[:5]) + "." if negative_reviews else "Negatives (Last 3 months): No major complaints."

    combined_text = positive_text + " " + negative_text

    try:
        # Generate summary using GPT-2
        raw_summary = summarizer(
            "Summarize the key points of these reviews: " + combined_text,
            max_length=100,
            num_return_sequences=1,
            max_new_tokens=80
        )[0]["generated_text"]

        # Post-processing to remove personal pronouns
        raw_summary = (
            raw_summary.replace("I ", "Some visitors ")
                       .replace("We ", "Many visitors ")
                       .replace("My ", "Their ")
                       .replace("Our ", "The place's ")
        )

        # Format into structured bullet points
        summary_lines = raw_summary.split(". ")
        refined_summary = "\n- " + "\n- ".join(summary_lines[:5])

        # Ensure "Negatives: No major complaints." is always included
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

    # Ensure texts are a list of strings
    texts = [str(text) for text in texts]

    # Convert to TF-IDF features
    transformed_texts = vectorizer.transform(texts)
    dtest = xgb.DMatrix(transformed_texts)

    # Get probability scores (Ensure it's returned as a 2D array)
    probabilities = review_model.predict(dtest)  

    # Ensure probabilities match the number of perturbed samples LIME generates
    if probabilities.ndim == 1:
        probabilities = np.expand_dims(probabilities, axis=1)  # Reshape to (n_samples, 1)

    return probabilities


@app.route("/explain_review", methods=["POST"])
def explain_review():
    review_text = request.json.get("review")

    # Ensure review_text is a string
    if not review_text or not isinstance(review_text, str):
        return jsonify({"error": "Invalid review text"}), 400

    # Use LIME to explain prediction
    explanation = lime_explainer.explain_instance(
        review_text,
        predict_proba,  # Pass your probability function
        num_features=10
    )

    # Ensure the response is always a list
    explanation_list = [{"word": word, "weight": weight} for word, weight in explanation.as_list()]
    
    return jsonify({"explanation": explanation_list})


# Search Shops for a Product
@app.route("/search_product", methods=["GET"])
def search_product():
    product_name = request.args.get("product")
    if not product_name:
        return jsonify({"error": "Product name is required"}), 400

    url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?query={product_name}+store&key={GOOGLE_API_KEY}"
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

        # Fetch Google Reviews using place_id
        all_reviews = google_map_scraper.scrape_reviews(shop["place_id"])

        if all_reviews:
            real_reviews, fake_reviews = detect_fake_reviews(all_reviews)
            real_review_texts = [review["text"] for review in real_reviews]  # Extract only text

            overall_predicted_rating = predict_review_rating([" ".join(real_review_texts)]) if real_review_texts else 0
            summary = generate_summary(real_review_texts) if real_review_texts else "No valid reviews available."

            shop["reviews"] = real_reviews
            shop["summary"] = summary
            shop["fake_reviews"] = fake_reviews
            shop["predicted_rating"] = overall_predicted_rating
        else:
            shop["reviews"] = []
            shop["summary"] = "No reviews available."
            shop["fake_reviews"] = []
            shop["predicted_rating"] = 0

        shop = convert_numpy_types(shop)  # Convert numpy types to native types

        shops.append(shop)

    return jsonify({"shops": shops})

# Fetch Shop Reviews and Process Them
@app.route("/search_shop", methods=["GET"])
def search_shop():
    shop_id = request.args.get("place_id")
    details_url = f"https://maps.googleapis.com/maps/api/place/details/json?placeid={shop_id}&fields=reviews&key={GOOGLE_API_KEY}"
    details_response = get_google_response(details_url)

    if "result" not in details_response or "reviews" not in details_response["result"]:
        return jsonify({"error": "No reviews found"}), 404

    reviews = [review["text"] for review in details_response["result"]["reviews"]]

    # Remove Fake Reviews
    real_reviews, _ = detect_fake_reviews(reviews)

    # Predict Ratings
    predicted_ratings = predict_review_rating(real_reviews)

    # Generate Summary
    summary = generate_summary(real_reviews)

    return jsonify({
        "reviews": [{"text": review, "predicted_rating": predicted_ratings} for review in real_reviews],
        "summary": summary
    })

# User Signup
@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    username = data["username"]
    password = bcrypt.generate_password_hash(data["password"]).decode("utf-8")

    cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, password))
    conn.commit()
    return jsonify({"message": "User registered successfully"}), 201

# User Login
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

# Run Flask App
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
