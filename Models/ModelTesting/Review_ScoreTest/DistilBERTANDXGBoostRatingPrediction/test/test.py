from pathlib import Path
import joblib
import numpy as np
import torch
import nltk

from transformers import AutoTokenizer, AutoModelForSequenceClassification
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from afinn import Afinn

# 1. NLTK setup (once)
nltk.download("punkt", quiet=True)
nltk.download("averaged_perceptron_tagger", quiet=True)
nltk.download("vader_lexicon", quiet=True)

# 2. Paths & model loading
BASE_PATH = Path(
    r"C:\Users\indur\OneDrive - University of Westminster\GitHub\FYP_Project\back_end\models\reviewPredictionModel"
)
bert_dir = BASE_PATH / "distilbert_model"

# sanity check
if not bert_dir.is_dir():
    raise FileNotFoundError(f"Could not find your model folder at:\n  {bert_dir}")

# force local-only loading
tokenizer  = AutoTokenizer.from_pretrained(str(bert_dir), local_files_only=True)
bert_model = AutoModelForSequenceClassification.from_pretrained(
    str(bert_dir), local_files_only=True
)
bert_model.eval()

xgb_model  = joblib.load(BASE_PATH / "xgb_hybrid_final.pkl")
tfidf_vect = joblib.load(BASE_PATH / "tfidf_vect_refit.pkl")
scaler     = joblib.load(BASE_PATH / "scaler_refit.pkl")

# 3. Helpers for meta‐features
sia = SentimentIntensityAnalyzer()
af  = Afinn()

def compute_meta(text: str) -> np.ndarray:
    tokens = nltk.word_tokenize(text)
    tags   = nltk.pos_tag(tokens)
    return np.array([[  
        len(tokens),
        text.count("!"),
        text.count("?"),
        sia.polarity_scores(text)["compound"],
        sum(tag.startswith("JJ") for _, tag in tags),
        af.score(text)
    ]], dtype=np.float32)

# 4. Build the full 1×D feature vector
def extract_features(text: str) -> np.ndarray:
    # BERT CLS embedding + softmax logits
    inputs  = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=256)
    with torch.no_grad():
        out      = bert_model(**inputs, output_hidden_states=True)
        cls_emb  = out.hidden_states[-1][:, 0, :].cpu().numpy()      
        probs    = torch.softmax(out.logits, dim=-1).cpu().numpy()    

    # TF-IDF
    tfidf_arr = tfidf_vect.transform([text]).toarray().astype(np.float32)

    # meta-features
    meta      = compute_meta(text)
    meta_s    = scaler.transform(meta)

    # dummy source
    src       = np.zeros((1,1), dtype=np.float32)

    return np.hstack([cls_emb, probs, tfidf_arr, src, meta_s])

# 5. Predict ratings from a list of reviews
def predict_ratings(reviews: list[str]) -> np.ndarray:
    X       = np.vstack([extract_features(r) for r in reviews])
    probs   = xgb_model.predict_proba(X)
    ratings = np.dot(probs, np.arange(1, 6))
    return ratings

# ── Example usage ──
if __name__ == "__main__":
    reviews = [
        "very poor customer service",
        "very clean environment and they provide good service",
    ]
    ratings = predict_ratings(reviews)
    for review, score in zip(reviews, ratings):
        print(f"{score:.2f}  — \"{review}\"")
