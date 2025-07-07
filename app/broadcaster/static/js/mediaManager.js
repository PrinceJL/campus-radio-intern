//needed to manage the audio and video playing

let activeMedia = null;  // the currently playing media element

export function setActiveMedia(mediaElement) {
  if (activeMedia && activeMedia !== mediaElement && !activeMedia.paused) {
    activeMedia.pause();
    console.log('[INFO] Previous media paused.');
  }
  activeMedia = mediaElement;
}

export function getActiveMedia() {
  return activeMedia;
}