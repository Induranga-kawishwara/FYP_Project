from mongoengine import Document, BooleanField, StringField, DateTimeField ,FloatField,ListField, DictField
import datetime

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
    address = StringField()  # Added address field
    lat = FloatField()  # Added latitude field
    lng = FloatField()  # Added longitude field
    cached_at = DateTimeField(default=datetime.datetime.utcnow)  

    meta = {
        'collection': 'cached_shops'
    }

    def is_cache_valid(self):
        """ Check if the cache is older than 24 hours """
        return (datetime.datetime.utcnow() - self.cached_at).days < 1  # Cache expires after 24 hours


class ZeroReviewShop(Document):
    place_id = StringField(required=True, unique=True)
    added_at = DateTimeField(default=datetime.datetime.utcnow)
    
    meta = {
        'collection': 'zero_review_shops'
    }

    def is_still_invalid(self):
        # For example, mark this invalid for 24 hours.
        return (datetime.datetime.utcnow() - self.added_at).days < 1