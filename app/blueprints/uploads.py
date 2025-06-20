import os
from flask import Blueprint, request, jsonify, send_from_directory, make_response
from db import db

uploads_bp = Blueprint('uploads', __name__)

UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'uploads'))
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def get_unique_filename(subdir, filename):
    name, ext = os.path.splitext(filename)
    counter = 1
    unique_filename = filename

    # Check both the directory and MongoDB for existing filenames
    while (
        os.path.exists(os.path.join(subdir, unique_filename)) or
        db.files.find_one({"filename": unique_filename})
    ):
        unique_filename = f"{name} ({counter}){ext}"
        counter += 1
    return unique_filename

@uploads_bp.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    filename = file.filename

    ext = os.path.splitext(filename)[1].lower().replace('.', '')
    subdir = os.path.join(UPLOAD_FOLDER, ext)
    os.makedirs(subdir, exist_ok=True)

    unique_filename = get_unique_filename(subdir, filename)
    save_path = os.path.join(subdir, unique_filename)
    print("Saving file to:", save_path)

    file.save(save_path)
    db.files.insert_one({"filename": unique_filename, "path": f"/uploads/{ext}/{unique_filename}"})
    return jsonify({"message": "File uploaded", "url": f"/uploads/{ext}/{unique_filename}"}), 201


@uploads_bp.route('/uploads/<ext>/<filename>', methods=['GET'])
def serve_file(ext, filename):
    subdir = os.path.join(UPLOAD_FOLDER, ext)
    response = make_response(send_from_directory(subdir, filename))
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response


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
    db.scenes.delete_many({})
    return jsonify({"message": "All uploads and scenes deleted from MongoDB."}), 200