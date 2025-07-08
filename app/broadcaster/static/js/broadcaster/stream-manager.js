import { cameraPreview } from '../utils/media-elements.js';
import { notifyBroadcaster, stopWebRTC } from './webrtc-handler.js';

let currentStream = null;
let currentMicStream = null;
let isStreaming = false;
let isMuted = false;
let statusDiv = null;

export function initStreamManager(statusElement) {
    statusDiv = statusElement;
}

export function getCurrentStream() {
    return currentStream;
}

export function setMicStream(micStream) {
    currentMicStream = micStream;
    if (currentStream) {
        currentStream.getAudioTracks().forEach(t => currentStream.removeTrack(t));
        const micTrack = micStream.getAudioTracks()[0];
        if (micTrack) currentStream.addTrack(micTrack);
    }
}

export function startStream(socket, startSessionTimer) {
    if (!currentStream) return alert("Nothing to stream.");
    socket.emit('broadcaster');
    isStreaming = true;
    startSessionTimer?.();
    updateStatus("Broadcasting...");
}

export function stopStream(socket, stopSessionTimer) {
    stopWebRTC();
    socket.emit('stop-broadcast');
    isStreaming = false;
    stopSessionTimer?.();
    updateStatus("Broadcast stopped.");
}

export function muteStream(applyToCurrent = true) {
    isMuted = !isMuted;
    if (applyToCurrent && currentStream) {
        currentStream.getAudioTracks().forEach(track => {
            track.enabled = !isMuted;
        });
    }
    updateStatus(isMuted ? "Audio muted for viewers." : "Audio unmuted.");
    return isMuted;
}

export async function switchToStream(stream) {
    if (currentStream) currentStream.getTracks().forEach(track => track.stop());
    currentStream = stream;

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

    if (isStreaming) {
        notifyBroadcaster();
        if (isMuted) muteStream();
        updateStatus("Broadcasting new stream.");
    }
}

function updateStatus(text) {
    if (statusDiv) statusDiv.textContent = text;
}

export function isStreamMuted() {
    return isMuted;
}

export function isStreamActive() {
    return isStreaming;
}
