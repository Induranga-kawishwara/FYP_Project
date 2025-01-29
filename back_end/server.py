# ✅ Import Required Libraries
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token, jwt_required, JWTManager, get_jwt_identity
import joblib
import pandas as pd
import googlemaps
import re
import string
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
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
GOOGLE_API_KEY = "YOUR_GOOGLE_API_KEY"
gmaps = googlemaps.Client(key=GOOGLE_API_KEY)

# ✅ Load Pretrained Models
review_model = joblib.load("fakeReview_model/best_xgboost_model.pkl")
fake_review_model = joblib.load("reviewPrediction_models/xgboost_fakereview_model.pkl")
vectorizer = joblib.load("reviewPrediction_models/tfidf_vectorizer.pkl")

# ✅ Load GPT-2 for Review Summarization
summarizer = pipeline("text-generation", model="gpt2")

# ✅ Load LIME Explainer
lime_explainer = lime.lime_text.LimeTextExplainer(class_names=["1-star", "2-star", "3-star", "4-star", "5-star"])

# ✅ Initialize Text Preprocessing
lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words("english"))

def preprocess_text(text):
    """Clean and preprocess text data for XGBoost."""
    text = text.lower()  # Convert to lowercase
    text = re.sub(r"\d+", "", text)  # Remove numbers
    text = text.translate(str.maketrans("", "", string.punctuation))  # Remove punctuation
    words = text.split()
    words = [word for word in words if word not in stop_words or word in ["not", "bad", "never", "no", "worst", "poor"]]
    words = [lemmatizer.lemmatize(word) for word in words]  # Lemmatization
    return " ".join(words)

# ✅ Fake Review Detection
def detect_fake_reviews(reviews):
    transformed_reviews = vectorizer.transform(reviews)
    predictions = fake_review_model.predict(transformed_reviews)
    return [review for review, pred in zip(reviews, predictions) if pred == 0]

# ✅ Review Prediction
def predict_review_rating(reviews):
    transformed_reviews = vectorizer.transform(reviews)
    dtest = xgb.DMatrix(transformed_reviews)
    pred_probs = review_model.predict(dtest)
    return np.argmax(pred_probs, axis=1) + 1  # Convert 0-4 back to 1-5 scale

# ✅ Generate Summary using GPT-2
def generate_summary(reviews):
    text_input = "Summarize these reviews:\n" + ". ".join(reviews[:5])
    summary = summarizer(text_input, max_length=100, num_return_sequences=1)
    return summary[0]["generated_text"]

# ✅ Explain Predictions using LIME
@app.route("/explain_review", methods=["POST"])
def explain_review():
    review_text = request.json.get("review")
    def predict_proba(texts): return review_model.predict_proba(vectorizer.transform(texts))
    explanation = lime_explainer.explain_instance(review_text, predict_proba, num_features=10)
    return jsonify({"explanation": [{"word": word, "weight": weight} for word, weight in explanation.as_list()]})

# ✅ Search Shops for a Product
@app.route("/search_product", methods=["GET"])
@jwt_required()
def search_product():
    product_name = request.args.get("product")
    if not product_name:
        return jsonify({"error": "Product name is required"}), 400

    url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?query={product_name}+store&key={GOOGLE_API_KEY}"
    response = requests.get(url).json()

    shops = [{"shop_name": place["name"], "address": place.get("formatted_address", "N/A"), "rating": place.get("rating", "No Rating"),
              "place_id": place["place_id"], "lat": place["geometry"]["location"]["lat"], "lng": place["geometry"]["location"]["lng"]}
             for place in response["results"]]

    return jsonify({"shops": shops})

# ✅ Fetch Shop Reviews and Process Them
@app.route("/search_shop", methods=["GET"])
@jwt_required()
def search_shop():
    shop_id = request.args.get("place_id")
    details_url = f"https://maps.googleapis.com/maps/api/place/details/json?placeid={shop_id}&fields=reviews&key={GOOGLE_API_KEY}"
    details_response = requests.get(details_url).json()

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
    app.run(debug=True)
