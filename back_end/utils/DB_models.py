from mongoengine import (
    Document,
    BooleanField,
    StringField,
    DateTimeField,
    FloatField,
    ListField,
    DictField,
)
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

    meta = {'collection': 'users'}


class ReviewSettings(Document):
    firebase_uid = StringField(required=True, unique=True)
    review_count = StringField(required=True)
    coverage = StringField(required=True)
    remember_settings = BooleanField(default=False)
    updated_at = DateTimeField(default=datetime.datetime.utcnow)

    meta = {'collection': 'review_settings'}


class CachedShop(Document):
    name = StringField(required=True)
    place_id = StringField(required=True, unique=True)
    rating = FloatField()
    reviews = ListField(DictField())
    address = StringField()
    lat = FloatField()
    lng = FloatField()
    cached_at = DateTimeField(default=datetime.datetime.utcnow)
    phone = StringField()                        
    opening_hours = DictField()                 
    weekday_text = ListField(StringField())     

    meta = {'collection': 'cached_shops'}

    def is_cache_valid(self):
        # Cache is valid for 7 days
        return (datetime.datetime.utcnow() - self.cached_at).days < 7

    @classmethod
    def cleanup_invalid_cache(cls):
        expired = cls.objects(
            cached_at__lt=datetime.datetime.utcnow() - timedelta(days=7)
        )
        if expired:
            count = expired.delete()
            logger.info(f"Deleted {count} expired cached shops.")
        else:
            logger.info("No expired cached shops to delete.")


class ZeroReviewShop(Document):
    place_id = StringField(required=True, unique=True)
    added_at = DateTimeField(default=datetime.datetime.utcnow)

    meta = {'collection': 'zero_review_shops'}

    def is_still_invalid(self):
        # mark invalid for 24 hours
        return (datetime.datetime.utcnow() - self.added_at).days < 1

    @classmethod
    def cleanup_invalid_zero_review_shops(cls):
        expired = cls.objects(
            added_at__lt=datetime.datetime.utcnow() - timedelta(days=1)
        )
        if expired:
            count = expired.delete()
            logger.info(f"Deleted {count} expired zero review shops.")
        else:
            logger.info("No expired zero review shops to delete.")
