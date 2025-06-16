import os
from flask import Blueprint, request, jsonify, send_from_directory
from db import db

uploads_bp = Blueprint('uploads', __name__)
UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'uploads'))

# Ensure the uploads folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@uploads_bp.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    filename = file.filename
    save_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(save_path)
    db.files.insert_one({"filename": filename, "path": f"/uploads/{filename}"})
    return jsonify({"message": "File uploaded", "url": f"/uploads/{filename}"}), 201

@uploads_bp.route('/uploads/<filename>', methods=['GET'])
def serve_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@uploads_bp.route('/uploads/<filename>', methods=['DELETE'])
def delete_file(filename):
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        db.files.delete_one({"filename": filename})
        return jsonify({"message": f"{filename} deleted."}), 200
    else:
        return jsonify({"error": "File not found"}), 404