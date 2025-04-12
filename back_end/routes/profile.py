import datetime
import logging
from flask import Blueprint, request, jsonify
from firebase_admin import auth as firebase_auth
from utils import User, ReviewSettings  # Adjust the import as needed

logger = logging.getLogger(__name__)
profile_bp = Blueprint('profile', __name__, url_prefix='/profile')


def get_uid_and_provider(token):

    try:
        decoded_token = firebase_auth.verify_id_token(token)
        uid = decoded_token.get("uid")
        sign_in_provider = decoded_token.get("firebase", {}).get("sign_in_provider", "").lower()
        print(uid, sign_in_provider)
        return uid, sign_in_provider
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return None, None


@profile_bp.route("/data", methods=["POST"])
def get_profile():

    data = request.json
    token = data.get("id_token")
    if not token:
        return jsonify({"error": "Token is missing"}), 400

    uid, sign_in_provider = get_uid_and_provider(token)
    if not uid:
        return jsonify({"error": "Invalid token"}), 401

    user = User.objects(firebase_uid=uid).first()

    # For social login users with no saved MongoDB record
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

    # Prefer token-provided provider if available
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

    uid, _ = get_uid_and_provider(token)
    if not uid:
        return jsonify({"error": "Invalid token"}), 401

    user = User.objects(firebase_uid=uid).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    first_name = data.get("first_name", "").strip()
    surname = data.get("surname", "").strip()
    email = data.get("email", "").strip()
    phone = data.get("phone", "").strip()
    new_password = data.get("new_password", "")

    full_name = first_name + (" " + surname if surname else "")
    login_provider = getattr(user, "login_provider", "").lower()

    # Update Firebase if the user is not a social login
    if login_provider not in ["google", "github", "google.com", "github.com"]:
        update_kwargs = {}
        if email and email != user.email:
            update_kwargs["email"] = email
        if full_name and full_name != user.username:
            update_kwargs["display_name"] = full_name
        if phone and phone != user.phone:
            update_kwargs["phone_number"] = phone
        if new_password:
            update_kwargs["password"] = new_password

        if update_kwargs:
            try:
                firebase_auth.update_user(uid, **update_kwargs)
            except Exception as e:
                logger.error(f"Error updating Firebase user: {str(e)}")
                return jsonify({"error": "Failed to update Firebase user"}), 400

    # Update the MongoDB record
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

    uid, _ = get_uid_and_provider(token)
    if not uid:
        return jsonify({"error": "Invalid token"}), 401

    try:
        firebase_auth.delete_user(uid)
    except Exception as e:
        logger.error(f"Error deleting Firebase user: {str(e)}")
        return jsonify({"error": "Failed to delete Firebase user"}), 400

    user = User.objects(firebase_uid=uid).first()
    if user:
        user.delete()

    return jsonify({"message": "Account deleted successfully"}), 200


@profile_bp.route("/review_settings", methods=["GET"])
def get_review_settings():

    token = request.args.get("id_token")
    if not token:
        return jsonify({"error": "Token is missing"}), 400

    uid, _ = get_uid_and_provider(token)
    if not uid:
        return jsonify({"error": "Invalid token"}), 401

    settings = ReviewSettings.objects(firebase_uid=uid).first()
    if settings:
        review_settings = {
            "review_count": settings.review_count,
            "coverage": settings.coverage,
            "remember_settings": settings.remember_settings,
            "updated_at": settings.updated_at.isoformat() if settings.updated_at else None
        }
        return jsonify({"review_settings": review_settings}), 200
    else:
        return jsonify({"review_settings": {}}), 200
    
@profile_bp.route("/Update_review_settings", methods=["PUT"])
def update_review_settings():
    data = request.json
    token = data.get("id_token")
    remember = data.get("remember_settings", False)

    if not token:
        return jsonify({"error": "Token is missing"}), 400

    if not remember:
        # If the user did not tick "remember settings", do not save.
        return jsonify({"message": "Settings not saved (remember_settings not ticked)."}), 200

    uid, _ = get_uid_and_provider(token)
    if not uid:
        return jsonify({"error": "Invalid token"}), 401

    # Cast the review_count and coverage values to string
    review_count = str(data.get("review_count"))
    coverage = str(data.get("coverage"))

    # Try to update an existing settings document; if not, create a new one.
    settings = ReviewSettings.objects(firebase_uid=uid).first()
    if settings:
        settings.review_count = review_count
        settings.coverage = coverage
        settings.remember_settings = True
        settings.updated_at = datetime.datetime.utcnow()
        settings.save()
    else:
        settings = ReviewSettings(
            firebase_uid=uid,
            review_count=review_count,
            coverage=coverage,
            remember_settings=True
        )
        settings.save()

    return jsonify({"message": "Review settings updated successfully"}), 200
