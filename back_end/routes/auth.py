import logging
import datetime
from flask import Blueprint, request, jsonify
from firebase_admin import auth as firebase_auth
from pymongo import MongoClient
from config import Config
from utils import validate_signup_data, check_existing_user

logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

# Initialize MongoDB client
client = MongoClient(Config.MONGO_DATABASE)
db = client.get_default_database()
users_collection = db.users

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.json

    # Validate basic input format
    errors = validate_signup_data(data)
    if errors:
        return jsonify({"errors": errors}), 400

    email = data.get("email")
    password = data.get("password")
    username = data.get("username")
    phone = data.get("phone")

    # Check for existing user details
    existing_errors = check_existing_user(email, phone, users_collection)
    if existing_errors:
        return jsonify({"errors": existing_errors}), 400

    try:
        # Create the user in Firebase Authentication
        user_record = firebase_auth.create_user(
            email=email,
            password=password,
            display_name=username,
            phone_number=phone
        )
        firebase_uid = user_record.uid

        # Save additional user details in MongoDB
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
