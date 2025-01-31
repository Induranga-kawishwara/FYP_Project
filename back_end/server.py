# ✅ Import Required Libraries
from flask import Flask, logging, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token, jwt_required, JWTManager, get_jwt_identity
import joblib
import pandas as pd
import googlemaps
import numpy as np
import re
import string
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from textblob import TextBlob
from transformers import pipeline
import lime.lime_text
import numpy as np
import xgboost as xgb
import requests

# ✅ Download NLTK Resources
nltk.download("stopwords")
nltk.download("wordnet")

# ✅ Initialize Flask App
app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = "18EFE2D8D8CBA28188FA3285259F5A4EA052F22DC31CBEF351544CAA5CC932B5"
jwt = JWTManager(app)
CORS(app)
bcrypt = Bcrypt(app)

# ✅ Initialize Database Connection
import sqlite3
conn = sqlite3.connect('users.db', check_same_thread=False)
cursor = conn.cursor()

# ✅ Create Users Table if not exists
cursor.execute('''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
)
''')
conn.commit()

# ✅ Load Google API Key
GOOGLE_API_KEY = "AIzaSyAMTYNccdhFeYEjhT9AQstckZvyD68Zk1w"
gmaps = googlemaps.Client(key=GOOGLE_API_KEY)

# ✅ Load Pretrained Models
review_model = joblib.load("reviewPrediction_models/best_xgboost_model.pkl")
fake_review_model = joblib.load("fakeReview_model/xgboost_fakereview_model.pkl")
vectorizer = joblib.load("reviewPrediction_models/tfidf_vectorizer.pkl")
scaler = joblib.load("fakeReview_model/scaler.pkl") 

# ✅ Load GPT-2 for Review Summarization
summarizer = pipeline("text-generation", model="gpt2")

# ✅ Load LIME Explainer
lime_explainer = lime.lime_text.LimeTextExplainer(class_names=["1-star", "2-star", "3-star", "4-star", "5-star"])

# ✅ Initialize Text Preprocessing
lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words("english"))

def detect_fake_reviews(reviews):
    if not reviews:
        return [], []  # Return empty lists if no reviews

    feature_data = []

    # 🔹 Ensure all reviews are strings
    flat_reviews = [str(review) for review in reviews]

    # 🔹 Extract Features
    for review in flat_reviews:
        sentiment_score = TextBlob(review).sentiment.polarity
        contains_promo_words = int(any(word in review.lower() for word in ["best", "amazing", "awesome", "perfect", "incredible", "must-buy"]))
        contains_sarcasm_words = int(any(word in review.lower() for word in ["lmao", "lol", "smh", "yeah right"]))
        days_since_review = 0  # Assume new reviews have 0 days

        feature_data.append([sentiment_score, contains_promo_words, contains_sarcasm_words, days_since_review])

    # 🔹 Convert to DataFrame
    feature_df = pd.DataFrame(feature_data, columns=["sentiment_score", "contains_promo_words", "contains_sarcasm_words", "days_since_review"])

    # 🔹 Ensure Feature Names Match Training Data
    expected_features = ["sentiment_score", "contains_promo_words", "contains_sarcasm_words", "days_since_review"]

    # ✅ Check If Features Match Training Data
    print(f"🛠 Expected Features: {expected_features}")
    print(f"📌 Model Features: {fake_review_model.feature_names}")

    # 🔹 Fix Feature Mismatch
    feature_df = feature_df[expected_features]  # Ensure only relevant features are used

    # 🔹 Convert to DMatrix for XGBoost
    dtest = xgb.DMatrix(feature_df)

    # 🔹 Predict Fake Reviews
    predictions = fake_review_model.predict(dtest)
    predictions = (predictions > 0.5).astype(int)  # Convert probabilities to 0 (real) or 1 (fake)

    # 🔹 Separate Fake and Real Reviews
    real_reviews = [reviews[i] for i in range(len(reviews)) if predictions[i] == 0]  # 0 = Real
    fake_reviews = [reviews[i] for i in range(len(reviews)) if predictions[i] == 1]  # 1 = Fake

    print(f"✅ Real Reviews: {len(real_reviews)}")
    print(f"❌ Fake Reviews: {len(fake_reviews)}")

    return real_reviews, fake_reviews


def predict_review_rating(reviews):
    # 🔹 Ensure all reviews are strings
    flat_reviews = []
    for review in reviews:
        if isinstance(review, list):  
            flat_reviews.append(" ".join(str(r) for r in review))  # Convert list to string
        else:
            flat_reviews.append(str(review))  # Ensure it's a string

    # 🔹 Vectorize reviews
    transformed_reviews = vectorizer.transform(flat_reviews)  # Ensure proper format

    # 🔹 Convert to DMatrix for XGBoost
    dtest = xgb.DMatrix(transformed_reviews)

    # 🔹 Predict ratings
    pred_probs = review_model.predict(dtest)
    return np.argmax(pred_probs, axis=1) + 1  # Convert 0-4 back to 1-5 scale



def generate_summary(reviews):
    if not reviews:  # ✅ Ensure reviews exist before processing
        return "No reviews available to summarize."

    # ✅ Limit to first 5 reviews (to avoid long input)
    text_input = "Summarize these reviews:\n" + ". ".join(reviews[:5])

    try:
        summary = summarizer(
            text_input,
            max_length=150,  # ✅ Increase max_length to prevent truncation errors
            num_return_sequences=1,
            max_new_tokens=50  # ✅ Avoid exceeding token limits
        )
        return summary[0]["generated_text"]

    except IndexError as e:
        print(f"⚠️ GPT-2 IndexError: {e}")
        return "Error generating summary."


# ✅ Explain Predictions using LIME
@app.route("/explain_review", methods=["POST"])
def explain_review():
    review_text = request.json.get("review")
    def predict_proba(texts): return review_model.predict_proba(vectorizer.transform(texts))
    explanation = lime_explainer.explain_instance(review_text, predict_proba, num_features=10)
    return jsonify({"explanation": [{"word": word, "weight": weight} for word, weight in explanation.as_list()]})

# ✅ Search Shops for a Product
@app.route("/search_product", methods=["GET"])
# @jwt_required()
def search_product():
    product_name = request.args.get("product")
    if not product_name:
        return jsonify({"error": "Product name is required"}), 400

    # ✅ Fetch shops from Google Places API
    url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?query={product_name}+store&key={GOOGLE_API_KEY}"
    response = requests.get(url).json()

    if "error_message" in response:
        return jsonify({"error": response["error_message"]}), 500

    if "results" not in response or not response["results"]:
        return jsonify({"error": "No shops found"}), 404

    shops = []
    for place in response["results"]:
        shop = {
            "shop_name": place["name"],
            "address": place.get("formatted_address", "N/A"),
            "rating": float(place.get("rating", 0)),  # ✅ Convert NumPy float to Python float
            "place_id": place["place_id"],
            "lat": float(place["geometry"]["location"]["lat"]),
            "lng": float(place["geometry"]["location"]["lng"])
        }

        # ✅ Fetch reviews for each shop
        details_url = f"https://maps.googleapis.com/maps/api/place/details/json?placeid={shop['place_id']}&fields=reviews&key={GOOGLE_API_KEY}"
        details_response = requests.get(details_url).json()
        
        reviews = []
        if "result" in details_response and "reviews" in details_response["result"]:
            reviews = [review["text"] for review in details_response["result"]["reviews"]]

        if reviews:
            # ✅ Identify fake and real reviews
            real_reviews, real_reviews = detect_fake_reviews(reviews)

            # ✅ Compute overall rating from all real reviews
            overall_predicted_rating = predict_review_rating([" ".join(real_reviews)])[0] if real_reviews else 0
            
            # ✅ Generate summary from real reviews
            summary = generate_summary(real_reviews) if real_reviews else "No valid reviews available."

            shop["reviews"] = real_reviews  # Only real reviews (raw)
            shop["summary"] = summary
            shop["fake_reviews"] = real_reviews  # Fake reviews
            shop["predicted_rating"] = int(overall_predicted_rating)  # ✅ Single overall rating
        else:
            shop["reviews"] = []
            shop["summary"] = "No reviews available."
            shop["fake_reviews"] = []
            shop["predicted_rating"] = 0  # Default if no reviews available

        shops.append(shop)

    return jsonify({"shops": shops})




# ✅ Fetch Shop Reviews and Process Them
@app.route("/search_shop", methods=["GET"])
# @jwt_required()
def search_shop():
    shop_id = request.args.get("place_id")
    details_url = f"https://maps.googleapis.com/maps/api/place/details/json?placeid={shop_id}&fields=reviews&key={GOOGLE_API_KEY}"
    details_response = requests.get(details_url).json()
    print(details_response)

    if "result" not in details_response or "reviews" not in details_response["result"]:
        return jsonify({"error": "No reviews found"}), 404

    reviews = [review["text"] for review in details_response["result"]["reviews"]]

    # ✅ Remove Fake Reviews
    real_reviews = detect_fake_reviews(reviews)

    # ✅ Predict Ratings
    predicted_ratings = predict_review_rating(real_reviews)

    # ✅ Generate Summary
    summary = generate_summary(real_reviews)

    return jsonify({
        "reviews": [{"text": review, "predicted_rating": rating} for review, rating in zip(real_reviews, predicted_ratings)],
        "summary": summary
    })

# ✅ User Signup
@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    username = data["username"]
    password = bcrypt.generate_password_hash(data["password"]).decode("utf-8")

    cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, password))
    conn.commit()
    return jsonify({"message": "User registered successfully"}), 201

# ✅ User Login
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

# ✅ Run Flask App
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

