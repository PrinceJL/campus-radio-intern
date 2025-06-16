from flask import Blueprint, request, jsonify
from db import db

scenes_bp = Blueprint('scenes', __name__)

@scenes_bp.route('/scenes', methods=['POST'])
def add_scene():
    data = request.json
    if not data or not data.get("name"):
        return jsonify({"error": "Scene name is required"}), 400
    scene = {
        "name": data["name"],
        "description": data.get("description", "")
    }
    result = db.scenes.insert_one(scene)
    return jsonify({"inserted_id": str(result.inserted_id)}), 201

@scenes_bp.route('/scenes', methods=['GET'])
def get_scenes():
    scenes = list(db.scenes.find())
    for scene in scenes:
        scene['_id'] = str(scene['_id'])
    return jsonify(scenes)

@scenes_bp.route('/scenes/clean', methods=['POST'])
def clean_scenes():
    db.scenes.delete_many({})
    return jsonify({"message": "All scenes deleted."}), 200