import { audioPreview } from '../utils/media-elements.js';

let audioCtx = null;
let analyser = null;
let sourceNode = null;
let dataArray = null;
let animationId = null;

export function setupAudioVisualizer(audioElement = audioPreview) {
    if (!audioElement) {
        console.warn('[Visualizer] No audio element provided.');
        return;
    }

    let canvas = document.getElementById('audio-visualizer');
    if (!canvas) {
        const container = document.getElementById('audio-preview-container');
        if (!container) return console.warn("[Visualizer] No audio-preview-container found.");

        canvas = document.createElement('canvas');
        canvas.id = 'audio-visualizer';
        canvas.width = 800;
        canvas.height = 180;
        canvas.style.cssText = 'width:100%; height:180px; display:block; margin-bottom:8px;';
        container.insertBefore(canvas, container.firstChild); 
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.warn("[Visualizer] Canvas context is null.");
        return;
    }

    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Always create a new source node to match the current deck
    try {
        if (sourceNode) {
            sourceNode.disconnect();
        }
        sourceNode = audioCtx.createMediaElementSource(audioElement);
    } catch (e) {
        console.warn("[Visualizer] Failed to create sourceNode:", e);
        return;
    }

    if (!analyser) {
        analyser = audioCtx.createAnalyser();
    }

    analyser.fftSize = 128;
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination); // Optional: skip if you don’t want sound from analyzer path

    function draw() {
        animationId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const spacing = 2;
        const totalSpacing = spacing * (dataArray.length - 1);
        const barWidth = (canvas.width - totalSpacing) / dataArray.length;

        for (let i = 0; i < dataArray.length; i++) {
            const barHeight = (dataArray[i] / 255) * (canvas.height * 0.8);
            const x = i * (barWidth + spacing);
            ctx.fillStyle = "#4ade80";
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        }
    }

    draw();
}

export function stopAudioVisualizer() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    if (sourceNode) {
        sourceNode.disconnect();
        sourceNode = null;
    }

    if (analyser) {
        analyser.disconnect();
        analyser = null;
    }

    if (audioCtx) {
        audioCtx.close();
        audioCtx = null;
    }

    const canvas = document.getElementById('audio-visualizer');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}
