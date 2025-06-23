// broadcaster.js

import { setupUploadManager } from './file-handler.js';
import { setupPlaylistControls, listAllPlaylists } from './playlist-manager.js';

// Global state
let currentStream = null;
let selectedDeviceId = null;
let peerConnections = {};     // viewer connections
let pendingCandidates = {};   // ICE candidates waiting for peer setup

// DOM Elements
const previewBoxes = document.querySelectorAll('.camera-previews video');
const startBtn = document.getElementById('startStream');
const stopBtn = document.getElementById('stopStream');
const statusDiv = document.getElementById('broadcast-status');
//const webcamSelect = document.getElementById('webcamSelect');

export const mainPreview = document.createElement('video');
mainPreview.autoplay = true;
mainPreview.muted = true;
mainPreview.playsInline = true;
mainPreview.style.width = "100%";
mainPreview.style.height = "100%";

const socket = io();
console.log("[Init] Socket.IO initialized.");

// Initialization

document.addEventListener('DOMContentLoaded', async () => {
    console.log("[DOM] Initializing controls and preview");
    setupPlaylistControls();
    listAllPlaylists();
    setupUploadManager();

    const previewContainer = document.getElementById('stream-preview-area');
    if (previewContainer) {
        previewContainer.innerHTML = '';
        previewContainer.appendChild(mainPreview);
    }

    setupThemeToggle();
    await populateCameraPreviews();

    if (previewBoxes[0] && previewBoxes[0].dataset.deviceId) {
        previewBoxes[0].click();
    }

    statusDiv.textContent = "Select a camera or load media to preview and stream.";
});

function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        themeToggle.textContent = 'Switch to Dark Mode';
    }

    themeToggle.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        themeToggle.textContent = isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode';
    });
}

// ----- Camera Listing & Preview -----

async function listCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    webcamSelect.innerHTML = '';

    devices.filter(d => d.kind === 'videoinput').forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `Camera ${index + 1}`;
        webcamSelect.appendChild(option);
        console.log(`[Camera] Found: ${option.text}`);
    });
}

async function startCameraPreview(deviceId, previewEl) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: deviceId } },
            audio: false
        });
        previewEl.srcObject = stream;
        previewEl.dataset.deviceId = deviceId;
        console.log(`[Camera] Preview started for ${deviceId}`);
        return stream;
    } catch (error) {
        console.error("[Error] Accessing camera:", error);
        statusDiv.textContent = "Camera error: " + error.message;
        return null;
    }
}

async function populateCameraPreviews() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');

    const container = document.querySelector('.camera-list');
    if (!container) return;

    container.innerHTML = ''; // Clear old cameras

    for (let i = 0; i < cameras.length; i++) {
        const video = document.createElement('video');
        video.classList.add('camera-card');
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.dataset.deviceId = cameras[i].deviceId;

        container.appendChild(video);
        await startCameraPreview(cameras[i].deviceId, video);

        // Attach click for camera selection
        video.addEventListener('click', async () => {
            selectedDeviceId = video.dataset.deviceId;
            console.log(`[Select] Camera selected: ${selectedDeviceId}`);

            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: selectedDeviceId } },
                audio: true
            });

            if (currentStream) {
                const newVideoTrack = newStream.getVideoTracks()[0];
                const newAudioTrack = newStream.getAudioTracks()[0];

                Object.values(peerConnections).forEach(pc => {
                    pc.getSenders().forEach(sender => {
                        if (sender.track.kind === 'video' && newVideoTrack) sender.replaceTrack(newVideoTrack);
                        if (sender.track.kind === 'audio' && newAudioTrack) sender.replaceTrack(newAudioTrack);
                    });
                });

                currentStream.getTracks().forEach(track => track.stop());
            }

            currentStream = newStream;
            mainPreview.srcObject = currentStream;
            statusDiv.textContent = "Camera selected for streaming.";
        });
    }

    if (cameras.length > 0) {
        selectedDeviceId = cameras[0].deviceId;
        mainPreview.srcObject = container.firstChild.srcObject;
        statusDiv.textContent = "Camera previews loaded. Click one to select.";
    } else {
        statusDiv.textContent = "No cameras detected.";
    }
}

// ----- Camera Selection -----

previewBoxes.forEach(box => {
    box.onclick = async () => {
        selectedDeviceId = box.dataset.deviceId;
        console.log(`[Select] Camera selected: ${selectedDeviceId}`);

        const newStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: selectedDeviceId } },
            audio: true
        });

        if (currentStream) {
            console.log("[Stream] Replacing tracks in current stream");
            const newVideoTrack = newStream.getVideoTracks()[0];
            const newAudioTrack = newStream.getAudioTracks()[0];

            Object.values(peerConnections).forEach(pc => {
                pc.getSenders().forEach(sender => {
                    if (sender.track.kind === 'video' && newVideoTrack) sender.replaceTrack(newVideoTrack);
                    if (sender.track.kind === 'audio' && newAudioTrack) sender.replaceTrack(newAudioTrack);
                });
            });

            currentStream.getTracks().forEach(track => track.stop());
        }

        currentStream = newStream;
        mainPreview.srcObject = currentStream;
        statusDiv.textContent = "Camera selected for streaming.";
    };
});

// ----- Start & Stop Broadcasting -----

startBtn?.addEventListener('click', () => {
    const stream = currentStream || mainPreview.srcObject;
    if (!stream) {
        alert("Nothing to stream! Please select a camera or load a video.");
        statusDiv.textContent = "No media selected for streaming.";
        return;
    }

    currentStream = stream;
    socket.emit('broadcaster');
    console.log("[Broadcast] Broadcasting started");
    statusDiv.textContent = "Broadcasting...";
});

stopBtn?.addEventListener('click', () => {
    Object.values(peerConnections).forEach(pc => pc.close());
    peerConnections = {};
    socket.emit('stop-broadcast');
    console.log("[Broadcast] Broadcasting stopped");
    statusDiv.textContent = "Broadcast stopped.";
});

// ----- WebRTC Signaling -----

socket.on('watcher', async (id) => {
    if (!currentStream) return;
    console.log(`[WebRTC] Watcher connected: ${id}`);

    const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerConnections[id] = pc;
    currentStream.getTracks().forEach(track => pc.addTrack(track, currentStream));

    pc.onicecandidate = e => e.candidate && socket.emit('candidate', id, e.candidate);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('offer', id, pc.localDescription);
});

socket.on('answer', (id, description) => {
    const pc = peerConnections[id];
    if (!pc) return;
    pc.setRemoteDescription(description).then(() => {
        (pendingCandidates[id] || []).forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)));
        delete pendingCandidates[id];
    });
});

socket.on('candidate', (id, candidate) => {
    const pc = peerConnections[id];
    if (pc?.remoteDescription) {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
        pendingCandidates[id] = pendingCandidates[id] || [];
        pendingCandidates[id].push(candidate);
    }
});

socket.on('disconnectPeer', id => {
    if (peerConnections[id]) {
        peerConnections[id].close();
        delete peerConnections[id];
        console.log(`[WebRTC] Peer disconnected: ${id}`);
    }
});

socket.on('connect', () => {
    console.log('[Socket] Reconnected to signaling server.');
    if (currentStream?.getTracks().length) socket.emit('broadcaster');
});

window.onbeforeunload = () => {
    socket.close();
    Object.values(peerConnections).forEach(pc => pc.close());
};

// ----- Rebroadcast Utility -----

export function rebroadcastStreamFrom(mainVideoEl) {
    const stream = mainVideoEl.captureStream?.() || mainVideoEl.mozCaptureStream?.();
    if (!stream) return;

    if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
    }

    currentStream = stream;
    Object.values(peerConnections).forEach(pc => {
        stream.getTracks().forEach(track => {
            const sender = pc.getSenders().find(s => s.track.kind === track.kind);
            if (sender) sender.replaceTrack(track);
            else pc.addTrack(track, stream);
        });
    });

    socket.emit('broadcaster');
    console.log("[Broadcast] Rebroadcast initiated from captured stream");
}

// Global access for debugging
window.currentStream = currentStream;
window.peerConnections = peerConnections;
window.socket = socket;
