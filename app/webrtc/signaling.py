from flask import Blueprint, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room

webrtc_bp = Blueprint('webrtc', __name__)
socketio = SocketIO(cors_allowed_origins="*")

@webrtc_bp.route('/broadcaster')
def broadcaster():
    return render_template('broadcaster_webrtc.html')

@webrtc_bp.route('/viewer')
def viewer():
    return render_template('viewer_webrtc.html')

# Signaling events
@socketio.on('signal')
def handle_signal(data):
    # data: {to, from, signal}
    emit('signal', data, room=data['to'])

@socketio.on('join')
def handle_join(data):
    # data: {room, id}
    join_room(data['room'])
    emit('joined', {'id': data['id']}, room=data['room'])