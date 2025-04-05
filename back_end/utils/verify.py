import re
from firebase_admin import auth as firebase_auth
from firebase_admin.auth import UserNotFoundError
from .DB_models import User  

def validate_signup_data(data):
    """
    Validates the basic signup input data.
    Returns a list of error messages if there are issues.
    """
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

def check_existing_user(email: str, phone: str):
    """
    Checks if the provided email or phone already exists.
    This function performs checks via Firebase and the MongoEngine model.
    Returns a list of error messages if any duplicates are found.
    """
    errors = []

    # Check in Firebase for email
    try:
        firebase_auth.get_user_by_email(email)
        errors.append("Email already exists.")
    except UserNotFoundError:
        pass

    # Check in Firebase for phone number
    try:
        firebase_auth.get_user_by_phone_number(phone)
        errors.append("Phone number already exists.")
    except UserNotFoundError:
        pass

    # Check in MongoDB using the User model
    if User.objects(email=email).first():
        errors.append("Email already exists in our database.")
    if User.objects(phone=phone).first():
        errors.append("Phone number already exists in our database.")

    return errors
