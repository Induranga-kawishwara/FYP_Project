from flask import Blueprint, request, jsonify
import logging
import datetime
from firebase_admin import auth as firebase_auth
from mongoengine.errors import NotUniqueError
from utils.verify import validate_signup_data, check_existing_user, format_phone_number
from utils.DB_models import User  # Ensure your User model is imported correctly

logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.json

    # Validate basic input data
    validation_errors = validate_signup_data(data)
    if validation_errors:
        return jsonify({"errors": validation_errors}), 400

    email = data.get("email")
    password = data.get("password")
    username = data.get("username")
    phone = data.get("phone")

    # Convert phone number to E.164 format
    try:
        phone_e164 = format_phone_number(phone, region="GB")
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    # Check if the user already exists
    existing_errors = check_existing_user(email, phone_e164)
    if existing_errors:
        return jsonify({"errors": existing_errors}), 400

    try:
        # Create the user in Firebase Authentication with the formatted phone number
        user_record = firebase_auth.create_user(
            email=email,
            password=password,
            display_name=username,
            phone_number=phone_e164
        )
        firebase_uid = user_record.uid

        # Create and save a new User document using MongoEngine
        user = User(
            firebase_uid=firebase_uid,
            email=email,
            username=username,
            phone=phone_e164,
            created_at=datetime.datetime.utcnow()
        )
        user.save()

        logger.info(f"New user registered with Firebase UID: {firebase_uid}")
        return jsonify({"message": "User registered successfully", "uid": firebase_uid}), 201
    except NotUniqueError as ne:
        logger.error(f"Unique field error: {str(ne)}")
        return jsonify({"error": "User with given email or phone already exists"}), 400
    except Exception as e:
        logger.error(f"Error during user registration: {str(e)}")
        return jsonify({"error": str(e)}), 400
