import joblib
import pandas as pd
import numpy as np
import torch
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    AutoModelForSeq2SeqLM
)
import xgboost as xgb
from lime.lime_text import LimeTextExplainer
import shap
import nltk
import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)
# Download NLTK resources if not already available
nltk.download("stopwords")
nltk.download("wordnet")
nltk.download("omw-1.4")

# --- Load Pre-trained Models and Vectorizers ---

# TF-IDF vectorizer and XGBoost hybrid model for review prediction
vectorizer = joblib.load("models/reviewPredictionModel/tfidf_vectorizer.pkl")
xgb_model = xgb.Booster()
xgb_model.load_model("models/reviewPredictionModel/xgb_hybrid.pkl")

# DistilBERT model for sequence classification
distilbert_model = AutoModelForSequenceClassification.from_pretrained("models/reviewPredictionModel/distilbert_model")
distilbert_tokenizer = AutoTokenizer.from_pretrained("models/reviewPredictionModel/distilbert_model")

# BART model for summarization
summarization_model_name = "facebook/bart-large-cnn"
summarization_tokenizer = AutoTokenizer.from_pretrained(summarization_model_name)
summarization_model = AutoModelForSeq2SeqLM.from_pretrained(summarization_model_name)

# --- Set Up Explainers ---

# LIME explainer for text classification
lime_explainer = LimeTextExplainer(
    class_names=["Rating 1", "Rating 2", "Rating 3", "Rating 4", "Rating 5"]
)

# SHAP explainer for XGBoost model (tree-based explainer)
shap_explainer = shap.TreeExplainer(xgb_model)

# For SHAP explanations, we need to know the names of our combined features.
# Our combined feature vector consists of distilBERT outputs plus TF-IDF features.
# Here we assume that the distilBERT output has a dimension equal to the number of labels.
embedding_dim = distilbert_model.config.num_labels  # typically 5 for ratings 1-5
tfidf_feature_names = vectorizer.get_feature_names_out()
combined_feature_names = (
    [f"distilbert_feature_{i+1}" for i in range(embedding_dim)]
    + list(tfidf_feature_names)
)

# --- Helper Functions ---

def get_combined_features(review_text):
    """
    Creates the combined feature vector from the DistilBERT embeddings and TF-IDF features.
    """
    inputs = distilbert_tokenizer(
        [review_text],
        padding=True,
        truncation=True,
        return_tensors="pt",
        max_length=256
    )
    with torch.no_grad():
        outputs = distilbert_model(**inputs)
        embeddings = outputs.logits.cpu().detach().numpy()  # shape (1, num_labels)
    tfidf_features = vectorizer.transform([review_text]).toarray()  # shape (1, n_tfidf)
    combined = np.hstack([embeddings, tfidf_features])
    return combined

def predict_for_lime(texts):
    """
    Predicts probability distributions for the given list of texts.
    This function is used by the LIME explainer.
    """
    inputs = distilbert_tokenizer(
        texts,
        padding=True,
        truncation=True,
        return_tensors="pt",
        max_length=256
    )
    with torch.no_grad():
        outputs = distilbert_model(**inputs)
        embeddings = outputs.logits.cpu().detach().numpy()
    tfidf_features = vectorizer.transform(texts).toarray()
    combined_features = np.hstack([embeddings, tfidf_features])
    dtest = xgb.DMatrix(combined_features)
    # The model returns probabilities for each rating class (ratings 1-5)
    pred_probs = xgb_model.predict(dtest)
    return pred_probs

def get_explanations_for_review(review):
    """
    For a single review text, generate:
      - LIME explanation: a list of tuples (feature, weight)
      - SHAP explanation: a list of dictionaries mapping feature names to SHAP values
    """
    # Optionally, trim the review text if it's too long
    max_chars = 1000  # Adjust this value based on your needs
    review_trimmed = review if len(review) <= max_chars else review[:max_chars]
    
    # LIME explanation with reduced num_samples
    lime_exp = lime_explainer.explain_instance(
        review_trimmed,
        predict_for_lime,
        num_features=10,
        num_samples=500  # Reduced number of samples to lower memory usage
    )
    lime_explanation = lime_exp.as_list()

    # SHAP explanation: compute combined features and get SHAP values
    features = get_combined_features(review_trimmed)  # shape (1, d)
    shap_values = shap_explainer.shap_values(features)
    # Extract the first (and only) row of SHAP values
    shap_values = shap_values[0] if isinstance(shap_values, list) else shap_values[0]
    shap_explanation = []
    for i, val in enumerate(shap_values):
        shap_explanation.append({
            "feature": combined_feature_names[i],
            "shap_value": float(val)
        })

    return {"lime": lime_explanation, "shap": shap_explanation}


def predict_review_rating_with_explanations(reviews):
    """
    Given a list of review texts, this function predicts the overall rating (as in your hybrid model)
    and returns explanations for each review using LIME and SHAP.
    
    Returns a dictionary with:
      - "predicted_rating": Overall average rating (weighted) across the reviews.
      - "explanations": A list of explanation objects for each review.
    """
    if not reviews:
        return {
            "predicted_rating": 0.0,
            "explanations": []
        }
    # Create combined features for all reviews
    inputs = distilbert_tokenizer(
        reviews,
        padding=True,
        truncation=True,
        return_tensors="pt",
        max_length=256
    )
    with torch.no_grad():
        outputs = distilbert_model(**inputs)
        embeddings = outputs.logits.cpu().detach().numpy()
    tfidf_features = vectorizer.transform(reviews).toarray()
    combined_features = np.hstack([embeddings, tfidf_features])
    dtest = xgb.DMatrix(combined_features)
    pred_probs = xgb_model.predict(dtest)
    weighted_ratings = np.sum(pred_probs * np.arange(1, 6), axis=1)
    avg_rating = np.mean(weighted_ratings)
    
    # Generate explanations for each review individually
    explanations = []
    for review in reviews:
        exp = get_explanations_for_review(review)
        explanations.append({
            "review": review,
            "lime": exp["lime"],
            "shap": exp["shap"]
        })
    
    return {
        "predicted_rating": round(avg_rating, 2),
        "explanations": explanations
    }

def classify_reviews_by_rating(reviews):
    """
    Classifies reviews into positive, neutral, and negative based on predicted ratings.
    Returns a tuple with lists of reviews and various rating aggregates.
    """
    if not reviews:
        return [], [], [], 0, 0, 0
    processed_reviews = [review.lower() for review in reviews]
    tfidf_reviews = vectorizer.transform(processed_reviews)
    inputs = distilbert_tokenizer(
        processed_reviews,
        padding=True,
        truncation=True,
        return_tensors="pt",
        max_length=256
    )
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
    """
    Generates a detailed summary from the reviews using the summarization model.
    Also aggregates average and weighted ratings.
    """
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
    inputs = summarization_tokenizer.encode(
        "summarize: " + combined_text,
        return_tensors="pt",
        max_length=1024,
        truncation=True
    )
    summary_ids = summarization_model.generate(
        inputs,
        max_length=1024,
        min_length=100,
        length_penalty=1.0,
        num_beams=4,
        early_stopping=False
    )
    summary = summarization_tokenizer.decode(summary_ids[0], skip_special_tokens=True)
    # Replace pronouns for a more neutral summary
    summary = summary.replace("I ", "Some users ").replace("We ", "Many users ").replace("My ", "Their ").replace("Our ", "The product's ")
    return {
        "detailed_summary": summary.strip(),
        "average_rating": round(avg_rating, 2),
        "weighted_average_rating": round(weighted_avg, 2),
        "most_common_rating": majority_rating
    }