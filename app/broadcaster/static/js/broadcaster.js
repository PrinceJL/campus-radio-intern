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
        console.log("🎯 Camera selected:", selectedDeviceId);
        if (mainStream) {
            mainStream.getTracks().forEach(track => track.stop());
            console.log("🛑 Previous stream tracks stopped.");
        }
        mainStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: selectedDeviceId } },
            audio: true
        });
        mainPreview.srcObject = mainStream;
        statusDiv.textContent = "Selected camera for streaming.";
        console.log("✅ Main stream set and preview updated.");
    };
});

// 5. On page load
window.addEventListener('DOMContentLoaded', async () => {
    await populateCameraPreviews();
    if (previewBoxes[0].dataset.deviceId) {
        previewBoxes[0].click();
    }
    statusDiv.textContent = "Select a camera to preview and stream.";
    console.log("📦 Page loaded and previews populated.");
});

// 6. Start streaming
startBtn.onclick = function () {
    if (!mainStream) {
        statusDiv.textContent = "No camera selected for streaming!";
        alert('No camera selected for streaming!');
        console.warn("⚠️ Start failed: No camera selected.");
        return;
    }
    socket.emit('broadcaster');
    console.log("📡 Broadcasting started. Sent: broadcaster");
    statusDiv.textContent = "Broadcasting...";
};

// 7. WebRTC signaling
socket.on('watcher', async id => {
    console.log(`👁️ Watcher connected: ${id}`);
    const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerConnections[id] = peerConnection;
    mainStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, mainStream);
        console.log("🎤 Track added to peer connection:", track.kind);
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', id, peerConnection.localDescription);
    console.log(`📤 Sent offer to ${id}`);

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('candidate', id, event.candidate);
            console.log(`❄️ Sent ICE candidate to ${id}`);
        }
    };
});

socket.on('answer', (id, description) => {
    if (peerConnections[id]) {
        peerConnections[id].setRemoteDescription(description);
        console.log(`📥 Received answer from ${id}`);
    }
});

socket.on('candidate', (id, candidate) => {
    if (peerConnections[id]) {
        peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
        console.log(`📥 Added ICE candidate from ${id}`);
    }
});

socket.on('disconnectPeer', id => {
    if (peerConnections[id]) {
        peerConnections[id].close();
        delete peerConnections[id];
        console.log(`❌ Peer ${id} disconnected and connection closed.`);
    }
});

// 8. Stop streaming
stopBtn.onclick = function () {
    Object.values(peerConnections).forEach(pc => pc.close());
    peerConnections = {};
    statusDiv.textContent = "Stream stopped.";
    socket.emit('stop-broadcast');
    console.log("🛑 Streaming stopped. Sent: stop-broadcast");
};

window.onunload = window.onbeforeunload = () => {
    socket.close();
    Object.values(peerConnections).forEach(pc => pc.close());
    console.log("🧹 Cleaned up peer connections on unload.");
};
