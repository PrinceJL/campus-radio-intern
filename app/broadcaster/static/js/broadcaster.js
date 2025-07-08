import { setupUploadManager } from './file-handler.js';
import { setupNowPlayingControls, listAllPlaylists } from './playlist-manager.js';
import { setupNowPlayingControlsAudio } from './audio-functions.js';
import { startSessionTimer, stopSessionTimer, incrementViewerCount, decrementViewerCount } from './stream-utils.js';

let currentStream = null;
let peerConnections = {};
let pendingCandidates = {}
let connectedViewers = new Set();
let isStreaming = false;
let isMuted = false;
let currentMicStream = null;
let currentMicDeviceId = null;
let audioContext = null;
let micStreams = [];            // Raw MediaStreams
let micSources = [];            // MediaStreamAudioSourceNodes
let combinedDestination = null; // MediaStreamDestination
let selectedMicIds = [];        // Tracks selected mics


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

// Setup video preview
document.getElementById('cameraPlusBtn')?.addEventListener('click', async () => {
    console.log("[Broadcaster] Camera plus button clicked");

    const selectionPanel = document.getElementById('camera-selection-panel');
    selectionPanel.innerHTML = '';
    selectionPanel.style.display = 'block';

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');

    for (const cam of cameras) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('camera-card');
        wrapper.dataset.deviceId = cam.deviceId;

        const preview = document.createElement('video');
        preview.autoplay = true;
        preview.muted = true;
        preview.playsInline = true;
        preview.classList.add('thumbnail-preview');

        const label = document.createElement('div');
        label.classList.add('camera-label');
        label.textContent = cam.label || `Camera ${selectionPanel.childElementCount + 1}`;

        wrapper.appendChild(preview);
        wrapper.appendChild(label);
        selectionPanel.appendChild(wrapper);

        // Get preview stream (but not audio)
        try {
            const thumbStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: cam.deviceId } },
                audio: false
            });
            preview.srcObject = thumbStream;
        } catch (err) {
            label.textContent += " (preview failed)";
        }

        wrapper.addEventListener('click', () => {
            // Stop preview stream
            if (preview.srcObject) preview.srcObject.getTracks().forEach(t => t.stop());

            // Add camera to .camera-list
            addCameraToSidebar(cam);

            // Close selection panel
            selectionPanel.style.display = 'none';
        });
    }
});
document.getElementById('microphonePlusBtn')?.addEventListener('click', async () => {
    console.log("[Broadcaster] Microphone plus button clicked");

    const selectionPanel = document.getElementById('microphone-selection-panel');
    selectionPanel.innerHTML = '';
    selectionPanel.style.display = 'block';

    const devices = await navigator.mediaDevices.enumerateDevices();
    const mics = devices.filter(d => d.kind === 'audioinput');

    for (const mic of mics) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('microphone-card');
        wrapper.dataset.deviceId = mic.deviceId;

        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 30;
        canvas.classList.add('mic-visualizer');
        wrapper.appendChild(canvas);

        const label = document.createElement('div');
        label.classList.add('mic-label');
        label.textContent = mic.label || `Microphone ${selectionPanel.childElementCount + 1}`;
        wrapper.appendChild(label);

        selectionPanel.appendChild(wrapper);

        // Live preview
        let stream = null;
        let ctx = null;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: { exact: mic.deviceId } }
            });

            ctx = new (window.AudioContext || window.webkitAudioContext)();
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const canvasCtx = canvas.getContext('2d');
            source.connect(analyser);

            function draw() {
                requestAnimationFrame(draw);
                analyser.getByteFrequencyData(dataArray);
                canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
                const barWidth = (canvas.width / bufferLength) * 1.5;
                let x = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const barHeight = dataArray[i] / 2;
                    canvasCtx.fillStyle = 'limegreen';
                    canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                    x += barWidth + 1;
                }
            }
            draw();
        } catch (err) {
            label.textContent += " (preview failed)";
        }

        // On click, add to sidebar and cleanup
        wrapper.addEventListener('click', () => {
            if (stream) stream.getTracks().forEach(t => t.stop());
            if (ctx && ctx.state !== 'closed') ctx.close();

            selectionPanel.style.display = 'none';
            addMicToSidebar(mic);
        });
    }
});



document.addEventListener('DOMContentLoaded', async () => {
    setupNowPlayingControls();
    setupNowPlayingControlsAudio();
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

    //Automatically populate camera previews
    // Uncomment this line to enable automatic camera preview population
    // await populateCameraPreviews();
    statusDiv.textContent = "Select a camera or video to stream.";
});


// ---------------- CAMERA HANDLING ----------------
function addCameraToSidebar(cam) {
    const container = document.querySelector('.camera-list');
    if (!container) return;

    // Avoid duplicates
    if (container.querySelector(`[data-device-id="${cam.deviceId}"]`)) return;

    const card = document.createElement('div');
    card.classList.add('camera-card');
    card.dataset.deviceId = cam.deviceId;

    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.classList.add('thumbnail-preview');
    video.style.width = "100%";
    video.style.height = "100px";
    video.style.borderRadius = "6px";

    const label = document.createElement('div');
    label.classList.add('camera-label');
    label.textContent = cam.label || 'Unnamed Camera';

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '❌ Remove';
    removeBtn.classList.add('remove-camera-btn');

    card.appendChild(video);
    card.appendChild(label);
    card.appendChild(removeBtn);
    container.appendChild(card);
    container.style.display = 'block';

    // Get preview stream
    navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: cam.deviceId } },
        audio: false
    }).then(stream => {
        video.srcObject = stream;
        card._previewStream = stream; // Store reference for cleanup
    }).catch(err => {
        label.textContent += ' (preview failed)';
        console.error('Camera preview failed:', err);
    });

    // Click on card (excluding button) switches stream
    card.addEventListener('click', async (e) => {
        if (e.target === removeBtn) return; // prevent from triggering switch

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: cam.deviceId } },
                audio: false
            });

            pauseVideoIfPlaying();
            toggleVisibility('camera');
            await switchToStream(stream);
        } catch (err) {
            statusDiv.textContent = "Camera access error.";
            console.log("Camera access error:", err);
        }
    });

    // Remove button
    removeBtn.addEventListener('click', () => {
        // Stop preview stream
        if (card._previewStream) {
            card._previewStream.getTracks().forEach(t => t.stop());
        }

        // If it's the active preview, clear it
        if (cameraPreview.srcObject) {
            const activeId = cameraPreview.srcObject.getVideoTracks()[0]?.getSettings()?.deviceId;
            if (activeId === cam.deviceId) {
                cameraPreview.srcObject.getTracks().forEach(t => t.stop());
                cameraPreview.srcObject = null;
                statusDiv.textContent = "Camera removed from preview.";
            }
        }

        // Remove card from UI
        card.remove();
    });
}

async function populateCameraPreviews() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');
    const container = document.querySelector('.camera-list');
    if (!container) return;

    container.innerHTML = '';

    for (const cam of cameras) {
        // Skip if already added (optional: you can allow duplicates)
        if (document.querySelector(`.camera-entry[data-device-id="${cam.deviceId}"]`)) continue;

        const camEntry = document.createElement('div');
        camEntry.classList.add('camera-entry');
        camEntry.textContent = cam.label || `Camera ${container.childElementCount + 1}`;
        camEntry.dataset.deviceId = cam.deviceId;

        // Attach preview trigger
        camEntry.addEventListener('click', async () => {
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
        });

        container.appendChild(camEntry);
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
function addMicToSidebar(mic) {
    const container = document.querySelector('.microphone-list');
    if (!container) return;

    if (!window.selectedMicIds) window.selectedMicIds = [];
    if (!window.micStreams) window.micStreams = [];
    if (!window.audioContext) window.audioContext = null;

    // Prevent duplicates
    if (selectedMicIds.includes(mic.deviceId)) return;

    selectedMicIds.push(mic.deviceId);

    const card = document.createElement('div');
    card.classList.add('microphone-card');
    card.dataset.deviceId = mic.deviceId;

    const label = document.createElement('div');
    label.classList.add('mic-label');
    label.textContent = mic.label || 'Unnamed Microphone';

    const statusBadge = document.createElement('span');
    statusBadge.classList.add('mic-status-badge');
    statusBadge.textContent = '🔊 In Use';
    statusBadge.style.marginLeft = '10px';
    statusBadge.style.color = 'limegreen';
    label.appendChild(statusBadge);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '❌ Remove';
    removeBtn.classList.add('remove-mic-btn');

    card.appendChild(label);
    card.appendChild(removeBtn);
    container.appendChild(card);
    container.style.display = 'block';

    removeBtn.addEventListener('click', () => {
        selectedMicIds = selectedMicIds.filter(id => id !== mic.deviceId);
        updateCombinedMicStream();
        card.remove();
    });


    updateCombinedMicStream(); // Combine stacked audio
}async function updateCombinedMicStream() {
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (!combinedDestination) {
        combinedDestination = audioContext.createMediaStreamDestination();
        // Attach once and never recreate
        const micTrack = combinedDestination.stream.getAudioTracks()[0];
        if (micTrack) {
            const newStream = new MediaStream([micTrack]);
            currentMicStream = newStream;
            if (currentStream) {
                // Remove existing audio tracks
                currentStream.getAudioTracks().forEach(t => currentStream.removeTrack(t));
                currentStream.addTrack(micTrack);
            }
        }
    }

    // Disconnect all previous sources
    micSources.forEach(src => src.disconnect());
    micStreams.forEach(stream => stream.getTracks().forEach(t => t.stop()));
    micSources = [];
    micStreams = [];

    for (const deviceId of selectedMicIds) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: { exact: deviceId } },
                video: false
            });
            micStreams.push(stream);

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(combinedDestination);
            micSources.push(source);
        } catch (err) {
            console.warn(`Failed to get mic stream for ${deviceId}:`, err);
        }
    }

    // No need to replace tracks again — already connected persistently
    if (isMuted) muteStream();
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

    // Add mic track to the new stream
    if (currentMicStream) {
        const micTrack = currentMicStream.getAudioTracks()[0];
        if (micTrack) currentStream.addTrack(micTrack);
    }

    cameraPreview.srcObject = null;
    cameraPreview.srcObject = stream;

    try {
        await cameraPreview.play();
    } catch (err) {
        console.warn('[DBG] cameraPreview play() failed:', err);
    }

    // Recreate peer connections
    Object.entries(peerConnections).forEach(([id, pc]) => {
        pc.close();
        delete peerConnections[id];
    });

    if (isStreaming) {
        socket.emit('broadcaster');
        statusDiv.textContent = "Broadcasting new stream.";
        if (isMuted) muteStream();
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

// ---------------- AUDIO WAVEFORM VISUALIZATION ----------------
function drawWaveform(canvas, audio, callback) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Use Web Audio API to decode and get waveform data
    const audioCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100 * audio.duration, 44100);
    fetch(audio.src)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioCtx.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
            const data = audioBuffer.getChannelData(0);
            const step = Math.ceil(data.length / canvas.width);
            const amp = canvas.height / 2;
            ctx.strokeStyle = 'limegreen';
            ctx.beginPath();
            for (let i = 0; i < canvas.width; i++) {
                let min = 1.0;
                let max = -1.0;
                for (let j = 0; j < step; j++) {
                    const datum = data[(i * step) + j];
                    if (datum < min) min = datum;
                    if (datum > max) max = datum;
                }
                ctx.moveTo(i, (1 + min) * amp);
                ctx.lineTo(i, (1 + max) * amp);
            }
            ctx.stroke();
            // Call the callback after drawing is done
            if (callback) callback();
        });
}

audioA.onloadedmetadata = () => {
    const waveformCanvas = document.getElementById('audio-visualizer');
    drawWaveform(waveformCanvas, audioA, () => {
        const waveformDataUrl = waveformCanvas.toDataURL();
        console.log('Sending waveform image:', waveformDataUrl);
        socket.emit('audio-waveform', { image: waveformDataUrl, duration: audioA.duration });
    });
};