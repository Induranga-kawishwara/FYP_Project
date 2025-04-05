from mongoengine import Document, StringField, DateTimeField
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
