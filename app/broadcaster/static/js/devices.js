let localStream;
let selectedDeviceId = null;
let audioStream = null;
const webcamSelect = document.getElementById('webcamSelect');
const micSelect = document.getElementById('micSelect');
const testBtn = document.getElementById('testDevices');
const previewBoxes = document.querySelectorAll('.camera-previews video');
const mainPreview = document.getElementById('mainPreview');
const statusDiv = document.getElementById('broadcast-status');
let audioVisualizerInterval;

// --- 1. List available devices
async function listDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    // Video
    webcamSelect.innerHTML = "";
    const videoDevices = devices.filter(d => d.kind === "videoinput");
    videoDevices.forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `Camera ${index + 1}`;
        webcamSelect.appendChild(option);
    });

    // Audio
    micSelect.innerHTML = "";
    const audioDevices = devices.filter(d => d.kind === "audioinput");
    audioDevices.forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `Mic ${index + 1}`;
        micSelect.appendChild(option);
    });
}

// --- 2. Start preview for a given device
async function startCameraPreview(deviceId, videoEl) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: deviceId } },
            audio: false
        });
        videoEl.srcObject = stream;
        videoEl.dataset.deviceId = deviceId;
    } catch (err) {
        console.error("Camera preview error:", err);
        videoEl.style.display = "none";
    }
}

// --- 3. Populate camera previews
async function populateCameraPreviews() {
    await listDevices();
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === "videoinput");

    previewBoxes.forEach((box, i) => {
        if (cameras[i]) {
            startCameraPreview(cameras[i].deviceId, box);
            box.style.display = "block";
            box.dataset.deviceId = cameras[i].deviceId;
        } else {
            box.style.display = "none";
        }
    });
}

// --- 4. Handle preview click
previewBoxes.forEach(box => {
    box.onclick = async () => {
        selectedDeviceId = box.dataset.deviceId;
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: selectedDeviceId } },
            audio: true
        });
        if (localStream) localStream.getTracks().forEach(t => t.stop());
        localStream = stream;
        mainPreview.srcObject = stream;
        statusDiv.textContent = `Selected camera for broadcasting.`;
    };
});

// --- 5. Test devices (mic level visualizer)
testBtn.onclick = async () => {
    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
        clearInterval(audioVisualizerInterval);
        document.getElementById('audioLevels').textContent = "Microphone Level";
        return;
    }

    const selectedMicId = micSelect.value;
    try {
        audioStream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: selectedMicId ? { exact: selectedMicId } : undefined },
            video: false
        });

        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const micSource = audioContext.createMediaStreamSource(audioStream);
        micSource.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const levelDisplay = document.getElementById('audioLevels');

        audioVisualizerInterval = setInterval(() => {
            analyser.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            const level = Math.min(100, Math.round((avg / 255) * 100));
            levelDisplay.textContent = `Microphone Level: ${"█".repeat(level / 5)} (${level}%)`;
        }, 100);
    } catch (err) {
        console.error("Mic test error:", err);
        statusDiv.textContent = "Mic access denied or error.";
    }
};

// --- On load
window.addEventListener('DOMContentLoaded', async () => {
    await populateCameraPreviews();
    if (previewBoxes[0]?.dataset.deviceId) {
        previewBoxes[0].click();
    }
});
