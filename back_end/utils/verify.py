import re
import phonenumbers
from firebase_admin import auth as firebase_auth
from firebase_admin.auth import UserNotFoundError
from .DB_models import User  # Ensure this path is correct for your project

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

def format_phone_number(phone, region="GB"):
    """
    Converts a given phone number into the E.164 format.
    The default region is "GB" (United Kingdom). 
    If parsing fails, raises a ValueError.
    """
    try:
        parsed = phonenumbers.parse(phone, region)
        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except phonenumbers.NumberParseException:
        raise ValueError("Invalid phone number format. Please include the country code or use a valid number.")

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

    return errors
