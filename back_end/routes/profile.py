from flask import Blueprint, request, jsonify
import logging
from firebase_admin import auth as firebase_auth
from utils import User

logger = logging.getLogger(__name__)
profile_bp = Blueprint('profile', __name__, url_prefix='/profile')

@profile_bp.route("/data", methods=["POST"])
def get_profile():
    data = request.json
    token = data.get("id_token")
    if not token:
        return jsonify({"error": "Token is missing"}), 400

    try:
        decoded_token = firebase_auth.verify_id_token(token)
        uid = decoded_token.get("uid")
        sign_in_provider = decoded_token.get("firebase", {}).get("sign_in_provider", "").lower()
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return jsonify({"error": "Invalid token"}), 401

    # Retrieve the user from MongoDB using the Firebase UID.
    user = User.objects(firebase_uid=uid).first()
    

    if not user and sign_in_provider in ["google.com", "github.com"]:
        user_data = {
            "login_provider": sign_in_provider,
            "is_social_user": True,
            "message": "No additional data available for social login users."
        }
        return jsonify({"user": user_data}), 200

    if not user:
        return jsonify({"error": "User not found"}), 404

    full_name = user.username.strip() if user.username else ""
    name_parts = full_name.split()
    if len(name_parts) > 1:
        first_name = name_parts[0]
        surname = " ".join(name_parts[1:])
    else:
        first_name = full_name
        surname = ""

    login_provider = sign_in_provider if sign_in_provider else getattr(user, "login_provider", "").lower()

    user_data = {
        "first_name": first_name,
        "surname": surname,
        "full_name": full_name,
        "email": user.email,
        "phone": user.phone,
        "login_provider": login_provider,
        "is_social_user": login_provider in ["google.com", "github.com"]
    }

    return jsonify({"user": user_data}), 200




@profile_bp.route("/update", methods=["PUT"])
def update_profile():

    data = request.json
    token = data.get("id_token")
    if not token:
        return jsonify({"error": "Token is missing"}), 400

    try:
        decoded_token = firebase_auth.verify_id_token(token)
        uid = decoded_token.get("uid")
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return jsonify({"error": "Invalid token"}), 401

    user = User.objects(firebase_uid=uid).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Expecting update data from the request
    first_name = data.get("first_name", "").strip()
    surname = data.get("surname", "").strip()
    email = data.get("email", "").strip()
    phone = data.get("phone", "").strip()
    new_password = data.get("new_password", "")

    full_name = first_name + (" " + surname if surname else "")

    # If the user logged in via a social provider, you might disallow changing email/password.
    login_provider = getattr(user, "login_provider", "").lower()
    try:
        if login_provider not in ["google", "github"]:
            update_kwargs = {}
            if email and email != user.email:
                update_kwargs['email'] = email
            if full_name and full_name != user.username:
                update_kwargs['display_name'] = full_name
            if phone and phone != user.phone:
                update_kwargs['phone_number'] = phone
            if new_password:
                update_kwargs['password'] = new_password

            if update_kwargs:
                firebase_auth.update_user(uid, **update_kwargs)
    except Exception as e:
        logger.error(f"Error updating Firebase user: {str(e)}")
        return jsonify({"error": "Failed to update Firebase user"}), 400

    # Update MongoDB record
    if email:
        user.email = email
    if full_name:
        user.username = full_name
    if phone:
        user.phone = phone
    user.save()

    return jsonify({"message": "Profile updated successfully"}), 200


@profile_bp.route("/delete", methods=["DELETE"])
def delete_account():

    data = request.json
    token = data.get("id_token")
    if not token:
        return jsonify({"error": "Token is missing"}), 400

    try:
        decoded_token = firebase_auth.verify_id_token(token)
        uid = decoded_token.get("uid")
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return jsonify({"error": "Invalid token"}), 401

    try:
        # Delete the Firebase user. This applies to both social and regular accounts.
        firebase_auth.delete_user(uid)
    except Exception as e:
        logger.error(f"Error deleting Firebase user: {str(e)}")
        return jsonify({"error": "Failed to delete Firebase user"}), 400

    # Attempt to delete the MongoDB record if it exists.
    user = User.objects(firebase_uid=uid).first()
    if user:
        user.delete()

    return jsonify({"message": "Account deleted successfully"}), 200
