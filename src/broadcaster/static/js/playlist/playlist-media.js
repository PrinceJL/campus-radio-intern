import { switchToStream } from '../broadcaster/stream-manager.js';
import { updateNowPlaying } from './playlist-ui.js';
import { videoPreview, audioPreview } from '../utils/media-elements.js';
import { stopAudioVisualizer } from '../broadcaster/waveform-visualizer.js';
/**
 * Play the current media item (audio or video).
 * @param {object} item - The playlist item to play.
 * @param {function} onEnd - Callback to call when media ends.
 */
export function playMediaItem(item, onEnd) {
  const ext = item.name.split('.').pop().toLowerCase();

  // Reset previews
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
      else console.warn('[WARN] captureStream failed');
    };
    videoPreview.onerror = e => console.error('[Video Error]', e);
    videoPreview.onended = () => onEnd && onEnd();

    document.getElementById('video-preview-container')?.style.setProperty('display', 'block');
    document.getElementById('camera-preview-container')?.style.setProperty('display', 'none');
    document.getElementById('audio-preview-container')?.style.setProperty('display', 'none');

    const videoMount = document.getElementById('video-preview-container');
    if (videoMount) {
      videoMount.innerHTML = '';
      videoMount.appendChild(videoPreview);
    }
    videoPreview.play().catch(err => console.warn('[play()] error:', err));
    updateNowPlaying(item);
  } else if (/(mp3|wav|ogg|aac|flac|m4a)/.test(ext) && audioPreview) {
    stopAudioVisualizer();
    audioPreview.src = item.url;
    audioPreview.controls = true;
    audioPreview.autoplay = true;
    audioPreview.muted = false;

    audioPreview.onplaying = () => {
      const stream = audioPreview.captureStream?.();
      if (stream) switchToStream(stream);
      else console.warn('[WARN] captureStream failed');
    };
    audioPreview.onerror = e => {
      console.error('[Audio Error]', e, 'src:', audioPreview.src);
      fetch(audioPreview.src)
        .then(res => {
          if (!res.ok) console.error(`[Audio Fetch] ${res.status} ${res.statusText}`);
        })
        .catch(err => console.error('[Audio Fetch Error]', err));
    };
    audioPreview.onended = () => onEnd && onEnd();

    document.getElementById('audio-preview-container')?.style.setProperty('display', 'block');
    document.getElementById('video-preview-container')?.style.setProperty('display', 'none');
    document.getElementById('camera-preview-container')?.style.setProperty('display', 'none');

    const audioMount = document.getElementById('audio-preview-container');
    if (audioMount) {
      audioMount.innerHTML = '';
      audioMount.appendChild(audioPreview);
    }
    audioPreview.play().catch(err => console.warn('[audio play()] error:', err));
    updateNowPlaying(item);
  }
}