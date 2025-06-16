from blueprints.frontend import frontend_bp
from blueprints.hls import hls_bp
from blueprints.media import media_bp
from blueprints.api import api_bp
from blueprints.broadcast import broadcast_bp, sock
from flask import Flask

def create_app():
    app = Flask(__name__)
    app.register_blueprint(frontend_bp)
    app.register_blueprint(hls_bp)
    app.register_blueprint(media_bp)
    app.register_blueprint(api_bp)
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=8080)