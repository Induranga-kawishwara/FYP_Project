import joblib
import pandas as pd
import numpy as np
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, AutoModelForSeq2SeqLM, pipeline
import xgboost as xgb
import lime.lime_text

# --- Review Rating Prediction (Hybrid Model) ---
vectorizer = joblib.load("models/reviewPredictionModel/tfidf_vectorizer.pkl")
xgb_model = xgb.Booster()
xgb_model.load_model("models/reviewPredictionModel/xgb_hybrid.pkl")

distilbert_model = AutoModelForSequenceClassification.from_pretrained("models/reviewPredictionModel/distilbert_model")
distilbert_tokenizer = AutoTokenizer.from_pretrained("models/reviewPredictionModel/distilbert_model")

# --- BART for Review Summarization ---
summarization_model_name = "facebook/bart-large-cnn"
summarization_tokenizer = AutoTokenizer.from_pretrained(summarization_model_name)
summarization_model = AutoModelForSeq2SeqLM.from_pretrained(summarization_model_name)

# --- GPT-2 for Review Summarization (optional) ---
summarizer = pipeline("text-generation", model="gpt2")

# --- LIME Explainer (optional) ---
lime_explainer = lime.lime_text.LimeTextExplainer(class_names=["1-star", "2-star", "3-star", "4-star", "5-star"])

def predict_review_rating(reviews):
    if not reviews:
        return 0.0
    inputs = distilbert_tokenizer(reviews, padding=True, truncation=True, return_tensors="pt", max_length=256)
    with torch.no_grad():
        outputs = distilbert_model(**inputs)
        embeddings = outputs.logits.cpu().detach().numpy()
    tfidf_features = vectorizer.transform(reviews).toarray()
    combined_features = np.hstack([embeddings, tfidf_features])
    dtest = xgb.DMatrix(combined_features)
    pred_probs = xgb_model.predict(dtest)
    weighted_ratings = np.sum(pred_probs * np.arange(1, 6), axis=1)
    avg_rating = np.mean(weighted_ratings)
    return round(avg_rating, 2)

def classify_reviews_by_rating(reviews):
    if not reviews:
        return [], [], [], 0, 0, 0
    processed_reviews = [review.lower() for review in reviews]
    tfidf_reviews = vectorizer.transform(processed_reviews)
    inputs = distilbert_tokenizer(processed_reviews, padding=True, truncation=True, return_tensors="pt", max_length=256)
    with torch.no_grad():
        outputs = distilbert_model(**inputs)
        embeddings = outputs.logits.cpu().detach().numpy()
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
