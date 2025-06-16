import os
from flask import Blueprint, request, jsonify, send_from_directory
from db import db

uploads_bp = Blueprint('uploads', __name__)

# Set the absolute path for the uploads directory
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

    # Save files in a subdirectory based on extension (e.g., mp3, mp4)
    ext = os.path.splitext(filename)[1].lower().replace('.', '')
    subdir = os.path.join(UPLOAD_FOLDER, ext)
    os.makedirs(subdir, exist_ok=True)  # Ensure subdirectory exists

    save_path = os.path.join(subdir, filename)
    print("Saving file to:", save_path)  # Debug: print the save path

    file.save(save_path)
    db.files.insert_one({"filename": filename, "path": f"/uploads/{ext}/{filename}"})
    return jsonify({"message": "File uploaded", "url": f"/uploads/{ext}/{filename}"}), 201

@uploads_bp.route('/uploads/<ext>/<filename>', methods=['GET'])
def serve_file(ext, filename):
    subdir = os.path.join(UPLOAD_FOLDER, ext)
    return send_from_directory(subdir, filename)

@uploads_bp.route('/uploads/<ext>/<filename>', methods=['DELETE'])
def delete_file(ext, filename):
    subdir = os.path.join(UPLOAD_FOLDER, ext)
    file_path = os.path.join(subdir, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        db.files.delete_one({"filename": filename})
        return jsonify({"message": f"{filename} deleted."}), 200
    else:
        return jsonify({"error": "File not found"}), 404

@uploads_bp.route('/uploads/files', methods=['GET'])
def list_files():
    files = list(db.files.find())
    for f in files:
        f['_id'] = str(f['_id'])
    return jsonify(files)

@uploads_bp.route('/uploads/clean', methods=['POST'])
def clean_uploads():
    db.files.delete_many({})
    return jsonify({"message": "All uploads deleted from MongoDB."}), 200