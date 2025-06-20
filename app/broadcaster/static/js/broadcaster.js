import { setupUploadManager } from './file-handler.js';

let localStream;
let selectedDeviceId = null;
let mainStream = null;
const previewBoxes = document.querySelectorAll('.camera-previews video');
const mainPreview = document.createElement('video');
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
let peerConnections = {};
const pendingCandidates = {};

console.log("🔌 Socket.IO initialized.");

document.addEventListener('DOMContentLoaded', async () => {
  // Stream preview mount
  const previewContainer = document.getElementById('stream-preview-area');
  if (previewContainer) {
    previewContainer.innerHTML = "";
    previewContainer.appendChild(mainPreview);
  }

  // Setup theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light-mode');
      themeToggle.textContent = 'Switch to Dark Mode';
    }

    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');
      if (document.body.classList.contains('light-mode')) {
        localStorage.setItem('theme', 'light');
        themeToggle.textContent = 'Switch to Dark Mode';
      } else {
        localStorage.setItem('theme', 'dark');
        themeToggle.textContent = 'Switch to Light Mode';
      }
    });
  }

  // Init uploads + camera previews
  setupUploadManager();
  await populateCameraPreviews();
  if (previewBoxes[0] && previewBoxes[0].dataset.deviceId) {
    previewBoxes[0].click();
  }

  if (statusDiv) {
    statusDiv.textContent = "Select a camera to preview and stream.";
  }
});


// -------- Camera Logic --------

async function listCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  webcamSelect.innerHTML = "";
  devices.filter(d => d.kind === "videoinput").forEach(device => {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.text = device.label || `Camera ${webcamSelect.length + 1}`;
    webcamSelect.appendChild(option);
    console.log("📷 Camera found:", option.text);
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
    console.log("🔍 Preview started for camera:", deviceId);
    return stream;
  } catch (err) {
    if (statusDiv) statusDiv.textContent = "Camera error: " + err.message;
    console.error("🚨 Error accessing camera:", err);
    return null;
  }
}

async function populateCameraPreviews() {
  await listCameras();
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cameras = devices.filter(d => d.kind === "videoinput");

  for (let i = 0; i < previewBoxes.length; i++) {
    if (cameras[i]) {
      await startCameraPreview(cameras[i].deviceId, previewBoxes[i]);
      previewBoxes[i].style.display = "";
    } else {
      previewBoxes[i].style.display = "none";
    }
  }
}

previewBoxes.forEach(box => {
  box.onclick = async function () {
    selectedDeviceId = box.dataset.deviceId;
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: selectedDeviceId } },
      audio: true
    });

    if (mainStream) {
      const newVideoTrack = newStream.getVideoTracks()[0];
      const newAudioTrack = newStream.getAudioTracks()[0];

      for (const id in peerConnections) {
        const pc = peerConnections[id];
        pc.getSenders().forEach(sender => {
          if (sender.track.kind === "video" && newVideoTrack) {
            sender.replaceTrack(newVideoTrack);
          }
          if (sender.track.kind === "audio" && newAudioTrack) {
            sender.replaceTrack(newAudioTrack);
          }
        });
      }
      mainStream.getTracks().forEach(track => track.stop());
    }

    mainStream = newStream;
    mainPreview.srcObject = mainStream;
    if (statusDiv) statusDiv.textContent = "Selected camera for streaming.";
  };
});

// -------- Streaming Logic --------

startBtn?.addEventListener('click', () => {
  if (!mainStream) {
    alert("No camera selected for streaming!");
    statusDiv.textContent = "No camera selected for streaming!";
    return;
  }
  socket.emit('broadcaster');
  statusDiv.textContent = "Broadcasting...";
});

stopBtn?.addEventListener('click', () => {
  Object.values(peerConnections).forEach(pc => pc.close());
  peerConnections = {};
  socket.emit('stop-broadcast');
  statusDiv.textContent = "Stream stopped.";
});

// -------- WebRTC Signaling --------

socket.on('watcher', async (id) => {
  if (!mainStream) return;
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  peerConnections[id] = pc;

  mainStream.getTracks().forEach(track => pc.addTrack(track, mainStream));

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
    console.error(`Offer error for ${id}:`, err);
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
  console.log('[Broadcaster] Reconnected to server');
  if (mainStream?.getTracks().length) {
    socket.emit('broadcaster');
  }
});

window.onbeforeunload = () => {
  socket.close();
  Object.values(peerConnections).forEach(pc => pc.close());
};
