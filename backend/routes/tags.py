# backend/routes/tags.py
from flask import Blueprint, request, jsonify
from models.tag import Tag

bp = Blueprint("tags", __name__, url_prefix="/api/tags")

@bp.route("", methods=["GET"])
def list_tags():
    tags = Tag.query.order_by(Tag.usage_count.desc()).all()
    return jsonify([{"id": t.id, "name": t.name, "usage_count": t.usage_count} for t in tags])

@bp.route("/suggest", methods=["GET"])
def suggest_tags():
    query = request.args.get("q", "")
    if not query:
        return jsonify([])

    tags = Tag.query.filter(Tag.name.ilike(f"%{query}%")).limit(10).all()
    return jsonify([t.name for t in tags])