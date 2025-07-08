import sys
import logging
import firebase_admin
from firebase_admin import credentials
from config import Config
from flask import Flask, request
from flask_cors import CORS
from mongoengine import connect
from utils import CachedShop, ZeroReviewShop, cache
from routes import auth_bp, product_bp, profile_bp
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from waitress import serve

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Global uncaught exception handler
def handle_uncaught_exception(exc_type, exc_value, exc_traceback):
    if issubclass(exc_type, KeyboardInterrupt):
        sys.__excepthook__(exc_type, exc_value, exc_traceback)
        return
    logger.error("Uncaught exception", exc_info=(exc_type, exc_value, exc_traceback))

sys.excepthook = handle_uncaught_exception

# Initialize Firebase
if not firebase_admin._apps:
    try:
        cred = credentials.Certificate(Config.FIREBASE_SERVICE_ACCOUNT)
        firebase_admin.initialize_app(cred)
        logger.info(" Firebase initialized successfully.")
    except Exception as e:
        logger.exception(" Error initializing Firebase")

# Connect to MongoDB
try:
    connect(host=Config.MONGO_DATABASE, alias="default")
    logger.info(" MongoDB connection established successfully.")
except Exception as e:
    logger.exception(" Error connecting to MongoDB")

# Create Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Enable CORS
CORS(app)

# Init cache
cache.init_app(app)

# Register Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(product_bp)
app.register_blueprint(profile_bp)

# Background Scheduler Setup
scheduler = BackgroundScheduler()
scheduler.start()

def cleanup_invalid_data():
    try:
        CachedShop.cleanup_invalid_cache()
        ZeroReviewShop.cleanup_invalid_zero_review_shops()
        logger.info(" Cleanup of invalid data completed.")
    except Exception as e:
        logger.exception(" Error during cleanup job")

# Schedule cleanup every 24 hours
scheduler.add_job(
    func=cleanup_invalid_data,
    trigger=IntervalTrigger(hours=24),
    id='cleanup_invalid_data',
    name='Clean up invalid cached and zero review shops data',
    replace_existing=True
)

# Run cleanup immediately on startup
cleanup_invalid_data()

@app.route("/")
def home():
    return " Flask backend is running."

# Log every request
@app.before_request
def log_request():
    logger.info(f" {request.method} {request.path}")
    if request.method in ["POST", "PUT", "PATCH"]:
        try:
            logger.info(f" Payload: {request.get_json()}")
        except Exception as e:
            logger.warning(f" Could not parse JSON body: {e}")

# Log every response
@app.after_request
def log_response(response):
    logger.info(f"Responded with status {response.status_code}")
    return response

# Run using Waitress for Windows stability
if __name__ == "__main__":
    logger.info("Starting backend on http://0.0.0.0:5000 with Waitress")
    serve(app, host="0.0.0.0", port=5000)
