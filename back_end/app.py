import firebase_admin
from firebase_admin import credentials
from config import Config
from flask import Flask
from flask_cors import CORS
from utils import CachedShop, ZeroReviewShop ,cache
from mongoengine import connect
import logging
from routes import auth_bp, product_bp, profile_bp
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Firebase if it hasn't been initialized already
if not firebase_admin._apps:
    try:
        cred = credentials.Certificate(Config.FIREBASE_SERVICE_ACCOUNT)
        firebase_admin.initialize_app(cred)
        logger.info("Firebase initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing Firebase: {e}")

# Connect to MongoDB using the URI in your config
try:
    connect(host=Config.MONGO_DATABASE)
    logger.info("MongoDB connection established successfully.")
except Exception as e:
    logger.error(f"Error connecting to MongoDB: {e}")

# Import blueprints
from routes import auth_bp, product_bp, profile_bp

app = Flask(__name__)
app.config.from_object(Config)

# Enable Cross-Origin Resource Sharing
CORS(app)

# Initialize the cache on the main app
cache.init_app(app)

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(product_bp)
app.register_blueprint(profile_bp)

# Setup background task for cleanup of invalid data
scheduler = BackgroundScheduler()
scheduler.start()

# Cleanup job runs every day at midnight to clean invalid data
def cleanup_invalid_data():
    # Clean up invalid cache
    CachedShop.cleanup_invalid_cache()
    ZeroReviewShop.cleanup_invalid_zero_review_shops()

# Add cleanup task to the scheduler
scheduler.add_job(
    func=cleanup_invalid_data,
    trigger=IntervalTrigger(hours=24),  
    id='cleanup_invalid_data',
    name='Clean up invalid cached and zero review shops data',
    replace_existing=True
)

cleanup_invalid_data()


@app.route("/")
def home():
    return "Hello from Flask!"

if __name__ == "__main__":
    try:
        app.run(debug=True, host="0.0.0.0", port=5000)
        logger.info("Flask app running on port 5000.")
    except Exception as e:
        logger.error(f"Error starting the Flask app: {e}")
