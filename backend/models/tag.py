# backend/models/tag.py
import uuid
from database import db


class Tag(db.Model):
    __tablename__ = "tags"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), unique=True, nullable=False)
    normalized_name = db.Column(db.String(255), unique=True, nullable=False)
    usage_count = db.Column(db.Integer, default=0)

    prompts = db.relationship("Prompt", secondary="prompt_tags", back_populates="tags")

    @staticmethod
    def normalize(name):
        return name.lower().strip().replace(" ", "-")

    @staticmethod
    def get_or_create(name):
        normalized = Tag.normalize(name)
        tag = Tag.query.filter_by(normalized_name=normalized).first()
        if not tag:
            tag = Tag(name=name, normalized_name=normalized)
            db.session.add(tag)
            db.session.commit()
        return tag