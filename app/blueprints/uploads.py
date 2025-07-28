import os
from flask import Blueprint, request, jsonify, send_from_directory, make_response, session
from datetime import datetime
from db import db
from blueprints.authentication import login_required

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
@login_required
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

    db.files.insert_one({
        "filename": unique_filename,
        "path": f"/uploads/{ext}/{unique_filename}",
        "uploaded_by": {
            "id": session.get("user"),
            "email": session.get("email"),
            "name": session.get("name", "Unknown")
        },
        "upload_time": datetime.utcnow()
    })

    return jsonify({
        "message": "File uploaded",
        "url": f"/uploads/{ext}/{unique_filename}"
    }), 201



@uploads_bp.route('/uploads/<ext>/<filename>', methods=['GET'])
def serve_file(ext, filename):
    subdir = os.path.join(UPLOAD_FOLDER, ext)
    response = make_response(send_from_directory(subdir, filename))
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

@uploads_bp.route('/uploads/<ext>/<filename>', methods=['DELETE'])
@login_required
def delete_file(ext, filename):
    subdir = os.path.join(UPLOAD_FOLDER, ext)
    file_path = os.path.join(subdir, filename)

    # Step 1: Verify file exists
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404

    # Step 2: Prepare full file URL used in playlists
    file_url = f"/uploads/{ext}/{filename}"

    # Step 3: Attempt to remove from all playlists
    try:
        playlist_result = db.playlists.update_many(
            {},
            {"$pull": {"items": {"url": file_url}}}
        )
    except Exception as e:
        return jsonify({
            "error": "Failed to clean playlist references.",
            "details": str(e)
        }), 500

    # Step 4: Only delete file after playlist cleanup
    try:
        os.remove(file_path)
        db.files.delete_one({"filename": filename})
    except Exception as e:
        return jsonify({
            "error": "Failed to delete file after playlist cleanup.",
            "details": str(e)
        }), 500

    return jsonify({
        "message": f"{filename} deleted.",
        "playlists_updated": playlist_result.modified_count
    }), 200


@uploads_bp.route('/uploads/files', methods=['GET'])
def list_files():   
    files = list(db.files.find())
    for f in files:
        f['_id'] = str(f['_id'])
    return jsonify(files)

@uploads_bp.route('/uploads/clean', methods=['POST'])
@login_required
def clean_uploads():
    db.files.delete_many({})
    db.scenes.delete_many({})
    return jsonify({"message": "All uploads and scenes deleted from MongoDB."}), 200