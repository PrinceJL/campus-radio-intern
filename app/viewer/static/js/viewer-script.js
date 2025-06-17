const video = document.getElementById('radio-stream');
const brb = document.getElementById('brb-standby');
const socket = io();
let peerConnection;

// Utility to show/hide BRB image and video
function showBRB(show) {
    if (show) {
        brb.style.display = 'block';
        video.style.display = 'none';
    } else {
        brb.style.display = 'none';
        video.style.display = 'block';
    }
}

// Show BRB by default
showBRB(true);

socket.on('connect', () => {
    socket.emit('watcher');
});

socket.on('offer', async (id, description) => {
    peerConnection = new RTCPeerConnection();
    await peerConnection.setRemoteDescription(description);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', id, peerConnection.localDescription);

    peerConnection.ontrack = event => {
        video.srcObject = event.streams[0];
        showBRB(false); // Hide BRB when stream starts
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('candidate', id, event.candidate);
        }
    };
});

socket.on('candidate', (id, candidate) => {
    if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
});

socket.on('broadcaster', () => {
    socket.emit('watcher');
});

window.onunload = window.onbeforeunload = () => {
    socket.close();
    if (peerConnection) peerConnection.close();
};

// Show BRB if stream ends or is interrupted
video.onpause = video.onended = function() {
    // Only show BRB if the stream is not playing
    if (!video.srcObject || video.paused || video.ended) {
        showBRB(true);
    }
};

// Fullscreen button logic
document.getElementById('fullscreen-btn').onclick = function() {
    if (video.requestFullscreen) {
        video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
    }
};

// Captions button logic (toggle captions track)
document.getElementById('captions-btn').onclick = function() {
    let tracks = video.textTracks;
    if (tracks.length > 0) {
        let showing = tracks[0].mode === "showing";
        tracks[0].mode = showing ? "hidden" : "showing";
    } else {
        alert("No captions available.");
    }
};

// Settings button logic (placeholder)
document.getElementById('settings-btn').onclick = function() {
    alert("Settings coming soon!");
};