import joblib
import numpy as np
import torch
from openai import OpenAI
import nltk
import shap

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

#  Full dimension constant 
_FULL_DIM = (
    768 +  # BERT CLS embedding
    5   +  # logits
    tfidf_vectorizer.get_feature_names_out().shape[0] +
    1   +  # dummy source
    6      # meta-features
)

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
    feats = get_combined_features(review).astype(np.float32)
    out = {"shap_full": [], "shap_top": [], "lime": [], "error": None}

    try:
        sv = tree_explainer.shap_values(feats)
        _, p = predict_review_rating([review])
        cls = int(np.argmax(p[0]))
        arr = sv[cls][0]
        out["shap_full"] = [float(v) for v in arr]
        idx = np.argsort(np.abs(arr))[::-1][:8]
        out["shap_top"] = [{"feature": int(i), "value": float(arr[i])} for i in idx]
    except Exception as e:
        out["error"] = f"SHAP failed: {e}"
    try:
        def _lm(texts: list[str]) -> np.ndarray:
            return xgb_model.predict_proba(np.vstack([get_combined_features(t) for t in texts]))
        le = lime_explainer.explain_instance(review, _lm, num_features=6, num_samples=150)
        out["lime"] = le.as_list()
    except Exception as e:
        out["error"] = out.get("error") or str(e)
    return out

#  Combined predict + explain 
def predict_review_rating_with_explanations(reviews: list[str]) -> dict:
    if not reviews:
        return {"predicted_rating": 0.0, "ratings": [], "user_friendly_explanation": "No reviews provided.", "raw_explanation": ""}

    ratings, _ = predict_review_rating(reviews)
    avg = round(np.mean(ratings), 2)
    # build raw explanation from first review
    ex = get_explanations(reviews[0])
    raw = "SHAP top contributions:\n" + "\n".join(
        f"feat_{d['feature']} {'+' if d['value']>0 else '-'}{abs(d['value']):.2f}" for d in ex['shap_top']
    ) + "\n\nLIME top features:\n" + "\n".join(
        f"{t} {'+' if v>0 else '-'}{abs(v):.2f}" for t, v in ex['lime']
    )
    # create user-friendly explanation
    prompt = build_explanation_prompt(raw, reviews[0], avg)
    user_txt = generate_gpt_summary(prompt, max_tokens=200)

    return {
        "predicted_rating": avg,
        "ratings": ratings.tolist(),
        "user_friendly_explanation": user_txt,
        "raw_explanation": raw
    }

#  Review summary 
def generate_summary(reviews: list[str]) -> str:
    if not reviews:
        return "No reviews."

    # bullet each review
    review_blob = "\n".join(f"- {r.strip()}" for r in reviews)
    instruction = (
        "You are a helpful assistant. Here is a list of customer reviews:\n"
        f"{review_blob}\n\n"
        "Please summarize in two sections:\n"
        "• Pros: list the main positive aspects of the shop as bullet points.\n"
        "• Cons: list the main negative aspects of the shop as bullet points."
    )
    return generate_gpt_summary(review_blob, instruction=instruction, max_tokens=200)
