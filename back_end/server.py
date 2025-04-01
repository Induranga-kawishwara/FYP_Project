import time
import joblib
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import  JWTManager
import googlemaps
import numpy as np
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification, AutoModelForSeq2SeqLM, BertTokenizer, BertForSequenceClassification
import lime.lime_text
import xgboost as xgb
import requests
import google_map_scraper  
from dotenv import load_dotenv
import os
from tenacity import retry, wait_fixed, stop_after_attempt
import torch

# Load environment variables from .env file
load_dotenv()

# Download NLTK Resources
nltk.download("stopwords")
nltk.download("wordnet")
nltk.download("stopwords")

# Initialize Flask App
app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
jwt = JWTManager(app)
CORS(app)
bcrypt = Bcrypt(app)

# Load Google API Key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
gmaps = googlemaps.Client(key=GOOGLE_API_KEY)

# -------------------------------
# MODEL LOADING
# -------------------------------

# Fake Review Detection using BERT
fake_review_tokenizer = BertTokenizer.from_pretrained("models/fakeReviewModel")
fake_review_model = BertForSequenceClassification.from_pretrained("models/fakeReviewModel")
fake_review_model.eval()

# Review Rating Prediction (Hybrid Model)
vectorizer = joblib.load("models/reviewPredictionModel/tfidf_vectorizer.pkl")
xgb_model = xgb.Booster()  
xgb_model.load_model("models/reviewPredictionModel/xgb_hybrid.pkl") 

distilbert_model = AutoModelForSequenceClassification.from_pretrained("models/reviewPredictionModel/distilbert_model")
distilbert_tokenizer = AutoTokenizer.from_pretrained("models/reviewPredictionModel/distilbert_model")

# BART for Review Summarization
summarization_model_name = "facebook/bart-large-cnn"
summarization_tokenizer = AutoTokenizer.from_pretrained(summarization_model_name)
summarization_model = AutoModelForSeq2SeqLM.from_pretrained(summarization_model_name)

# GPT-2 for Review Summarization (optional)
summarizer = pipeline("text-generation", model="gpt2")

# LIME Explainer for review rating explainability (optional)
lime_explainer = lime.lime_text.LimeTextExplainer(class_names=["1-star", "2-star", "3-star", "4-star", "5-star"])

# Text Preprocessing Tools
lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words("english"))

# -------------------------------
# HELPER FUNCTIONS
# -------------------------------
@retry(wait=wait_fixed(2), stop=stop_after_attempt(3))
def get_google_response(url):
    response = requests.get(url, timeout=300)
    response.raise_for_status()
    return response.json()

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

# --- Fake Review Detection using BERT ---
def detect_fake_reviews(reviews):
    if not reviews:
        return [], []  # Return empty lists if no reviews
    inputs = fake_review_tokenizer(reviews, padding=True, truncation=True, return_tensors="pt", max_length=256)
    with torch.no_grad():
        outputs = fake_review_model(**inputs)
    predictions = torch.argmax(outputs.logits, dim=-1).tolist()
    real_reviews = [reviews[i] for i, label in enumerate(predictions) if label == 0]
    fake_reviews = [reviews[i] for i, label in enumerate(predictions) if label == 1]
    return real_reviews, fake_reviews

# --- Review Rating Prediction using Hybrid Model ---
def predict_review_rating(reviews):
    """Predicts review ratings and returns a weighted average rating (0.00 format)."""
    if not reviews:
        return 0.0
    inputs = distilbert_tokenizer(reviews, padding=True, truncation=True, return_tensors="pt", max_length=256)
    with torch.no_grad():
        outputs = distilbert_model(**inputs)
        embeddings = outputs.logits.cpu().detach().numpy()  # Corrected line
    tfidf_features = vectorizer.transform(reviews).toarray()
    combined_features = np.hstack([embeddings, tfidf_features])
    dtest = xgb.DMatrix(combined_features)
    pred_probs = xgb_model.predict(dtest)
    weighted_ratings = np.sum(pred_probs * np.arange(1, 6), axis=1)
    avg_rating = np.mean(weighted_ratings)
    return round(avg_rating, 2)


def classify_reviews_by_rating(reviews):
    """Classifies reviews into Positive, Neutral, and Negative using XGBoost predictions."""
    if not reviews:
        return [], [], [], 0, 0, 0
    processed_reviews = [review.lower() for review in reviews]
    tfidf_reviews = vectorizer.transform(processed_reviews)
    inputs = distilbert_tokenizer(processed_reviews, padding=True, truncation=True, return_tensors="pt", max_length=256)
    with torch.no_grad():
        outputs = distilbert_model(**inputs)
        # Get logits from the sequence classification output
        embeddings = outputs.logits.cpu().detach().numpy()  # Change here
    combined_features = np.hstack([embeddings, tfidf_reviews.toarray()])
    dtest = xgb.DMatrix(combined_features)
    pred_probs = xgb_model.predict(dtest)
    predicted_ratings = np.argmax(pred_probs, axis=1) + 1
    positive_reviews = [reviews[i] for i in range(len(reviews)) if predicted_ratings[i] >= 4]
    negative_reviews = [reviews[i] for i in range(len(reviews)) if predicted_ratings[i] <= 2]
    neutral_reviews = [reviews[i] for i in range(len(reviews)) if predicted_ratings[i] == 3]
    weighted_ratings = np.sum(pred_probs * np.arange(1, 6), axis=1)
    weighted_average_rating = np.mean(weighted_ratings)
    majority_rating = pd.Series(predicted_ratings).mode()[0]
    avg_rating = np.mean(predicted_ratings)
    return positive_reviews, neutral_reviews, negative_reviews, avg_rating, weighted_average_rating, majority_rating

def generate_summary(reviews):
    """Generates a complete, detailed summary of all provided reviews without cutting the content."""
    if not reviews:
        return {
            "detailed_summary": "No reviews available.",
            "average_rating": 0.00,
            "weighted_average_rating": 0.00,
            "most_common_rating": 0
        }
    pos_reviews, neutral_reviews, neg_reviews, avg_rating, weighted_avg, majority_rating = classify_reviews_by_rating(reviews)
    combined_text = ""
    if pos_reviews:
        combined_text += "Positive reviews include: " + " ".join(pos_reviews) + " "
    if neutral_reviews:
        combined_text += "Neutral reviews mention: " + " ".join(neutral_reviews) + " "
    if neg_reviews:
        combined_text += "Negative reviews state: " + " ".join(neg_reviews)
    inputs = summarization_tokenizer.encode("summarize: " + combined_text, return_tensors="pt", max_length=1024, truncation=True)
    summary_ids = summarization_model.generate(
        inputs,
        max_length=1024,
        min_length=100,
        length_penalty=1.0,
        num_beams=4,
        early_stopping=False
    )
    summary = summarization_tokenizer.decode(summary_ids[0], skip_special_tokens=True)
    summary = summary.replace("I ", "Some users ").replace("We ", "Many users ").replace("My ", "Their ").replace("Our ", "The product's ")
    return {
        "detailed_summary": summary.strip(),
        "average_rating": round(avg_rating, 2),
        "weighted_average_rating": round(weighted_avg, 2),
        "most_common_rating": majority_rating
    }

def fetch_all_shops(product_name, lat, lng, radius):
    base_url = "https://maps.googleapis.com/maps/api/place/textsearch/json?"
    shops = []
    next_page_token = None
    while True:
        url = f"{base_url}query={product_name} store near me&location={lat},{lng}&radius={radius}&type=store&key={GOOGLE_API_KEY}"
        if next_page_token:
            url += f"&pagetoken={next_page_token}"
            time.sleep(2)
        response = get_google_response(url)
        if "results" in response:
            shops.extend(response["results"])
        else:
            break
        next_page_token = response.get("next_page_token")
        if not next_page_token:
            break
    return shops

# -------------------------------
# API ROUTES
# -------------------------------

@app.route("/search_product", methods=["POST", "OPTIONS"])
def search_product():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    data = request.get_json()
    product_name = data.get("product")
    review_count = data.get("reviewCount")
    coverage = data.get("coverage")
    location = data.get("location")  # expects a dict with 'lat' and 'lng'
    if not product_name:
        return jsonify({"error": "Product name is required"}), 400
    if not location or not location.get("lat") or not location.get("lng"):
        return jsonify({"error": "User location is required"}), 400
    radius = int(coverage) * 1000  # Convert km to meters
    lat = location.get("lat")
    lng = location.get("lng")
    shops_results = fetch_all_shops(product_name, lat, lng, radius)
    if not shops_results:
        return jsonify({"error": "No shops found"}), 404
    shops = []
    for place in shops_results:
        shop = {
            "shop_name": place["name"],
            "address": place.get("formatted_address", "N/A"),
            "rating": float(place.get("rating", 0)),
            "place_id": place["place_id"],
            "lat": float(place["geometry"]["location"]["lat"]),
            "lng": float(place["geometry"]["location"]["lng"])
        }
        valid_reviews = google_map_scraper.scrape_reviews(shop["place_id"], review_count)
        if valid_reviews:
            combined_reviews = [" ".join([r["text"] for r in valid_reviews])]
            overall_predicted_rating = predict_review_rating(combined_reviews)
            summary = generate_summary(combined_reviews)
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



@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    username = data["username"]
    password = bcrypt.generate_password_hash(data["password"]).decode("utf-8")
    return jsonify({"message": "User registered successfully"}), 201

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data["username"]
    password = data["password"]
    return jsonify({"error": "Invalid credentials"}), 401

@app.route("/")
def home():
    return "Hello from Flask!"

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
