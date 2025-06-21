import { setupUploadManager } from './file-handler.js';
import { setupPlaylistControls, listAllPlaylists } from './playlist-manager.js';

let currentStream = null;           // Main stream to broadcast (camera or file)
let selectedDeviceId = null;        // Camera ID selected by user
const previewBoxes = document.querySelectorAll('.camera-previews video');

export const mainPreview = document.createElement('video'); // Main broadcast preview
mainPreview.autoplay = true;
mainPreview.muted = true;
mainPreview.playsInline = true;
mainPreview.style.width = "100%";
mainPreview.style.height = "100%";

const startBtn = document.getElementById('startStream');
const stopBtn = document.getElementById('stopStream');
const statusDiv = document.getElementById('broadcast-status');
const webcamSelect = document.getElementById('webcamSelect');

const socket = io();
let peerConnections = {};           // Connected viewers
let pendingCandidates = {};         // ICE candidates before peer is ready

console.log("Socket.IO initialized.");

document.addEventListener('DOMContentLoaded', async () => {
    // Setup UI controls and upload system
    setupPlaylistControls();
    listAllPlaylists();
    setupUploadManager();

    // Mount stream preview
    const previewContainer = document.getElementById('stream-preview-area');
    if (previewContainer) {
        previewContainer.innerHTML = '';
        previewContainer.appendChild(mainPreview);
    }

    // Setup theme toggling
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
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

    // Populate camera previews
    await populateCameraPreviews();
    if (previewBoxes[0] && previewBoxes[0].dataset.deviceId) {
        previewBoxes[0].click();
    }

    if (statusDiv) {
        statusDiv.textContent = "Select a camera or load media to preview and stream.";
    }
});

// ----- Camera Listing & Preview -----

async function listCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    webcamSelect.innerHTML = '';

    devices.filter(d => d.kind === 'videoinput').forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `Camera ${index + 1}`;
        webcamSelect.appendChild(option);
        console.log("Camera found:", option.text);
    });
}

async function startCameraPreview(deviceId, previewEl) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: deviceId ? { exact: deviceId } : undefined },
            audio: false
        });
        previewEl.srcObject = stream;
        previewEl.dataset.deviceId = deviceId;
        console.log("Preview started for camera:", deviceId);
        return stream;
    } catch (error) {
        console.error("Error accessing camera:", error);
        if (statusDiv) statusDiv.textContent = "Camera error: " + error.message;
        return null;
    }
}

async function populateCameraPreviews() {
    await listCameras();

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');

    for (let i = 0; i < previewBoxes.length; i++) {
        if (cameras[i]) {
            await startCameraPreview(cameras[i].deviceId, previewBoxes[i]);
            previewBoxes[i].style.display = '';
        } else {
            previewBoxes[i].style.display = 'none';
        }
    }
}

// ----- Camera Selection -----

previewBoxes.forEach(box => {
    box.onclick = async function () {
        selectedDeviceId = box.dataset.deviceId;

        const newStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: selectedDeviceId } },
            audio: true
        });

        if (currentStream) {
            const newVideoTrack = newStream.getVideoTracks()[0];
            const newAudioTrack = newStream.getAudioTracks()[0];

            for (const id in peerConnections) {
                const pc = peerConnections[id];
                pc.getSenders().forEach(sender => {
                    if (sender.track.kind === 'video' && newVideoTrack) {
                        sender.replaceTrack(newVideoTrack);
                    }
                    if (sender.track.kind === 'audio' && newAudioTrack) {
                        sender.replaceTrack(newAudioTrack);
                    }
                });
            }

            currentStream.getTracks().forEach(track => track.stop());
        }

        currentStream = newStream;
        mainPreview.srcObject = currentStream;
        if (statusDiv) statusDiv.textContent = "Camera selected for streaming.";
    };
});

// ----- Start & Stop Broadcasting -----

startBtn?.addEventListener('click', () => {

    const stream = window.currentStream || mainPreview.srcObject;
    if (!stream) {
        alert("Nothing to stream! Please select a camera or load a video.");
        if (statusDiv) statusDiv.textContent = "No media selected for streaming.";
        return;
    }
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
    currentStream = stream; // Use what's in preview, even if it's not from a camera
    socket.emit('broadcaster');
    if (statusDiv) statusDiv.textContent = "Broadcasting...";
});

stopBtn?.addEventListener('click', () => {
    Object.values(peerConnections).forEach(pc => pc.close());
    peerConnections = {};
    socket.emit('stop-broadcast');
    if (statusDiv) statusDiv.textContent = "Broadcast stopped.";
});

// ----- WebRTC Signaling -----

socket.on('watcher', async (id) => {
    if (!currentStream) return;

    const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerConnections[id] = pc;
    currentStream.getTracks().forEach(track => pc.addTrack(track, currentStream));

    pc.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('candidate', id, event.candidate);
        }
    };

    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', id, pc.localDescription);
    } catch (err) {
        console.error(`Error creating offer for ${id}:`, err);
    }
});

socket.on('answer', (id, description) => {
    const pc = peerConnections[id];
    if (pc) {
        pc.setRemoteDescription(description).then(() => {
            if (pendingCandidates[id]) {
                pendingCandidates[id].forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)));
                delete pendingCandidates[id];
            }
        });
    }
});

socket.on('candidate', (id, candidate) => {
    const pc = peerConnections[id];
    if (pc && pc.remoteDescription) {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
        if (!pendingCandidates[id]) pendingCandidates[id] = [];
        pendingCandidates[id].push(candidate);
    }
});

socket.on('disconnectPeer', id => {
    if (peerConnections[id]) {
        peerConnections[id].close();
        delete peerConnections[id];
    }
});

socket.on('connect', () => {
    console.log('Reconnected to signaling server.');
    if (currentStream?.getTracks().length) {
        socket.emit('broadcaster');
    }
});

window.onbeforeunload = () => {
    socket.close();
    Object.values(peerConnections).forEach(pc => pc.close());
};

export function rebroadcastStreamFrom(mainVideoEl) {
  const stream = mainVideoEl.captureStream?.() || mainVideoEl.mozCaptureStream?.();
  if (!stream) return;

  if (window.currentStream) {
    window.currentStream.getTracks().forEach(t => t.stop());
  }

  window.currentStream = stream;

  for (const id in window.peerConnections) {
    const pc = window.peerConnections[id];
    const senders = pc.getSenders();

    stream.getTracks().forEach(track => {
      const sender = senders.find(s => s.track.kind === track.kind);
      if (sender) {
        sender.replaceTrack(track);
      } else {
        pc.addTrack(track, stream);
      }
    });
  }

  if (window.socket) {
    window.socket.emit('broadcaster');
  }
}

window.currentStream = currentStream;
window.peerConnections = peerConnections;
window.socket = socket;
