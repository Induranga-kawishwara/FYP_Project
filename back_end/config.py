import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
