import { setupUploadManager } from './file-handler.js';
import { setupNowPlayingControls, listAllPlaylists } from './playlist-manager.js';
import { startSessionTimer, stopSessionTimer, incrementViewerCount, decrementViewerCount } from './stream-utils.js';

let currentStream = null;
let selectedDeviceId = null;
let peerConnections = {};
let pendingCandidates = {}
let connectedViewers = new Set();
let isStreaming = false;
let isMuted = false;

const muteBtn = document.getElementById('muteStream');
const startBtn = document.getElementById('startStream');
const stopBtn = document.getElementById('stopStream');
const statusDiv = document.getElementById('broadcast-status');

export const cameraPreview = document.createElement('video');
cameraPreview.autoplay = true;
cameraPreview.muted = true;
cameraPreview.playsInline = true;
cameraPreview.style.width = "100%";
cameraPreview.style.height = "100%";

export const videoPreview = document.createElement('video');
videoPreview.controls = true;
videoPreview.autoplay = true;
videoPreview.playsInline = true;
videoPreview.style.width = "100%";
videoPreview.style.height = "100%";

export const audioA = document.createElement('audio');
audioA.autoplay = true;

const socket = io();

// ---------------- INIT ----------------
// Setup ticker controls
document.getElementById('startTickerBtn').addEventListener('click', () => {
    const message = document.getElementById('tickerMessage').value;
    const speed = parseFloat(document.getElementById('tickerSpeed').value) || 10;
    const loops = parseInt(document.getElementById('tickerLoops').value) || 0;
    const interval = parseFloat(document.getElementById('tickerInterval').value) || 0;
    console.log("[Broadcaster] Sent start-ticker");
    socket.emit('start-ticker', {
        message,
        speed,
        loops,
        interval
    });
});
// Stop ticker
document.getElementById('stopTickerBtn').addEventListener('click', () => {
    socket.emit('stop-ticker');
    console.log("[Broadcaster] Sent stop-ticker");
});


document.addEventListener('DOMContentLoaded', async () => {
    setupNowPlayingControls();
    listAllPlaylists();
    setupUploadManager();
    setupThemeToggle();

    // Mount the video element in both containers
    const videoDiv = document.getElementById('video-preview-container');
    const cameraDiv = document.getElementById('camera-preview-container');

    if (videoDiv) {
        videoDiv.innerHTML = '';
        videoDiv.appendChild(videoPreview);
    }
    if (cameraDiv) {
        cameraDiv.innerHTML = '';
        cameraDiv.appendChild(cameraPreview);
    }


    await populateCameraPreviews();
    statusDiv.textContent = "Select a camera or video to stream.";
});


// ---------------- CAMERA HANDLING ----------------
async function populateCameraPreviews() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');
    const container = document.querySelector('.camera-list');
    if (!container) return;

    container.innerHTML = '';
    for (const cam of cameras) {
        const video = document.createElement('video');
        video.classList.add('camera-card');
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.dataset.deviceId = cam.deviceId;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: { exact: cam.deviceId },
                    frameRate: { ideal: 60, max: 60 },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            video.srcObject = stream;
        } catch (e) {
            console.warn("Camera preview error:", e);
        }

        video.onclick = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        deviceId: { exact: cam.deviceId },
                        frameRate: { ideal: 60, max: 60 },
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    },
                    audio: true
                });
                pauseVideoIfPlaying();
                toggleVisibility('camera');
                await switchToStream(stream);
            } catch (err) {
                statusDiv.textContent = "Camera access error.";
                console.log("Camera access error:", err);
            }
        };

        container.appendChild(video);
    }
}
function pauseVideoIfPlaying() {
    if (!videoPreview.paused && !videoPreview.srcObject) {
        videoPreview.pause();
    }
}

function toggleVisibility(source) {
    const cameraDiv = document.getElementById('camera-preview-container');
    const videoDiv = document.getElementById('video-preview-container');
    if (source === 'camera') {
        cameraDiv.style.display = 'block';
        videoDiv.style.display = 'none';
    } else if (source === 'video') {
        videoDiv.style.display = 'block';
        cameraDiv.style.display = 'none';
    }
}
// ---------------- STREAM CONTROL ----------------
muteBtn?.addEventListener('click', () => {
    isMuted = !isMuted;
    muteStream();
    muteBtn.textContent = isMuted ? "Unmute" : "Mute";

});

startBtn?.addEventListener('click', () => {
    if (!currentStream) return alert("Nothing to stream.");
    socket.emit('broadcaster');
    statusDiv.textContent = "Broadcasting...";
    startSessionTimer();

    isStreaming = true;
});

stopBtn?.addEventListener('click', () => {
    Object.values(peerConnections).forEach(pc => pc.close());
    peerConnections = {};
    socket.emit('stop-broadcast');
    statusDiv.textContent = "Broadcast stopped.";
    stopSessionTimer();
    isStreaming = false;
});
function muteStream(applyToCurrent = true) {
    if (applyToCurrent && currentStream) {
        currentStream.getAudioTracks().forEach(track => {
            track.enabled = !isMuted;
        });
    }
    statusDiv.textContent = isMuted ? "Audio muted for viewers." : "Audio unmuted.";
}

export async function switchToStream(stream) {
    if (currentStream) currentStream.getTracks().forEach(track => track.stop());
    currentStream = stream;

    cameraPreview.srcObject = null;
    cameraPreview.srcObject = stream;

    try {
        await cameraPreview.play();
    } catch (err) {
        console.warn('[DBG] cameraPreview play() failed:', err);
    }

    Object.entries(peerConnections).forEach(([id, pc]) => {
        pc.close();
        delete peerConnections[id];
    });
    if (isStreaming) {
        socket.emit('broadcaster');
        statusDiv.textContent = "Broadcasting new stream.";
        if (isMuted) {
            muteStream();
        }
    }
}

export function rebroadcastStreamFrom(videoEl) {
    const stream = videoEl.captureStream?.();
    if (stream) {
        videoPreview.srcObject = null;
        videoPreview.src = videoEl.src;
        videoPreview.play();
        switchToStream(stream);
    }
}


// ---------------- THEME TOGGLE ----------------
function setupThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;
    const saved = localStorage.getItem('theme');
    if (saved === 'light') document.body.classList.add('light-mode');
    toggle.onclick = () => {
        const isLight = document.body.classList.toggle('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        toggle.textContent = isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode';
    };
}

// ---------------- WEBRTC SIGNALING ----------------
socket.on('watcher', async (id) => {
    if (!currentStream) return;

    if (!connectedViewers.has(id)) {
        connectedViewers.add(id);
        incrementViewerCount();
    }

    const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerConnections[id] = pc;

    currentStream.getTracks().forEach(track => pc.addTrack(track, currentStream));

    // Adjust bitrate for high quality (e.g., 60fps)
    const sender = pc.getSenders().find(s => s.track.kind === 'video');
    if (sender) {
        const params = sender.getParameters();
        if (!params.encodings) params.encodings = [{}];
        params.encodings[0].maxBitrate = 3_000_000; // ~3 Mbps
        sender.setParameters(params).catch(err => {
            console.warn(`Failed to set parameters for sender ${id}:`, err);
        });
    }

    pc.onicecandidate = e => {
        if (e.candidate) socket.emit('candidate', id, e.candidate);
    };

    try {
        await pc.setLocalDescription(await pc.createOffer());
        socket.emit('offer', id, pc.localDescription);
    } catch (err) {
        console.error(`Offer error for ${id}:`, err);
    }
});

socket.on('answer', async (id, desc) => {
    const pc = peerConnections[id];
    if (!pc) return;
    try {
        await pc.setRemoteDescription(desc);
        if (pendingCandidates[id]) {
            for (const c of pendingCandidates[id]) pc.addIceCandidate(new RTCIceCandidate(c));
            delete pendingCandidates[id];
        }
    } catch (e) {
        console.error(`Answer error for ${id}:`, e);
    }
});

socket.on('candidate', (id, candidate) => {
    const pc = peerConnections[id];
    if (pc?.remoteDescription) pc.addIceCandidate(new RTCIceCandidate(candidate));
    else (pendingCandidates[id] = pendingCandidates[id] || []).push(candidate);
});

socket.on('disconnectPeer', id => {
    if (peerConnections[id]) {
        peerConnections[id].close();
        delete peerConnections[id];
    }
    if (connectedViewers.has(id)) {
        connectedViewers.delete(id);
        decrementViewerCount();
    }
});

socket.on('connect', () => {
    if (currentStream?.getTracks().length) socket.emit('broadcaster');
});

window.onbeforeunload = () => {
    socket.close();
    Object.values(peerConnections).forEach(pc => pc.close());
};

// Debug access
window.currentStream = currentStream;
window.peerConnections = peerConnections;
window.socket = socket;

// Highlight for uploaded-media
document.addEventListener('click', function (e) {
    // Uploaded media
    if (e.target.closest('.uploaded-media')) {
        document.querySelectorAll('.uploaded-media.selected').forEach(el => el.classList.remove('selected'));
        e.target.closest('.uploaded-media').classList.add('selected');
    }
    // Camera card
    else if (e.target.closest('.camera-card')) {
        document.querySelectorAll('.camera-card.selected').forEach(el => el.classList.remove('selected'));
        e.target.closest('.camera-card').classList.add('selected');
    }
});