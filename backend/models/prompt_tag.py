# backend/models/prompt_tag.py
from database import db

prompt_tags = db.Table(
    "prompt_tags",
    db.Column("prompt_id", db.String(36), db.ForeignKey("prompts.id"), primary_key=True),
    db.Column("tag_id", db.String(36), db.ForeignKey("tags.id"), primary_key=True)
)