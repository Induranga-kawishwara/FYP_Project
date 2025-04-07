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
import matplotlib.pyplot as plt
import nltk
from nltk.corpus import stopwords

# Download NLTK resources if not already available
nltk.download("stopwords")
nltk.download("wordnet")
nltk.download("omw-1.4")

# -------------------------------
# 1) Load Pre-trained Models and Vectorizer
# -------------------------------

# Load the TF-IDF vectorizer (trained previously)
tfidf_vectorizer_path = "models/reviewPredictionModel/tfidf_vectorizer.pkl"
vectorizer = joblib.load(tfidf_vectorizer_path)
vocab = vectorizer.get_feature_names_out()
print("TF-IDF vocabulary size:", len(vocab))

# Load the XGBoost hybrid model (saved as JSON)
xgb_model_path = "models/reviewPredictionModel/xgb_hybrid.json"
xgb_model = xgb.Booster()
xgb_model.load_model(xgb_model_path)

# Patch XGBoost predict to remove 'ntree_limit' and disable feature validation.
old_predict = xgb_model.predict
def new_predict(data, **kwargs):
    kwargs.pop("ntree_limit", None)
    kwargs['validate_features'] = False
    return old_predict(data, **kwargs)
xgb_model.predict = new_predict

# Load the fine-tuned DistilBERT model and tokenizer
distilbert_model_path = "models/reviewPredictionModel/distilbert_model"
distilbert_model = AutoModelForSequenceClassification.from_pretrained(distilbert_model_path)
distilbert_tokenizer = AutoTokenizer.from_pretrained(distilbert_model_path)

# Load the BART summarization model and tokenizer (for user-friendly explanation)
summarization_model_name = "facebook/bart-large-cnn"
summarization_tokenizer = AutoTokenizer.from_pretrained(summarization_model_name)
summarization_model = AutoModelForSeq2SeqLM.from_pretrained(summarization_model_name)

# -------------------------------
# 2) Prepare Global Feature Metadata
# -------------------------------
# IMPORTANT: Use the same embedding extraction method as during training.
# Here we extract the CLS token from the last hidden state.
embedding_dim = distilbert_model.config.hidden_size  # e.g., typically 768 for DistilBERT
expected_combined_dim = embedding_dim + len(vocab)
print("Expected combined feature vector dimension:", expected_combined_dim)

# Build combined feature names: first for DistilBERT embeddings, then for TF-IDF tokens.
combined_feature_names = [f"distilbert_feature_{i+1}" for i in range(embedding_dim)] + list(vocab)
xgb_model.feature_names = combined_feature_names

# -------------------------------
# 3) Set Up Explainers
# -------------------------------
lime_explainer = LimeTextExplainer(
    class_names=["Rating 1", "Rating 2", "Rating 3", "Rating 4", "Rating 5"]
)
shap_explainer = shap.TreeExplainer(xgb_model)

# -------------------------------
# 4) Define Helper Functions
# -------------------------------

def get_distilbert_embeddings(text_list, tokenizer, model):
    """
    Extracts the CLS token from the last hidden state for a list of texts.
    """
    model.eval()
    inputs = tokenizer(text_list, padding=True, truncation=True, max_length=256, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs, output_hidden_states=True, return_dict=True)
        cls_embeddings = outputs.hidden_states[-1][:, 0, :].cpu().numpy()
    return cls_embeddings

def get_combined_features(review_text):
    """
    Creates the combined feature vector by concatenating DistilBERT embeddings and TF-IDF features.
    """
    embeddings = get_distilbert_embeddings([review_text], distilbert_tokenizer, distilbert_model)
    tfidf_features = vectorizer.transform([review_text]).toarray()
    combined = np.hstack([embeddings, tfidf_features])
    print("Computed combined feature vector shape:", combined.shape)
    if combined.shape[1] != expected_combined_dim:
        raise ValueError(f"Mismatch in combined feature dimension: expected {expected_combined_dim}, got {combined.shape[1]}.")
    return combined

def predict_for_lime(texts):
    """
    Predicts probability distributions for a list of texts (for use with LIME).
    """
    embeddings = get_distilbert_embeddings(texts, distilbert_tokenizer, distilbert_model)
    tfidf_features = vectorizer.transform(texts).toarray()
    combined_features = np.hstack([embeddings, tfidf_features])
    dtest = xgb.DMatrix(combined_features)
    pred_probs = xgb_model.predict(dtest, validate_features=False)
    return pred_probs

def get_explanations_for_review(review):
    """
    Generates raw LIME and SHAP explanations for a given review.
    """
    max_chars = 1000
    review_trimmed = review if len(review) <= max_chars else review[:max_chars]
    
    # Generate LIME explanation.
    try:
        lime_exp = lime_explainer.explain_instance(
            review_trimmed,
            predict_for_lime,
            num_features=10,
            num_samples=500
        )
        lime_explanation = lime_exp.as_list()
    except ValueError as e:
        lime_explanation = [("LIME explanation unavailable: " + str(e), 0)]
    
    # Generate SHAP explanation.
    features = get_combined_features(review_trimmed)
    shap_vals = shap_explainer.shap_values(features)
    if isinstance(shap_vals, list):
        shap_vals = shap_vals[0]
    shap_vals = shap_vals[0]
    shap_explanation = [{"feature": combined_feature_names[i], "shap_value": float(val)}
                        for i, val in enumerate(shap_vals)]
    
    return {"lime": lime_explanation, "shap": shap_explanation}

def format_shap_explanation(shap_explanation, top_n=5):
    """
    Converts the raw SHAP explanation into a plain language summary.
    """
    sorted_feats = sorted(shap_explanation, key=lambda x: abs(x["shap_value"]), reverse=True)
    top_feats = sorted_feats[:top_n]
    lines = []
    for feat in top_feats:
        direction = "increased" if feat["shap_value"] > 0 else "decreased"
        lines.append(f"'{feat['feature']}' {direction} the rating by about {abs(feat['shap_value']):.2f} points.")
    return "SHAP Summary:\n" + "\n".join(lines)

def format_lime_explanation(lime_explanation, top_n=5):
    """
    Converts the raw LIME explanation into a plain language summary.
    """
    sorted_feats = sorted(lime_explanation, key=lambda x: abs(x[1]), reverse=True)
    top_feats = sorted_feats[:top_n]
    lines = []
    for feat, weight in top_feats:
        direction = "increased" if weight > 0 else "decreased"
        lines.append(f"'{feat}' {direction} the rating by approximately {abs(weight):.2f} units.")
    return "LIME Summary:\n" + "\n".join(lines)

def generate_user_friendly_explanation(raw_explanation, max_length=150):
    """
    Uses the BART summarization model to generate a user-friendly natural language explanation.
    """
    prompt = "Summarize this explanation in plain language: " + raw_explanation
    inputs = summarization_tokenizer.encode(prompt, return_tensors="pt", max_length=512, truncation=True)
    summary_ids = summarization_model.generate(inputs, max_length=max_length, min_length=50, num_beams=4, early_stopping=True)
    return summarization_tokenizer.decode(summary_ids[0], skip_special_tokens=True)

def predict_review_rating_with_explanations(reviews):
    """
    Given a list of reviews, predict the overall rating (weighted) and return both raw and user-friendly explanations.
    """
    if not reviews:
        return {"predicted_rating": 0.0, "explanations": []}
    
    embeddings = get_distilbert_embeddings(reviews, distilbert_tokenizer, distilbert_model)
    tfidf_features = vectorizer.transform(reviews).toarray()
    combined_features = np.hstack([embeddings, tfidf_features])
    dtest = xgb.DMatrix(combined_features)
    pred_probs = xgb_model.predict(dtest, validate_features=False)
    weighted_ratings = np.sum(pred_probs * np.arange(1, 6), axis=1)
    avg_rating = np.mean(weighted_ratings)
    
    explanations = []
    for review in reviews:
        raw_exp = get_explanations_for_review(review)
        shap_summary = format_shap_explanation(raw_exp["shap"], top_n=5)
        lime_summary = format_lime_explanation(raw_exp["lime"], top_n=5)
        combined_raw = shap_summary + "\n" + lime_summary
        user_friendly = generate_user_friendly_explanation(combined_raw)
        explanations.append({
            "review": review,
            "raw_explanation": combined_raw,
            "user_friendly_explanation": user_friendly
        })
    
    return {"predicted_rating": round(avg_rating, 2), "explanations": explanations}

def classify_reviews_by_rating(reviews):
    """
    Classify reviews into positive, neutral, and negative based on predicted ratings.
    Returns lists of reviews and aggregated rating metrics.
    """
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
    pred_probs = xgb_model.predict(dtest, validate_features=False)
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
    Generate a detailed summary from reviews using the summarization model,
    along with aggregated rating information.
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
    
    inputs = summarization_tokenizer.encode("summarize: " + combined_text, return_tensors="pt", max_length=1024, truncation=True)
    summary_ids = summarization_model.generate(inputs, max_length=1024, min_length=100, length_penalty=1.0, num_beams=4, early_stopping=False)
    summary = summarization_tokenizer.decode(summary_ids[0], skip_special_tokens=True)
    summary = summary.replace("I ", "Some users ").replace("We ", "Many users ").replace("My ", "Their ").replace("Our ", "The product's ")
    return {
        "detailed_summary": summary.strip(),
        "average_rating": round(avg_rating, 2),
        "weighted_average_rating": round(weighted_avg, 2),
        "most_common_rating": majority_rating
    }
