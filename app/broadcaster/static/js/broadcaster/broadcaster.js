import { fileManager } from '../file/file-manager.js';
import { playlistManager } from '../playlist/playlist-manager.js';
import { audioPreview, videoPreview, cameraPreview } from '../utils/media-elements.js';
import { setupAudioVisualizer, stopAudioVisualizer } from './waveform-visualizer.js';
import { AudioVisualizer } from '../utils/audio-visualizer.js';

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
const createPlaylist = document.getElementById('savePlaylistBtn');
const socket = io();
const container = document.getElementById("vu-meter-container");

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

// -- Playlist Management ---
createPlaylist?.addEventListener('click', async () => {
    console.log("[Broadcaster] Save Playlist button clicked");

    // Prompt user for playlist name
    const playlistName = prompt("Enter a name for your new playlist:");

    if (!playlistName || playlistName.trim() === "") {
        console.warn("[Broadcaster] Playlist name is required. Aborting save.");
        return;
    }

    try {
        // Attempt to save the playlist with the provided name
        const playlist = await playlistManager.savePlaylist(playlistName.trim());
        if (playlist) {
            console.log("[Broadcaster] Playlist saved successfully:", playlist);
            alert(`Playlist "${playlistName}" saved successfully.`);
        } else {
            console.error("[Broadcaster] Failed to save playlist");
            alert("Failed to save playlist.");
        }
    } catch (error) {
        console.error("[Broadcaster] Error saving playlist:", error);
        alert("An error occurred while saving the playlist.");
    }
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
    // const vuContainer = document.getElementById("vu-meter-container");
    // const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // try {
    //     const sourceNode = audioCtx.createMediaElementSource(audioPreview);
    //     sourceNode.connect(audioCtx.destination); // 🔊 allow audio to play
    //     console.log("SDOSDSd")
    //     // 🟢 Initialize AudioVisualizer
    //     new AudioVisualizer(vuContainer, sourceNode, {
    //         barCount: 40,
    //         barColor: '#4ade80',
    //         backgroundColor: '#1e1e1e',
    //         fftSize: 128
    //     });
    // } catch (e) {
    //     console.warn("[VU Meter] AudioContext SourceNode already exists or failed to connect:", e);
    // }
});


audioPreview.addEventListener('pause', stopAudioVisualizer);
audioPreview.addEventListener('ended', stopAudioVisualizer);
// --- Expose Debug Access ---
window.currentStream = getCurrentStream();
window.switchToStream = switchToStream;
window.socket = socket;
