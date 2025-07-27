import { switchToStream } from '../broadcaster/stream-manager.js';
import { updateNowPlaying } from './playlist-ui.js';
import { videoPreview, audioPreview, audioA, audioB } from '../utils/media-elements.js';
import { stopAudioVisualizer } from '../broadcaster/waveform-visualizer.js';

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
    console.log('[playMediaItem] Detected audio file');

    const nextDeck = currentDeck === audioA ? audioB : audioA;
    const prevDeck = currentDeck;

    console.log('[Crossfade] Switching to:', nextDeck === audioA ? 'audioA' : 'audioB');

    // Set up next deck
    nextDeck.src = item.url;
    nextDeck.volume = 0;
    nextDeck.muted = false;
    nextDeck.autoplay = true;

    nextDeck.onplaying = () => {
      console.log('[Crossfade] Next deck is playing');

      const stream = nextDeck.captureStream?.();
      if (stream) switchToStream(stream);
      else console.warn('[Crossfade] captureStream failed');

      // Fade volumes
      fadeVolume(nextDeck, 0, 1, crossfadeDuration);
      if (prevDeck) {
        fadeVolume(prevDeck, 1, 0, crossfadeDuration, () => {
          prevDeck.pause();
          prevDeck.currentTime = 0;
        });
      }
      
    };

    nextDeck.onended = () => onEnd?.();
    nextDeck.onerror = (e) => console.error('[Audio Error]', e);

    // Mount both decks if not already mounted
    const container = document.getElementById('audio-preview-container');
    if (!audioA.parentNode) container.appendChild(audioA);
    if (!audioB.parentNode) container.appendChild(audioB);

    document.getElementById('audio-preview-container').style.display = 'block';
    document.getElementById('video-preview-container').style.display = 'none';
    document.getElementById('camera-preview-container').style.display = 'none';

    // Play new deck
    nextDeck.play()
      .then(() => console.log('[Crossfade] nextDeck.play() success'))
      .catch(err => console.warn('[Crossfade play()] error:', err));

    updateNowPlaying(item);

    // Track deck state
    lastDeck = prevDeck;
    currentDeck = nextDeck;

    // Debug info
    console.log('[DEBUG] audioA:', {
      volume: audioA.volume,
      paused: audioA.paused,
      src: audioA.src
    });
    console.log('[DEBUG] audioB:', {
      volume: audioB.volume,
      paused: audioB.paused,
      src: audioB.src
    });

    return;
  }

  console.warn('[playMediaItem] Not a supported media type');
}
