let localStream;
let selectedDeviceId = null;
let mainStream = null;
const cam1 = document.getElementById('cam1');
const previewBoxes = document.querySelectorAll('.camera-previews video');
const mainPreview = document.createElement('video');
mainPreview.autoplay = true;
mainPreview.muted = true;
mainPreview.playsInline = true;
mainPreview.style.width = "100%";
mainPreview.style.height = "100%";
document.getElementById('mainPreview').innerHTML = "";
document.getElementById('mainPreview').appendChild(mainPreview);

const startBtn = document.getElementById('startStream');
const stopBtn = document.getElementById('stopStream');
const statusDiv = document.getElementById('broadcast-status');
const webcamSelect = document.getElementById('webcamSelect');
const socket = io();
let peerConnections = {};
const pendingCandidates = {};

console.log("🔌 Socket.IO initialized.");

// 1. List cameras
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

// 2. Start preview for a given deviceId
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
        statusDiv.textContent = "Camera error: " + err.message;
        console.error("🚨 Error accessing camera:", err);
        return null;
    }
}

// 3. Populate camera previews
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

// 4. Click to select camera for main preview
previewBoxes.forEach(box => {
    box.onclick = async function () {
        selectedDeviceId = box.dataset.deviceId;
        console.log("Camera selected:", selectedDeviceId);
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: box.dataset.deviceId } },
            audio: true
        });

        // If we’re already streaming, replace tracks in peer connections
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

        // Stop old tracks *after* replacing them
        mainStream.getTracks().forEach(track => track.stop());
        }

        mainStream = newStream;
        mainPreview.srcObject = mainStream;
        statusDiv.textContent = "Switched camera while streaming.";
        console.log("Switched camera and replaced track in all peer connections.");

        statusDiv.textContent = "Selected camera for streaming.";
        console.log("Main stream set and preview updated.");
    };
});

// 5. On page load
window.addEventListener('DOMContentLoaded', async () => {
    await populateCameraPreviews();
    if (previewBoxes[0].dataset.deviceId) {
        previewBoxes[0].click();
    }
    statusDiv.textContent = "Select a camera to preview and stream.";
    console.log("Page loaded and previews populated.");
});

// 6. Start streaming
startBtn.onclick = function () {
    if (!mainStream) {
        statusDiv.textContent = "No camera selected for streaming!";
        alert('No camera selected for streaming!');
        console.warn("Start failed: No camera selected.");
        return;
    }
    socket.emit('broadcaster');
    console.log("Broadcasting started. Sent: broadcaster");
    statusDiv.textContent = "Broadcasting...";
};

// 7. WebRTC signaling
socket.on('watcher', async (id) => {
    console.log(`[Broadcaster] Watcher connected: ${id}`);

    if (!mainStream) {
        console.warn("No stream ready when watcher connected.");
        return;
    }

    const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    peerConnections[id] = pc;

    mainStream.getTracks().forEach(track => {
        pc.addTrack(track, mainStream);
        console.log("Track added to peer connection:", track.kind);
    });

    pc.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('candidate', id, event.candidate);
            console.log(`[Broadcaster] Sending ICE to ${id}`);
        }
    };

    pc.oniceconnectionstatechange = () => {
        console.log(`[Broadcaster] ICE state (${id}):`, pc.iceConnectionState);
    };

    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', id, pc.localDescription);
        console.log(`[Broadcaster] Sent offer to ${id}`);
    } catch (err) {
        console.error(`[Broadcaster] Offer error for ${id}:`, err);
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
        console.log(`[Broadcaster] Got answer from ${id}`);
    }
});

socket.on('connect', () => {
    console.log('[Broadcaster] Connected to signaling server again');
    if (mainStream && mainStream.getTracks().length > 0) {
        socket.emit('broadcaster');
        console.log("Re-announced broadcaster after reconnect.");
    } else {
        console.log("Skipped broadcaster emit — stream not ready.");
    }
});


socket.on('candidate', (id, candidate) => {
    const pc = peerConnections[id];
    if (pc && pc.remoteDescription) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(err =>
            console.error(`[Broadcaster] ICE error for ${id}:`, err)
        );
    } else {
        if (!pendingCandidates[id]) pendingCandidates[id] = [];
        pendingCandidates[id].push(candidate);
    }
});

socket.on('disconnectPeer', id => {
    if (peerConnections[id]) {
        peerConnections[id].close();
        delete peerConnections[id];
        console.log(`[Broadcaster] Viewer ${id} disconnected.`);
    }
});

// 8. Stop streaming
stopBtn.onclick = function () {
    Object.values(peerConnections).forEach(pc => pc.close());
    peerConnections = {};
    statusDiv.textContent = "Stream stopped.";
    socket.emit('stop-broadcast');
    console.log("Streaming stopped. Sent: stop-broadcast");
};

window.onunload = window.onbeforeunload = () => {
    socket.close();
    Object.values(peerConnections).forEach(pc => pc.close());
    console.log("Cleaned up peer connections on unload.");
};

// Theme Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
  const themeToggle = document.getElementById('themeToggle');

  // Check for saved theme preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
      document.body.classList.add('light-mode');
      themeToggle.textContent = 'Switch to Dark Mode';
  }

  // Theme toggle click handler
  themeToggle.addEventListener('click', function() {
      document.body.classList.toggle('light-mode');

      // Save theme preference
      if (document.body.classList.contains('light-mode')) {
          localStorage.setItem('theme', 'light');
          themeToggle.textContent = 'Switch to Dark Mode';
      } else {
          localStorage.setItem('theme', 'dark');
          themeToggle.textContent = 'Switch to Light Mode';
      }
  });
});