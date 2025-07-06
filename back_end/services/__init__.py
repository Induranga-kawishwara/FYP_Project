"""
Services package for handling external API interactions and business logic.
"""
__version__ = "1.0.0"

from .google_maps_service import fetch_and_filter_shops_with_text
from .review_service import predict_review_rating_with_explanations, generate_summary
from .google_scraper import get_real_reviews_playwright

__all__ = [
    "fetch_and_filter_shops_with_text",
    "predict_review_rating_with_explanations",
    "generate_summary",
    "get_real_reviews_playwright"
]
