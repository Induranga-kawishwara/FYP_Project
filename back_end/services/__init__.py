"""
Services package for handling external API interactions and business logic.
"""
__version__ = "1.0.0"

from .google_maps_service import fetch_all_shops
from .review_service import predict_review_rating, generate_summary
from .google_scraper import scrape_reviews

__all__ = ["fetch_all_shops", "predict_review_rating", "generate_summary", "scrape_reviews"]
