import { fileManager } from '../file/file-manager.js';
import { playlistManager } from '../playlist/playlist-manager.js';
import { audioPreview, videoPreview, cameraPreview } from '../utils/media-elements.js';
import { setupAudioVisualizer, stopAudioVisualizer } from './waveform-visualizer.js';

import { showMicSelectionPanel } from './mic-manager.js';
import { showCameraSelectionPanel } from './camera-manager.js';
import { setupTickerControls } from './ticker-controls.js';
import { setupThemeToggle, highlightSelectedElements } from './ui-controls.js';
import { setupWebRTCHandlers } from './webrtc-handler.js';
import { startSessionTimer, stopSessionTimer } from './stream-utils.js';

import {
    initStreamManager,
    startStream,
    stopStream,
    muteStream,
    isStreamMuted,
    getCurrentStream,
    switchToStream
} from './stream-manager.js';

const muteBtn = document.getElementById('muteStream');
const startBtn = document.getElementById('startStream');
const stopBtn = document.getElementById('stopStream');
const statusDiv = document.getElementById('broadcast-status');

const socket = io();

document.addEventListener('DOMContentLoaded', async () => {
    // --- Initialize modules ---
    fileManager.setup();
    playlistManager.render();
    setupThemeToggle();
    setupTickerControls(socket);
    highlightSelectedElements();
    setupWebRTCHandlers(socket, getCurrentStream);
    initStreamManager(statusDiv);

    // Mount media preview elements
    document.getElementById('camera-preview-container')?.appendChild(cameraPreview);
    document.getElementById('video-preview-container')?.appendChild(videoPreview);

    statusDiv.textContent = "Select a camera or video to stream.";
});

// --- Stream Control Buttons ---
muteBtn?.addEventListener('click', () => {
    const nowMuted = muteStream();
    muteBtn.textContent = nowMuted ? "Unmute" : "Mute";
});

startBtn?.addEventListener('click', () => {
    startStream(socket, startSessionTimer);
});

stopBtn?.addEventListener('click', () => {
    stopStream(socket, stopSessionTimer);
});

// --- Device Selection ---
document.getElementById('cameraPlusBtn')?.addEventListener('click', async () => {
    console.log("[Broadcaster] Camera plus button clicked");
    showCameraSelectionPanel();
});
document.getElementById('microphonePlusBtn')?.addEventListener('click', async () => {
    console.log("[Broadcaster] Microphone plus button clicked");
    showMicSelectionPanel();
});
// --- Cleanup on Exit ---
window.onbeforeunload = () => {
    stopStream(socket, stopSessionTimer);
    stopWebRTC();
    socket.close();
};

// --- Audio Preview ---
audioPreview.addEventListener('play', () => {
  console.log("[Visualizer] Starting live waveform");
  setupAudioVisualizer();
});

audioPreview.addEventListener('pause', stopAudioVisualizer);
audioPreview.addEventListener('ended', stopAudioVisualizer);
// --- Expose Debug Access ---
window.currentStream = getCurrentStream();
window.switchToStream = switchToStream;
window.socket = socket;
