"""
Routes package for the backend application.
"""
__version__ = "1.0.0"


from .auth import auth_bp
from .product import product_bp
from .profile import profile_bp

__all__ = ["auth_bp", "product_bp", "profile_bp"]