import re
from firebase_admin import auth as firebase_auth
from pymongo.collection import Collection
from firebase_admin.auth import UserNotFoundError

def validate_signup_data(data):
    errors = []

    email = data.get("email")
    password = data.get("password")
    username = data.get("username")
    phone = data.get("phone")

    if not email:
        errors.append("Email is required.")
    elif not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        errors.append("Invalid email format.")

    if not password or len(password) < 6:
        errors.append("Password is required and should be at least 6 characters long.")

    if not username:
        errors.append("Username is required.")

    if not phone:
        errors.append("Phone number is required.")

    return errors

def check_existing_user(email: str, phone: str, users_collection: Collection):
    errors = []

    # Check in Firebase
    try:
        firebase_auth.get_user_by_email(email)
        errors.append("Email already exists.")
    except UserNotFoundError:
        pass

    try:
        firebase_auth.get_user_by_phone_number(phone)
        errors.append("Phone number already exists.")
    except UserNotFoundError:
        pass

    # Optionally, check in MongoDB as well
    existing = users_collection.find_one({"$or": [{"email": email}, {"phone": phone}]})
    if existing:
        errors.append("User with given email or phone already exists.")

    return errors
