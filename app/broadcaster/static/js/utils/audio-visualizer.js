// audio-visualizer.js
// Module for visualizing audio from a given MediaElementAudioSourceNode or MediaStream

export class AudioVisualizer {
    constructor(container, audioSourceNode, options = {}) {
        this.container = container;
        this.audioSourceNode = audioSourceNode;
        this.options = Object.assign({
            barCount: 64,
            barColor: '#0ff',
            backgroundColor: '#000',
            smoothingTimeConstant: 0.8,
            fftSize: 2048
        }, options);

        this.initCanvas();
        this.initAnalyser();
        this.render = this.render.bind(this);
        requestAnimationFrame(this.render);

        window.addEventListener('resize', () => this.resizeCanvas());
    }

    initCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
    }

    resizeCanvas() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    initAnalyser() {
        const audioCtx = this.audioSourceNode.context;
        this.analyser = audioCtx.createAnalyser();
        this.analyser.smoothingTimeConstant = this.options.smoothingTimeConstant;
        this.analyser.fftSize = this.options.fftSize;

        this.audioSourceNode.connect(this.analyser);
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }

    render() {
        const { width, height } = this.canvas;
        const barWidth = width / this.options.barCount;
        this.ctx.fillStyle = this.options.backgroundColor;
        this.ctx.fillRect(0, 0, width, height);

        this.analyser.getByteFrequencyData(this.dataArray);

        for (let i = 0; i < this.options.barCount; i++) {
            const value = this.dataArray[i];
            const barHeight = value / 255 * height;
            const x = i * barWidth;
            const y = height - barHeight;

            this.ctx.fillStyle = this.options.barColor;
            this.ctx.fillRect(x, y, barWidth - 2, barHeight);
        }

        requestAnimationFrame(this.render);
    }
}
