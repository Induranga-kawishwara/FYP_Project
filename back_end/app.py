from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_caching import Cache
from config import Config

# Import blueprints
from routes.auth import auth_bp
from routes.product import product_bp

app = Flask(__name__)
app.config.from_object(Config)

jwt = JWTManager(app)
bcrypt = Bcrypt(app)
CORS(app)

# Initialize cache on the main app
cache = Cache(config={'CACHE_TYPE': 'simple'})
cache.init_app(app)

# Register blueprints (the blueprints can now use the cache instance if needed)
app.register_blueprint(auth_bp)
app.register_blueprint(product_bp)

@app.route("/")
def home():
    return "Hello from Flask!"

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
