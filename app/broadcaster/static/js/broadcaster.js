import { setupUploadManager } from './file-handler.js';
import { setupNowPlayingControls, listAllPlaylists } from './playlist-manager.js';

let currentStream = null;
let selectedDeviceId = null;
let peerConnections = {};
let pendingCandidates = {};

const startBtn = document.getElementById('startStream');
const stopBtn = document.getElementById('stopStream');
const statusDiv = document.getElementById('broadcast-status');

export const mainPreview = document.createElement('video');
mainPreview.autoplay = true;
mainPreview.muted = true;
mainPreview.playsInline = true;
mainPreview.style.width = "100%";
mainPreview.style.height = "100%";

const socket = io();

// ---------------- INIT ----------------
document.addEventListener('DOMContentLoaded', async () => {
    setupNowPlayingControls();
    listAllPlaylists();
    setupUploadManager();
    setupThemeToggle();

    const container = document.getElementById('stream-preview-area');
    if (container) {
        container.innerHTML = '';
        container.appendChild(mainPreview);
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
            const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: cam.deviceId }, audio: false });
            video.srcObject = stream;
        } catch (e) {
            console.warn("Camera preview error:", e);
        }

        video.onclick = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: cam.deviceId }, audio: true });
                await switchToStream(stream);
            } catch (err) {
                statusDiv.textContent = "Camera access error.";
            }
        };

        container.appendChild(video);
    }
}

// ---------------- STREAM CONTROL ----------------

startBtn?.addEventListener('click', () => {
    if (!currentStream) return alert("Nothing to stream.");
    socket.emit('broadcaster');
    statusDiv.textContent = "Broadcasting...";
});

stopBtn?.addEventListener('click', () => {
    Object.values(peerConnections).forEach(pc => pc.close());
    peerConnections = {};
    socket.emit('stop-broadcast');
    statusDiv.textContent = "Broadcast stopped.";
});

export async function switchToStream(stream) {
  if (currentStream) currentStream.getTracks().forEach(track => track.stop());
  currentStream = stream;

  // ONLY override mainPreview.srcObject if it's not already playing a video file
  if (!mainPreview.src || mainPreview.srcObject) {
    mainPreview.srcObject = stream;
    try {
      await mainPreview.play();
    } catch (err) {
      console.warn('[DBG] mainPreview play() failed in switchToStream:', err);
    }
  } else {
    console.log('[DBG] mainPreview already playing video file. Skipping srcObject override.');
  }

  // Reset peer connections
  Object.entries(peerConnections).forEach(([id, pc]) => {
    pc.close();
    delete peerConnections[id];
  });

  socket.emit('broadcaster');
  statusDiv.textContent = "Broadcasting new stream.";
}


export function rebroadcastStreamFrom(videoEl) {
    const stream = videoEl.captureStream?.();
    if (stream) switchToStream(stream);
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
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peerConnections[id] = pc;
    currentStream.getTracks().forEach(track => pc.addTrack(track, currentStream));

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
    peerConnections[id]?.close();
    delete peerConnections[id];
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
