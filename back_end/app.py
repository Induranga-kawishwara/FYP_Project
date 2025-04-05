from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from config import Config
from utils import cache
from mongoengine import connect

# Connect to MongoDB using the URI in your config
connect(host=Config.MONGO_DATABASE)

# Import blueprints
from routes.auth import auth_bp
from routes.product import product_bp

app = Flask(__name__)
app.config.from_object(Config)

jwt = JWTManager(app)
bcrypt = Bcrypt(app)
CORS(app)

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
