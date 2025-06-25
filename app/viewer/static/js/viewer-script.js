const video = document.getElementById('radio-stream');
const brb = document.getElementById('brb-standby');
const socket = io();  // Connect to your Flask-SocketIO server
let peerConnection = null;

function showBRB(show) {
    brb.style.display = show ? 'block' : 'none';
    video.style.display = show ? 'none' : 'block';
}

showBRB(true);

// When connected to the signaling server
socket.on('connect', () => {
    console.log('[Viewer] Connected to signaling server');
    socket.emit('watcher');  // Notify broadcaster you're ready to watch
});

// When the broadcaster sends an offer
socket.on('offer', async (id, description) => {
    console.log('[Viewer] Received offer from broadcaster:', id);

    peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    let receivedStream = null;

    peerConnection.ontrack = event => {
        console.log('[Viewer] Received track from broadcaster:', event.track.kind);

        if (!receivedStream) {
            receivedStream = new MediaStream();
            video.srcObject = receivedStream;
        }

        // Add the new track if not already in the stream
        if (!receivedStream.getTracks().includes(event.track)) {
            receivedStream.addTrack(event.track);
        }

        showBRB(false);
        video.muted = false;

        video.play().catch(e => {
            console.warn('[Viewer] Autoplay blocked:', e);
        });
    };


    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            console.log('[Viewer] Sending ICE candidate to broadcaster');
            socket.emit('candidate', id, event.candidate);
        }
    };

    peerConnection.onconnectionstatechange = () => {
        console.log('[Viewer] Connection state:', peerConnection.connectionState);
        if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
            showBRB(true);
        }
    };

    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(description));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', id, peerConnection.localDescription);
        console.log('[Viewer] Sent answer back to broadcaster');
    } catch (err) {
        console.error('[Viewer] Error handling offer:', err);
        showBRB(true);
    }
});

// Handle incoming ICE candidates from broadcaster
socket.on('candidate', (id, candidate) => {
    if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
            .then(() => console.log('[Viewer] ICE candidate added'))
            .catch(err => console.error('[Viewer] Error adding ICE candidate:', err));
    }
});

// Broadcaster is back (e.g. restarted)
socket.on('broadcaster', () => {
    console.log('[Viewer] Broadcaster rejoined, re-emitting watcher');
    socket.emit('watcher');
});

// When explicitly told to disconnect (e.g. broadcaster closes)
socket.on('disconnectPeer', id => {
    console.warn('[Viewer] Peer disconnected:', id);
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    showBRB(true);
});

// Handle page unload
window.onbeforeunload = () => {
    console.log('[Viewer] Closing viewer');
    socket.close();
    if (peerConnection) {
        peerConnection.close();
    }
};

// Fallback BRB if stream ends
video.onended = () => {
    if (!video.srcObject || video.paused || video.ended) {
        console.log('[Viewer] Video paused or ended');
        showBRB(true);
    }
};

let tickerTimeouts = [];

socket.on('start-ticker', ({ message, speed, loops, interval }) => {
    console.log("[Viewer] Received start-ticker:", message, speed, loops, interval);
    const tickerContainer = document.getElementById('ticker-container');
    const tickerText = document.getElementById('ticker-content');
    tickerText.textContent = message;

    // Apply speed (animation duration)
    tickerText.style.animationDuration = `${speed}s`;

    tickerContainer.style.display = 'block';

    // Clear previous timers
    tickerTimeouts.forEach(clearTimeout);
    tickerTimeouts = [];

    let count = 0;
    const loopTicker = () => {
        tickerContainer.style.display = 'block';
        tickerText.style.animation = 'none';
        // Force reflow
        void tickerText.offsetWidth;
        tickerText.style.animation = `scroll-left ${speed}s linear`;

        count++;
        if (loops === 0 || count < loops) {
            tickerTimeouts.push(setTimeout(loopTicker, (speed + interval) * 1000));
        }
    };

    loopTicker();
});

socket.on('stop-ticker', () => {
    const tickerContainer = document.getElementById('ticker-container');
    console.log("[Viewer] Received stop-ticker");
    tickerContainer.style.display = 'none';
    tickerTimeouts.forEach(clearTimeout);
    tickerTimeouts = [];
});
