import joblib
import numpy as np
import torch
import openai
import nltk
import shap

from transformers import AutoTokenizer, AutoModelForSequenceClassification
from lime.lime_text import LimeTextExplainer
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from afinn import Afinn
from config import Config

# Setup
nltk.download("punkt")
nltk.download("averaged_perceptron_tagger")
nltk.download("vader_lexicon")
openai.api_key = Config.GPT_API_KEY

BASE_PATH = "models/reviewPredictionModel/"

# Load models
distilbert_tokenizer = AutoTokenizer.from_pretrained(BASE_PATH + "distilbert_model")
distilbert_model = AutoModelForSequenceClassification.from_pretrained(BASE_PATH + "distilbert_model")
distilbert_model.eval()

xgb_model = joblib.load(BASE_PATH + "xgb_hybrid_final.pkl")
tfidf_vectorizer = joblib.load(BASE_PATH + "tfidf_vect_refit.pkl")
scaler = joblib.load(BASE_PATH + "scaler_refit.pkl")

# Utilities
lime_explainer = LimeTextExplainer(class_names=["Rating 1", "Rating 2", "Rating 3", "Rating 4", "Rating 5"])
shap_explainer = shap.Explainer(xgb_model)

sia = SentimentIntensityAnalyzer()
af = Afinn()

# GPT Summarizer
def generate_gpt_summary(raw_text, instruction="Summarize this:", max_tokens=200):
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": instruction},
                {"role": "user", "content": raw_text}
            ],
            max_tokens=max_tokens,
            temperature=0.7
        )
        return response.choices[0].message["content"].strip()
    except Exception as e:
        return f"GPT summarization failed: {e}"

# Meta Feature Extractor
def compute_meta_features(text):
    tokens = nltk.word_tokenize(text)
    tagged = nltk.pos_tag(tokens)
    return np.array([[len(tokens),
                      text.count("!"),
                      text.count("?"),
                      sia.polarity_scores(text)["compound"],
                      sum(tag.startswith("JJ") for _, tag in tagged),
                      af.score(text)]], dtype=np.float32)

# Full Feature Vector
def get_combined_features(text, source="UNK"):
    inputs = distilbert_tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=256)
    with torch.no_grad():
        output = distilbert_model(**inputs, output_hidden_states=True)
        cls_embedding = output.hidden_states[-1][:, 0, :].cpu().numpy()
        logits = torch.softmax(output.logits, dim=-1).cpu().numpy()

    tfidf = tfidf_vectorizer.transform([text]).toarray().astype(np.float32)
    meta = compute_meta_features(text)
    meta_scaled = scaler.transform(meta)
    source_encoded = np.array([[0]], dtype=np.float32)

    return np.hstack([cls_embedding, logits, tfidf, source_encoded, meta_scaled])

# Core Prediction
def predict_review_rating(reviews):
    feature_stack = np.vstack([get_combined_features(r) for r in reviews])
    probs = xgb_model.predict_proba(feature_stack) 
    ratings = np.dot(probs, np.arange(1, 6))
    return ratings, probs

# Explain Single Review
def get_explanations(review):
    features = get_combined_features(review)
    shap_values = shap_explainer(features)
    top_shap = sorted([{
        "feature": f"f{i}", "value": float(v)
    } for i, v in enumerate(shap_values.values[0])],
        key=lambda x: abs(x["value"]), reverse=True)[:5]

    try:
        lime_exp = lime_explainer.explain_instance(
            review,
            lambda x: np.vstack([predict_review_rating([t])[1][0] for t in x]),
            num_features=10,
            num_samples=100
        )
        lime_summary = lime_exp.as_list()
    except Exception as e:
        lime_summary = [("LIME error", str(e))]

    return {"shap": top_shap, "lime": lime_summary}

# Prediction + Explanation + GPT Summary
def predict_review_rating_with_explanations(reviews):
    if not reviews:
        return {
            "predicted_rating": 0.0,
            "user_friendly_explanation": "No review provided.",
            "raw_explanation": "N/A"
        }

    ratings, _ = predict_review_rating(reviews)
    avg_rating = round(np.mean(ratings), 2)

    all_shap, all_lime = [], []
    for review in reviews:
        exp = get_explanations(review)
        shap_lines = [
            f"{e['feature']} contributed {'+' if e['value'] > 0 else '-'}{abs(e['value']):.2f}"
            for e in exp["shap"]
        ]
        lime_lines = [
            f"{term} contributed {'+' if val > 0 else '-'}{abs(val):.2f}"
            for term, val in exp["lime"]
        ]
        all_shap.append("\n".join(shap_lines))
        all_lime.append("\n".join(lime_lines))

    full_explanation = (
        "SHAP Explanations:\n" + "\n\n".join(all_shap) +
        "\n\nLIME Explanations:\n" + "\n\n".join(all_lime)
    )

    gpt_summary = generate_gpt_summary(
        full_explanation,
        instruction="Explain this LIME and SHAP output so a non-technical user can understand why the review got its score."
    )

    return {
        "predicted_rating": avg_rating,
        "user_friendly_explanation": gpt_summary,
        "raw_explanation": full_explanation
    }

# Summary Generator
def generate_summary(reviews):
    if not reviews:
        return "No reviews provided."

    ratings, _ = predict_review_rating(reviews)
    positive, neutral, negative = [], [], []

    for i, r in enumerate(ratings):
        if r >= 4.0:
            positive.append(reviews[i])
        elif r <= 2.0:
            negative.append(reviews[i])
        else:
            neutral.append(reviews[i])

    raw_summary_parts = []
    if positive:
        raw_summary_parts.append(f"{len(positive)} positive reviews: " + " | ".join(positive[:2]) + "...")
    if neutral:
        raw_summary_parts.append(f"{len(neutral)} neutral reviews: " + " | ".join(neutral[:2]) + "...")
    if negative:
        raw_summary_parts.append(f"{len(negative)} negative reviews: " + " | ".join(negative[:2]) + "...")

    raw_summary = "\n".join(raw_summary_parts)

    return generate_gpt_summary(
        raw_summary,
        instruction="Rewrite this product review summary in plain English for a customer dashboard."
    )
