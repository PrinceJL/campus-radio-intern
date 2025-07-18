from flask import Flask, redirect, url_for
from broadcaster.routes import broadcaster_bp
from viewer.routes import viewer_bp
from blueprints.scenes import scenes_bp 
from blueprints.uploads import uploads_bp
from blueprints.webrtc import register_webrtc_events
from blueprints.playlist import playlist_bp
from blueprints.authentication import auth_bp
from flask_socketio import SocketIO
from dotenv import load_dotenv
import os

def create_app():
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
    app = Flask(__name__)
    app.secret_key = os.environ.get('SECRET_KEY')

    app.register_blueprint(broadcaster_bp, url_prefix='/broadcaster')
    app.register_blueprint(viewer_bp, url_prefix='/viewer')
    app.register_blueprint(scenes_bp)
    app.register_blueprint(uploads_bp)
    app.register_blueprint(playlist_bp)
    app.register_blueprint(auth_bp)


    @app.route('/')
    def index():
        return redirect(url_for('viewer.viewer_home')) 
 
    return app

if __name__ == "__main__":
    app = create_app()
    socketio = SocketIO(app, async_mode="threading", cors_allowed_origins="*")    
    register_webrtc_events(socketio)
    socketio.run(app, host="0.0.0.0",ssl_context=("cheersslcert.pem", "cheersslkey.pem"), port=8080, allow_unsafe_werkzeug=True)
    #enter this into socketio.run parameters if final
    #ssl_context=("cheerslcert.pem", "cheerslkey.pem")