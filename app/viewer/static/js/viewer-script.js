const video = document.getElementById('radio-stream');
const brb = document.getElementById('brb-standby');
const socket = io();  // Connect to your Flask-SocketIO server
let peerConnection = null;

// Toggle BRB image and video
function showBRB(show) {
    if (show) {
        brb.style.display = 'block';
        video.style.display = 'none';
    } else {
        brb.style.display = 'none';
        video.style.display = 'block';
    }
}

// Initial state: show standby screen
showBRB(true);

// Socket connection opened
socket.on('connect', () => {
    console.log('[Viewer] Connected to signaling server:', socket.id);
    console.log('[Viewer] Emitting "watcher" to request stream');
    socket.emit('watcher');
});

// Received WebRTC offer from broadcaster
socket.on('offer', async (id, description) => {
    console.log('[Viewer] Received offer from broadcaster:', id);
    
    // Create peer connection
    peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ]
    });

    peerConnection.ontrack = event => {
        console.log('[Viewer] Received track from broadcaster');
        video.srcObject = event.streams[0];
        showBRB(false);
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            console.log('[Viewer] Sending ICE candidate to broadcaster:', event.candidate);
            socket.emit('candidate', id, event.candidate);
        }
    };

    peerConnection.onconnectionstatechange = () => {
        console.log('[Viewer] Connection state changed:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
            showBRB(true);
            console.warn('[Viewer] Connection lost, showing BRB.');
        }
    };

    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(description));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        console.log('[Viewer] Sending answer to broadcaster');
        socket.emit('answer', id, peerConnection.localDescription);
    } catch (err) {
        console.error('[Viewer] Error during offer handling:', err);
    }
});

// Handle ICE candidates from broadcaster
socket.on('candidate', (id, candidate) => {
    console.log('[Viewer] Received ICE candidate from broadcaster:', candidate);
    if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
            .then(() => console.log('[Viewer] ICE candidate added successfully'))
            .catch(err => console.error('[Viewer] Error adding ICE candidate:', err));
    }
});

// If broadcaster restarts, re-emit watcher
socket.on('broadcaster', () => {
    console.log('[Viewer] Broadcaster rejoined, re-emitting watcher');
    socket.emit('watcher');
});

// Handle broadcaster disconnect
socket.on('disconnectPeer', id => {
    console.warn('[Viewer] Peer disconnected:', id);
    showBRB(true);
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
});

// Cleanup on page unload
window.onbeforeunload = () => {
    console.log('[Viewer] Unloading page, closing socket and peerConnection');
    socket.close();
    if (peerConnection) peerConnection.close();
};

// Fallback BRB logic on stream end
video.onpause = video.onended = function () {
    if (!video.srcObject || video.paused || video.ended) {
        console.log('[Viewer] Video paused or ended, showing BRB');
        showBRB(true);
    }
};
