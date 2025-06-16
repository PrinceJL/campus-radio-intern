from flask import Blueprint, current_app
from flask_sock import Sock
import socket
import os

broadcast_bp = Blueprint("broadcast", __name__)
sock = Sock()

FFMPEG_HOST = os.environ.get("FFMPEG_HOST", "ffmpeg")
FFMPEG_PORT = int(os.environ.get("FFMPEG_PORT", 9000))

@sock.route("/api/broadcast")
def broadcast(ws):
    sock_out = socket.create_connection((FFMPEG_HOST, FFMPEG_PORT))
    try:
        while True:
            data = ws.receive()
            if data is None:
                break
            if isinstance(data, str):
                data = data.encode("utf-8")
            sock_out.sendall(data)
    except Exception as e:
        current_app.logger.error(f"Broadcast error: {e}")
    finally:
        sock_out.close()