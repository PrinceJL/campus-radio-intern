import { switchToStream } from '../broadcaster/stream-manager.js';
import { updateNowPlaying } from './playlist-ui.js';
import { videoPreview, audioPreview, audioA, audioB } from '../utils/media-elements.js';
import { stopAudioVisualizer, setupAudioVisualizer } from '../broadcaster/waveform-visualizer.js';

let currentDeck = audioA;
let lastDeck = null;
const crossfadeDuration = 3;

function fadeVolume(audio, from, to, duration = 3, callback) {
  const steps = 30;
  const interval = (duration * 1000) / steps;
  let currentStep = 0;

  function step() {
    const progress = currentStep / steps;
    audio.volume = from + (to - from) * progress;
    currentStep++;

    if (currentStep <= steps) {
      setTimeout(step, interval);
    } else {
      audio.volume = to;
      if (callback) callback();
    }
  }

  step();
}

export function playMediaItem(item, onEnd) {
  const ext = item.name.split('.').pop().toLowerCase();
  console.log('[playMediaItem] Playing item:', item.name, '| Extension:', ext);

  // Stop previous previews
  if (videoPreview) {
    videoPreview.pause();
    videoPreview.srcObject = null;
    videoPreview.removeAttribute('src');
    videoPreview.load();
  }

  if (audioPreview) {
    audioPreview.pause();
    audioPreview.src = '';
    audioPreview.load();

  }

  if (/(mp4|webm|avi|mov)/.test(ext) && videoPreview) {
    audioA.pause();
    videoPreview.src = item.url;
    videoPreview.controls = true;
    videoPreview.autoplay = true;
    videoPreview.muted = false;

    videoPreview.onplaying = () => {
      const stream = videoPreview.captureStream?.();
      if (stream) switchToStream(stream);
    };

    videoPreview.onended = () => onEnd?.();

    document.getElementById('video-preview-container').style.display = 'block';
    document.getElementById('audio-preview-container').style.display = 'none';
    document.getElementById('camera-preview-container').style.display = 'none';

    const container = document.getElementById('video-preview-container');
    container.innerHTML = '';
    container.appendChild(videoPreview);

    videoPreview.play().catch(err => console.warn('[play()] error:', err));
    updateNowPlaying(item);
    return;
  }

  if (/(mp3|wav|ogg|aac|flac|m4a)/.test(ext)) {
    stopAudioVisualizer();

    const nextDeck = currentDeck === audioA ? audioB : audioA;
    const prevDeck = currentDeck;

    console.log('[Crossfade] Switching to:', nextDeck === audioA ? 'audioA' : 'audioB');

    // Prep nextDeck before mounting
    nextDeck.pause();
    nextDeck.src = item.url;
    nextDeck.volume = 0;
    nextDeck.muted = false;

    nextDeck.onplaying = () => {
      console.log('[Crossfade] Next deck is playing');

      const stream = nextDeck.captureStream?.();
      if (stream) {
        audioPreview.srcObject = stream;
        audioPreview.muted = true;
        audioPreview.play().catch(err => console.warn('[audioPreview.play()] error:', err));
        switchToStream(stream);
        setupAudioVisualizer(nextDeck);
      } else {
        console.warn('[Crossfade] captureStream failed');
      }

      fadeVolume(nextDeck, 0, 1, crossfadeDuration);
      if (prevDeck) {
        fadeVolume(prevDeck, 1, 0, crossfadeDuration, () => {
          prevDeck.pause();
          prevDeck.currentTime = 0;
          prevDeck.src = '';
        });
      }
    };

    nextDeck.onended = () => onEnd?.();

    // Mount required elements BEFORE playing
    const container = document.getElementById('audio-preview-container');
    const visualizer = document.getElementById('audio-visualizer');

    container.style.display = 'block';
    document.getElementById('video-preview-container').style.display = 'none';
    document.getElementById('camera-preview-container').style.display = 'none';

    // Clear and re-mount
    container.innerHTML = '';
    if (visualizer) container.appendChild(visualizer);
    container.appendChild(audioPreview);
    container.appendChild(audioA);
    container.appendChild(audioB);

    // Set deck visibility
    audioA.style.display = (nextDeck === audioA) ? 'block' : 'none';
    audioB.style.display = (nextDeck === audioB) ? 'block' : 'none';
    audioPreview.style.display = 'block';

    // Only now, call play
    nextDeck.play()
      .then(() => console.log('[Crossfade] nextDeck.play() success'))
      .catch(err => console.warn('[Crossfade play()] error:', err));

    updateNowPlaying(item);

    lastDeck = prevDeck;
    currentDeck = nextDeck;
    return;
  }


  console.warn('[playMediaItem] Unsupported media type');
}
