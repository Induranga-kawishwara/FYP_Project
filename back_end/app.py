import logging
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from config import Config
from utils import cache
import firebase_admin
from firebase_admin import credentials
from routes.auth import auth_bp
from routes.product import product_bp

# Configure basic logging
logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
app.config.from_object(Config)

jwt = JWTManager(app)
bcrypt = Bcrypt(app)
CORS(app)

# Initialize Firebase Admin SDK using the service account from the config
cred = credentials.Certificate(Config.FIREBASE_SERVICE_ACCOUNT)
firebase_admin.initialize_app(cred)

# Initialize the cache on the main app
cache.init_app(app)

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(product_bp)

@app.route("/")
def home():
    return "Hello from Flask!"

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
