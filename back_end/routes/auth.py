from flask import Blueprint, request, jsonify
import logging
import datetime
from firebase_admin import auth as firebase_auth
from mongoengine.errors import NotUniqueError
from utils import validate_signup_data, check_existing_user, format_phone_number , User , send_email_via_brevo
from config import Config
import requests


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
    
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")
    
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        # Call Firebase's REST API to sign in with email/password.
        api_key = Config.GOOGLE_API_KEY_FIREBASE
        signin_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
        payload = {
            "email": email,
            "password": password,
            "returnSecureToken": True
        }
        r = requests.post(signin_url, json=payload)
        if r.status_code != 200:
            # Log the detailed error from Firebase for debugging
            # error_info = r.json()
            # logger.error(f"Firebase sign-in error: {error_info}")
            # Return the specific error message from Firebase if available
            return jsonify({"error": "Invalid email or password"}), 400
        
        res_data = r.json()
        id_token = res_data.get("idToken")
        
        # Verify the returned ID token using Firebase Admin SDK.
        decoded_token = firebase_auth.verify_id_token(id_token)
        uid = decoded_token.get("uid")
        
        # Retrieve the user details from your MongoEngine database.
        user = User.objects(firebase_uid=uid).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        return jsonify({
            "message": "Login successful",
            "user": {
                "uid": uid,
                "email": user.email,
                "username": user.username,
                "phone": user.phone
            },
            "idToken": id_token  # Optionally return the token for client use
        }), 200

    except Exception as e:
        logger.error(f"Error during login: {str(e)}")
        return jsonify({"error": str(e)}), 400
    

@auth_bp.route("/forgot_password", methods=["POST"])
def forgot_password():
    data = request.json
    email = data.get("email")
    if not email:
        return jsonify({"error": "Email is required"}), 400

    try:
        # Generate password reset link
        reset_link = firebase_auth.generate_password_reset_link(email)
        
        # ===== EMAIL CONTENT =====
        LOGO_URL = "https://your-cdn.com/shopfinder-logo.png"  
        BRAND_COLOR = "#007bff" 
        SUPPORT_EMAIL = "support@shopfinder.com"
        SOCIAL_MEDIA_LINKS = """
            <a href="https://twitter.com/shopfinder">Twitter</a> |
            <a href="https://facebook.com/shopfinder">Facebook</a> |
            <a href="https://instagram.com/shopfinder">Instagram</a>
        """
        
        # HTML Template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; }}
                .container {{ max-width: 600px; margin: 20px auto; padding: 20px; }}
                .header {{ text-align: center; padding: 20px; background-color: #f8f9fa; }}
                .logo {{ max-width: 200px; height: auto; }}
                .content {{ padding: 30px 20px; background-color: #ffffff; }}
                .button {{
                    display: inline-block;
                    padding: 12px 30px;
                    background-color: {BRAND_COLOR};
                    color: #ffffff !important;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
                .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="{LOGO_URL}" class="logo" alt="ShopFinder Logo">
                </div>
                
                <div class="content">
                    <h2 style="color: #2d3436; text-align: center;">Password Reset Request</h2>
                    <p>Hello ShopFinder user,</p>
                    <p>We received a request to reset your password. Click the button below to set up a new password:</p>
                    
                    <p style="text-align: center;">
                        <a href="{reset_link}" class="button">Reset Password</a>
                    </p>

                    <p>If you didn't request this password reset, you can safely ignore this email. The password reset link will expire in 1 hour.</p>
                </div>

                <div class="footer">
                    <p>© 2024 ShopFinder. All rights reserved.</p>
                    <p>Need help? Contact us at <a href="mailto:{SUPPORT_EMAIL}">{SUPPORT_EMAIL}</a></p>
                    <p>Follow us on {SOCIAL_MEDIA_LINKS}</p>
                    <p style="color: #999999; font-size: 11px;">
                        This is an automated message. Please do not reply directly to this email.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

        # Plain text version
        text_content = f"""
        Hello ShopFinder user,

        We received a request to reset your password. Please use the following link to reset your password:

        {reset_link}

        This link will expire in 1 hour.

        If you didn't make this request, you can ignore this email.

        ---
        © 2024 ShopFinder
        Need help? Contact {SUPPORT_EMAIL}
        """
        # ===== END EMAIL CONTENT =====

        # Send email through Brevo
        send_email_via_brevo(
            email,
            subject="Password Reset Request - ShopFinder",
            html_content=html_content,
            text_content=text_content
        )

        return jsonify({
            "message": "Password reset link sent successfully to your email."
        }), 200

    except Exception as e:
        logger.error(f"Error in password reset: {str(e)}")
        return jsonify({"error": "Failed to process password reset request"}), 400