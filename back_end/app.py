import firebase_admin
from firebase_admin import credentials
from config import Config
from flask import Flask
from flask_cors import CORS
from utils import cache
from mongoengine import connect

# Initialize Firebase if it hasn't been initialized already
if not firebase_admin._apps:
    cred = credentials.Certificate(Config.FIREBASE_SERVICE_ACCOUNT)
    firebase_admin.initialize_app(cred)

# Connect to MongoDB using the URI in your config
connect(host=Config.MONGO_DATABASE)

# Import blueprints
from routes import auth_bp , product_bp , profile_bp

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


@app.route("/")
def home():
    return "Hello from Flask!"

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
