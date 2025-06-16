from flask import Blueprint, send_from_directory
import os

hls_bp = Blueprint("hls", __name__, url_prefix="/hls")

@hls_bp.route("/<path:filename>")
def hls_files(filename):
    hls_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), "../hls"))
    return send_from_directory(hls_folder, filename)