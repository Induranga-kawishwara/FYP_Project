import joblib
import numpy as np
import torch
from openai import OpenAI
import nltk
import shap
import pandas as pd

from transformers import AutoTokenizer, AutoModelForSequenceClassification
from lime.lime_text import LimeTextExplainer
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from afinn import Afinn
from config import Config

#  NLTK setup 
nltk.download("punkt", quiet=True)
nltk.download("averaged_perceptron_tagger", quiet=True)
nltk.download("vader_lexicon", quiet=True)

#  OpenAI client 
client = OpenAI(api_key=Config.GPT_API_KEY)

#  Load models & vectorizers 
BASE_PATH = "models/reviewPredictionModel/"
distilbert_tokenizer = AutoTokenizer.from_pretrained(BASE_PATH + "distilbert_model")
distilbert_model     = AutoModelForSequenceClassification.from_pretrained(BASE_PATH + "distilbert_model")
distilbert_model.eval()

xgb_model        = joblib.load(BASE_PATH + "xgb_hybrid_final.pkl")
tfidf_vectorizer = joblib.load(BASE_PATH + "tfidf_vect_refit.pkl")
scaler           = joblib.load(BASE_PATH + "scaler_refit.pkl")

#  Patch Booster.predict for SHAP compatibility 
booster = xgb_model.get_booster()
_orig_predict = booster.predict

def _patched_predict(data,
                     output_margin=False,
                     validate_features=True,
                     iteration_range=None,
                     **kwargs):
    if "ntree_limit" in kwargs:
        nt = kwargs.pop("ntree_limit")
        iteration_range = (0, nt)
    if iteration_range is None:
        iteration_range = (0, booster.num_boosted_rounds())
    return _orig_predict(
        data,
        output_margin=output_margin,
        validate_features=validate_features,
        iteration_range=iteration_range,
        **kwargs
    )

booster.predict = _patched_predict

#  Explainability setup ─
tree_explainer = shap.TreeExplainer(
    xgb_model,
    feature_perturbation="tree_path_dependent"
)
lime_explainer = LimeTextExplainer(class_names=[f"Rating {i}" for i in range(1, 6)])

sia = SentimentIntensityAnalyzer()
af  = Afinn()

#  Build feature_names list
bert_names   = [f"cls_{i}" for i in range(768)]
logit_names  = [f"logit_{i}" for i in range(1, 6)]
tfidf_names  = list(tfidf_vectorizer.get_feature_names_out())
src_name     = ["source_dummy"]
meta_names   = [
    "meta_token_count",
    "meta_exclamations",
    "meta_questions",
    "meta_vader_compound",
    "meta_adj_count",
    "meta_afinn_score",
]
feature_names = bert_names + logit_names + tfidf_names + src_name + meta_names
_FULL_DIM = len(feature_names)
assert _FULL_DIM == (
    768 + 5 + tfidf_vectorizer.get_feature_names_out().shape[0] + 1 + 6
)

#  Map to human-readable labels
pretty_names = {
    **{name: f"DistilBERT embedding #{i}" for i, name in enumerate(bert_names)},
    **{f"logit_{i}": f"P(model={i})" for i in range(1, 6)},
    **{name: f"word ‘{name.replace('tfidf_', '').replace('_', ' ’')}’" for name in tfidf_names},
    "source_dummy": "Review source (dummy)",
    "meta_token_count": "Number of words in review",
    "meta_exclamations": "Count of ‘!’",
    "meta_questions": "Count of ‘?’",
    "meta_vader_compound": "Overall sentiment score (VADER)",
    "meta_adj_count": "Number of adjectives",
    "meta_afinn_score": "Sentiment score (Afinn)"
}

#  GPT Summary Function 
def generate_gpt_summary(raw_text: str,
                         instruction: str = "Summarize this:",
                         max_tokens: int = 200) -> str:
    try:
        resp = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": instruction},
                {"role": "user",   "content": raw_text}
            ],
            max_tokens=max_tokens,
            temperature=0.7
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        return f"GPT summarization failed: {e}"

#  Build XAI explanation prompt 
def build_explanation_prompt(raw_explanation: str,
                             review: str,
                             predicted_rating: float) -> str:
    return (
        f"You are a shopping assistant. This shop was predicted to have an average rating of {predicted_rating:.1f} out of 5.\n\n"
        "Here are the top feature contributions:\n"
        f"{raw_explanation}\n\n"
        "And here is one of the actual customer reviews:\n"
        f"\"{review.strip()}\"\n\n"
        "Please explain—using simple, customer-friendly language—how each of the top words in the review raised or lowered the score."
    )

#  Meta-features 
def compute_meta_features(text: str) -> np.ndarray:
    tokens = nltk.word_tokenize(text)
    tagged = nltk.pos_tag(tokens)
    return np.array([[
        len(tokens),
        text.count("!"),
        text.count("?"),
        sia.polarity_scores(text)["compound"],
        sum(tag.startswith("JJ") for _, tag in tagged),
        af.score(text)
    ]], dtype=np.float32)

#  Combine features 
def get_combined_features(text: str) -> np.ndarray:
    try:
        inputs = distilbert_tokenizer(
            text, return_tensors="pt",
            truncation=True, padding=True, max_length=256
        )
        with torch.no_grad():
            out     = distilbert_model(**inputs, output_hidden_states=True)
            cls_emb = out.hidden_states[-1][:,0,:].cpu().numpy()
            logits  = torch.softmax(out.logits, dim=-1).cpu().numpy()

        tfidf = tfidf_vectorizer.transform([text]).toarray().astype(np.float32)
        meta = compute_meta_features(text)
        meta_scaled = scaler.transform(meta)
        src_enc = np.zeros((1,1), dtype=np.float32)

        combined = np.hstack([cls_emb, logits, tfidf, src_enc, meta_scaled])
        return np.nan_to_num(combined, nan=0.0, posinf=0.0, neginf=0.0)
    except Exception as e:
        print(f"Feature extraction failed: {e}")
        return np.zeros((1, _FULL_DIM), dtype=np.float32)

#  Rating prediction 
def predict_review_rating(reviews: list[str]) -> tuple[np.ndarray, np.ndarray]:
    try:
        X = np.vstack([get_combined_features(r) for r in reviews])
        nr = booster.num_boosted_rounds()
        probs = xgb_model.predict_proba(X, iteration_range=(0, nr))
        ratings = np.dot(probs, np.arange(1, 6))
        return ratings, probs
    except Exception as e:
        print(f"Prediction failed: {e}")
        n = len(reviews)
        return np.zeros(n), np.zeros((n, 5))

#  Explanations 
def get_explanations(review: str) -> dict:
    df_feats = pd.DataFrame(get_combined_features(review).astype(np.float32), columns=feature_names)
    out = {"shap_full": [], "shap_top": [], "lime": [], "error": None}

    try:
        sv = tree_explainer.shap_values(df_feats)
        _, p = predict_review_rating([review])
        cls = int(np.argmax(p[0]))
        arr = sv[cls][0]
        idx = np.argsort(np.abs(arr))[::-1][:8]
        out["shap_top"] = [
            {"feature": pretty_names[feature_names[i]], "value": float(arr[i])}
            for i in idx
        ]
    except Exception as e:
        out["error"] = f"SHAP failed: {e}"

    try:
        def _lm(texts: list[str]) -> np.ndarray:
            return xgb_model.predict_proba(np.vstack([get_combined_features(t) for t in texts]))
        le = lime_explainer.explain_instance(review, _lm, num_features=6, num_samples=150)
        out["lime"] = le.as_list()
    except Exception as e:
        out["error"] = out.get("error") or str(e)
    print(out)    

    return out

#  Combined predict + explain 
def predict_review_rating_with_explanations(reviews: list[str]) -> dict:
    if not reviews:
        return {"predicted_rating": 0.0, "ratings": [], "user_friendly_explanation": "No reviews provided.", "raw_explanation": ""}

    ratings, _ = predict_review_rating(reviews)
    avg = round(np.mean(ratings), 2)
    ex = get_explanations(reviews[0])
    raw = "SHAP top contributions: " + " ".join( f"{d['feature']} {'+' if d['value']>0 else '-'}{abs(d['value']):.2f}" for d in ex['shap_top']) + "LIME top features:" + "".join(
        f"{t} {'+' if v>0 else '-'}{abs(v):.2f}" for t, v in ex['lime']
    )
    prompt = build_explanation_prompt(raw, reviews[0], avg)
    user_txt = generate_gpt_summary(prompt, max_tokens=200)

    return {
        "predicted_rating": avg,
        "ratings": ratings.tolist(),
        "user_friendly_explanation": user_txt,
    }

#  Review summary 
def generate_summary(reviews: list[str]) -> str:
    if not reviews:
        return "No reviews."

    review_blob = "".join(f"- {r.strip()}" for r in reviews)
    instruction = ("You are a helpful assistant. Here is a list of customer reviews:"f"{review_blob}"
        "Summarize what customers liked and disliked in a short, friendly paragraph. "
        "Avoid using '**Pros:**' or '**Cons:**' and bullet points. Instead, write one clear paragraph that highlights both positive and negative feedback (if any). "
        "Keep it brief but informative."
    )

    return generate_gpt_summary(review_blob, instruction=instruction, max_tokens=200)
