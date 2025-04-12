from mongoengine import Document, BooleanField, StringField, DateTimeField
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
    review_count = StringField() 
    coverage = StringField()
    remember_settings = BooleanField(default=False)
    updated_at = DateTimeField(default=datetime.datetime.utcnow)

    meta = {
        'collection': 'review_settings'
    }