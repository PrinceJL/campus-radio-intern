from flask import Blueprint, send_from_directory
import os

media_bp = Blueprint("media", __name__, url_prefix="/media")

@media_bp.route("/<path:filename>")
def media_files(filename):
    media_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), "../media"))
    return send_from_directory(media_folder, filename)