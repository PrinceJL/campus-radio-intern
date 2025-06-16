from flask import Blueprint, send_from_directory
import os

frontend_bp = Blueprint("frontend", __name__)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../apps"))

@frontend_bp.route("/")
def index():
    viewer_path = os.path.join(BASE_DIR, "viewer")
    return send_from_directory(viewer_path, "index.html")

@frontend_bp.route("/broadcaster")
def serve_app_index():
    app_path = os.path.join(BASE_DIR, "broadcaster")
    return send_from_directory(app_path, "obs-web.html")

@frontend_bp.route("/apps/<appname>/<path:filename>")
def serve_app_files(appname, filename):
    app_path = os.path.join(BASE_DIR, appname)
    return send_from_directory(app_path, filename)
