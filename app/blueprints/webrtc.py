from flask import Blueprint, request
from flask_socketio import emit

webrtc_bp = Blueprint('webrtc', __name__)

broadcaster_sid = None

def register_webrtc_events(socketio):
    @socketio.on('broadcaster')
    def handle_broadcaster():
        global broadcaster_sid
        broadcaster_sid = request.sid
        emit('broadcaster', broadcast=True, include_self=False)

    @socketio.on('watcher')
    def handle_watcher():
        if broadcaster_sid:
            emit('watcher', request.sid, room=broadcaster_sid)

    @socketio.on('offer')
    def handle_offer(watcher_id, description):
        emit('offer', (request.sid, description), room=watcher_id)

    @socketio.on('answer')
    def handle_answer(broadcaster_id, description):
        emit('answer', (request.sid, description), room=broadcaster_id)

    @socketio.on('candidate')
    def handle_candidate(peer_id, candidate):
        emit('candidate', (request.sid, candidate), room=peer_id)

    @socketio.on('disconnect')
    def handle_disconnect():
        emit('disconnectPeer', request.sid, broadcast=True)