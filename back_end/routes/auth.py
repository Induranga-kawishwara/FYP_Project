import logging
from flask import Blueprint, request, jsonify
from firebase_admin import auth as firebase_auth
from mongoengine.errors import NotUniqueError
from utils import validate_signup_data, check_existing_user,User

logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.json
    # Validate the basic signup data
    validation_errors = validate_signup_data(data)
    if validation_errors:
        return jsonify({"errors": validation_errors}), 400

    email = data.get("email")
    password = data.get("password")
    username = data.get("username")
    phone = data.get("phone")

    # Check if the user already exists (Firebase and MongoDB)
    existing_errors = check_existing_user(email, phone)
    if existing_errors:
        return jsonify({"errors": existing_errors}), 400

    try:
        # Create the user in Firebase Authentication including the phone number
        user_record = firebase_auth.create_user(
            email=email,
            password=password,
            display_name=username,
            phone_number=phone
        )
        firebase_uid = user_record.uid

        # Create and save a new User document using MongoEngine
        user = User(
            firebase_uid=firebase_uid,
            email=email,
            username=username,
            phone=phone,
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
        user = User.objects(firebase_uid=uid).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Respond with a successful login message and user info
        return jsonify({
            "message": "Login successful",
            "user": {
                "uid": uid,
                "email": user.email,
                "username": user.username,
                "phone": user.phone
            }
        }), 200
    except Exception as e:
        logger.error(f"Error during login: {str(e)}")
        return jsonify({"error": str(e)}), 400
