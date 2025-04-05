import os
import json
from dotenv import load_dotenv

load_dotenv()

class Config:
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    MONGO_DATABASE = os.getenv("MONGO_DATABASE")
    FIREBASE_SERVICE_ACCOUNT = json.loads(os.getenv("FIREBASE_SERVICE_ACCOUNT", "{}"))
    GOOGLE_API_KEY_FIREBASE = os.getenv("GOOGLE_API_KEY_FIREBASE")
    BREVO_API_KEY = os.getenv("BREVO_API_KEY")
    EMAIL_FROM = os.getenv("EMAIL_FROM")