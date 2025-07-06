from mongoengine import Document, BooleanField, StringField, DateTimeField, FloatField, ListField, DictField
import datetime
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class User(Document):
    firebase_uid = StringField(required=True, unique=True)
    email = StringField(required=True, unique=True)
    username = StringField(required=True)
    phone = StringField(required=True, unique=True)
    created_at = DateTimeField(default=datetime.datetime.utcnow)

    meta = {
        'collection': 'users'
    }

class ReviewSettings(Document):
    firebase_uid = StringField(required=True, unique=True)
    review_count = StringField(required=True)
    coverage = StringField(required=True)
    remember_settings = BooleanField(default=False)
    updated_at = DateTimeField(default=datetime.datetime.utcnow)

    meta = {
        'collection': 'review_settings'
    }

class CachedShop(Document):
    name = StringField(required=True)
    place_id = StringField(required=True, unique=True)
    rating = FloatField()
    reviews = ListField(DictField())  
    summary = StringField()
    predicted_rating = FloatField()
    xai_explanations = StringField()
    raw_xai_explanation = StringField()  
    address = StringField()  
    lat = FloatField()  
    lng = FloatField()  
    cached_at = DateTimeField(default=datetime.datetime.utcnow)  

    meta = {
        'collection': 'cached_shops'
    }

    def is_cache_valid(self):
        return (datetime.datetime.utcnow() - self.cached_at).days < 1  # Cache expires after 24 hours
    
    @classmethod
    def cleanup_invalid_cache(cls):
        expired_shops = cls.objects(cached_at__lt=datetime.datetime.utcnow() - timedelta(days=1))
        if expired_shops:
            deleted_count = expired_shops.delete()
            logger.info(f"Deleted {deleted_count} expired cached shops.")
        else:
            logger.info("No expired cached shops to delete.")

class ZeroReviewShop(Document):
    place_id = StringField(required=True, unique=True)
    added_at = DateTimeField(default=datetime.datetime.utcnow)
    
    meta = {
        'collection': 'zero_review_shops'
    }

    def is_still_invalid(self):
        # For example, mark this invalid for 24 hours.
        return (datetime.datetime.utcnow() - self.added_at).days < 1

    @classmethod
    def cleanup_invalid_zero_review_shops(cls):
        expired_shops = cls.objects(added_at__lt=datetime.datetime.utcnow() - timedelta(days=1))
        if expired_shops:
            deleted_count = expired_shops.delete()
            logger.info(f"Deleted {deleted_count} expired zero review shops.")
        else:
            logger.info("No expired zero review shops to delete.")
