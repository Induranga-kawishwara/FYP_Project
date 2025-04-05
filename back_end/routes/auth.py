import logging
import datetime
from flask import Blueprint, request, jsonify
from firebase_admin import auth as firebase_auth
from pymongo import MongoClient
from config import Config

logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

# Initialize MongoDB client using the connection string from your config
client = MongoClient(Config.MONGO_DATABASE)
db = client.get_default_database()  # Uses the default database defined in your URI
users_collection = db.users

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.json
    email = data.get("email")
    password = data.get("password")
    username = data.get("username")
    phone = data.get("phone")  # Retrieve phone number from request

    if not email or not password or not username or not phone:
        return jsonify({"error": "Email, password, username, and phone number are required"}), 400

    try:
        # Create the user in Firebase Authentication including the phone number
        user_record = firebase_auth.create_user(
            email=email,
            password=password,
            display_name=username,
            phone_number=phone
        )
        firebase_uid = user_record.uid

        # Save additional user details, including phone, in MongoDB
        user_data = {
            "firebase_uid": firebase_uid,
            "email": email,
            "username": username,
            "phone": phone,
            "created_at": datetime.datetime.utcnow()
        }
        users_collection.insert_one(user_data)

        logger.info(f"New user registered with Firebase UID: {firebase_uid}")
        return jsonify({"message": "User registered successfully", "uid": firebase_uid}), 201
    except Exception as e:
        logger.error(f"Error during user registration: {str(e)}")
        return jsonify({"error": str(e)}), 400

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    id_token = data.get("id_token")
    if not id_token:
        return jsonify({"error": "ID token is required"}), 400

    try:
        # Verify the Firebase ID token provided by the client
        decoded_token = firebase_auth.verify_id_token(id_token)
        uid = decoded_token["uid"]

        # Retrieve additional user details from MongoDB using the Firebase UID
        user = users_collection.find_one({"firebase_uid": uid})
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Respond with a successful login message and user info
        return jsonify({
            "message": "Login successful",
            "user": {
                "uid": uid,
                "email": user.get("email"),
                "username": user.get("username"),
                "phone": user.get("phone")
            }
        }), 200
    except Exception as e:
        logger.error(f"Error during login: {str(e)}")
        return jsonify({"error": str(e)}), 400
