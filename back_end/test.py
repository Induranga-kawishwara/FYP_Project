import joblib
import torch
import numpy as np
import xgboost as xgb
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import shap
import matplotlib.pyplot as plt

# 1) Load DistilBERT model and tokenizer from your 'distilbert_model' folder
distilbert_model_path = "models/reviewPredictionModel/distilbert_model"
distilbert_model = AutoModelForSequenceClassification.from_pretrained(distilbert_model_path)
distilbert_tokenizer = AutoTokenizer.from_pretrained(distilbert_model_path)

# 2) Load the TF-IDF vectorizer
tfidf_vectorizer_path = "models/reviewPredictionModel/tfidf_vectorizer.pkl"
vectorizer = joblib.load(tfidf_vectorizer_path)
print("TF-IDF vocabulary size:", len(vectorizer.get_feature_names_out()))

# 3) Load the XGBoost model
xgb_model_path = "models/reviewPredictionModel/xgb_hybrid.json"
xgb_model = xgb.Booster()
xgb_model.load_model(xgb_model_path)

# Patch XGBoost predict method to remove 'ntree_limit'
old_predict = xgb_model.predict
def new_predict(data, **kwargs):
    kwargs.pop("ntree_limit", None)
    return old_predict(data, **kwargs)
xgb_model.predict = new_predict

# Example text(s) to predict on
texts = [
    "The food was amazing and the service was great!",
    "I did not enjoy the meal; it was cold and tasteless."
]

# Helper function to get DistilBERT embeddings (CLS outputs)
def get_distilbert_embeddings(text_list, tokenizer, model):
    model.eval()
    inputs = tokenizer(text_list, padding=True, truncation=True, max_length=256, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs, output_hidden_states=True, return_dict=True)
        cls_embeddings = outputs.hidden_states[-1][:, 0, :].cpu().numpy()
    return cls_embeddings

# 4) Compute DistilBERT embeddings
distilbert_embeddings = get_distilbert_embeddings(texts, distilbert_tokenizer, distilbert_model)
print("DistilBERT embeddings shape:", distilbert_embeddings.shape)

# 5) Transform texts into TF-IDF features
tfidf_features = vectorizer.transform(texts).toarray()
print("TF-IDF features shape:", tfidf_features.shape)

# 6) Combine DistilBERT embeddings + TF-IDF
combined_features = np.hstack([distilbert_embeddings, tfidf_features])
print("Combined feature shape:", combined_features.shape)

# 7) OPTIONAL: Check that the shape matches your training configuration.
#    For example, if DistilBERT embedding_dim=768 and TFIDF_MAX_FEATURES=5000, then expect 5768 columns.

# 8) Create SHAP explainer
# Create combined feature names: first names for DistilBERT embeddings, then for TF-IDF tokens.
embedding_dim = distilbert_embeddings.shape[1]
tfidf_feature_names = vectorizer.get_feature_names_out()
combined_feature_names = [f"distilbert_feature_{i+1}" for i in range(embedding_dim)] + list(tfidf_feature_names)

# Initialize the SHAP TreeExplainer using the patched XGBoost model.
shap_explainer = shap.TreeExplainer(xgb_model)

# Compute SHAP values for the combined features.
shap_values = shap_explainer.shap_values(combined_features)

# Display a summary plot for the SHAP values.
shap.summary_plot(shap_values, features=combined_features, feature_names=combined_feature_names)

# 9) Make predictions with XGBoost
dtest = xgb.DMatrix(combined_features)
pred_probs = xgb_model.predict(dtest)
predictions = np.argmax(pred_probs, axis=1) + 1  # if originally [0..4], +1 gives [1..5]

# Print prediction results
for text, pred in zip(texts, predictions):
    print(f"Text: {text}\nPredicted rating: {pred}\n")
