import sys
import signal
import atexit
import firebase_admin
from firebase_admin import credentials
from config import Config
from flask import Flask
from flask_cors import CORS
from utils import CachedShop, ZeroReviewShop, cache
from mongoengine import connect
import logging
from routes import auth_bp, product_bp, profile_bp
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

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

# Graceful shutdown log
@atexit.register
def shutdown_handler():
    logger.info("Flask backend shutting down cleanly...")

signal.signal(signal.SIGINT, lambda s, f: sys.exit(0))
signal.signal(signal.SIGTERM, lambda s, f: sys.exit(0))

# Initialize Firebase
if not firebase_admin._apps:
    try:
        cred = credentials.Certificate(Config.FIREBASE_SERVICE_ACCOUNT)
        firebase_admin.initialize_app(cred)
        logger.info("Firebase initialized successfully.")
    except Exception:
        logger.exception("Error initializing Firebase")

# Connect to MongoDB
try:
    connect(host=Config.MONGO_DATABASE, alias="default")
    logger.info("MongoDB connection established successfully.")
except Exception:
    logger.exception("Error connecting to MongoDB")

# Flask app setup
app = Flask(__name__)
app.config.from_object(Config)

CORS(app)
cache.init_app(app)

# Register Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(product_bp)
app.register_blueprint(profile_bp)

# Background job scheduler
scheduler = BackgroundScheduler()
scheduler.start()

def cleanup_invalid_data():
    try:
        CachedShop.cleanup_invalid_cache()
        ZeroReviewShop.cleanup_invalid_zero_review_shops()
        logger.info("Cleanup of invalid data completed.")
    except Exception:
        logger.exception("Error during cleanup job")

scheduler.add_job(
    func=cleanup_invalid_data,
    trigger=IntervalTrigger(hours=24),
    id='cleanup_invalid_data',
    name='Clean up invalid cached and zero review shops data',
    replace_existing=True
)

# Run cleanup on startup
cleanup_invalid_data()

@app.route("/")
def home():
    return "Hello from Flask backend."

if __name__ == "__main__":
    try:
        logger.info("Starting Flask app on http://0.0.0.0:5000")
        # TEMPORARILY disable threading to avoid race/thread kill issues on Windows
        app.run(debug=True, host="0.0.0.0", port=5000, threaded=False, use_reloader=False)
    except Exception:
        logger.exception("Error starting Flask app")
