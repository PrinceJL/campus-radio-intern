/**
 * Playlist playback controls: play, pause, next, previous, loop, shuffle.
 * Expects a playlistCore instance and a playMedia callback.
 */

export class PlaylistControls {
  constructor(playlistCore, playMediaCallback) {
    this.playlistCore = playlistCore;
    this.playMedia = playMediaCallback;
    this.loopMode = false;
    this.shuffleMode = false;
    this.setupControlButtons();
  }

  setupControlButtons() {
    document.querySelector('.ctrl-btn-msc.prev')?.addEventListener('click', () => {
      this.playPrevious();
    });

    document.querySelector('.ctrl-btn-msc.next')?.addEventListener('click', () => {
      this.playNext();
    });

    document.querySelector('.ctrl-btn-msc.playpause')?.addEventListener('click', () => {
      this.togglePause();
    });

    document.querySelector('.ctrl-btn-msc.loop')?.addEventListener('click', () => {
      this.loopMode = !this.loopMode;
      this.shuffleMode = false;
      this.updateModeButtons();
    });

    document.querySelector('.ctrl-btn-msc.shuffle')?.addEventListener('click', () => {
      this.shuffleMode = !this.shuffleMode;
      this.loopMode = false;
      this.updateModeButtons();
    });
  }

  updateModeButtons() {
    document.querySelector('.ctrl-btn-msc.loop')?.classList.toggle('active', this.loopMode);
    document.querySelector('.ctrl-btn-msc.shuffle')?.classList.toggle('active', this.shuffleMode);
  }

  playPrevious() {
    if (this.playlistCore.currentIndex > 0) {
      this.playlistCore.currentIndex--;
      this.playMedia();
    }
  }

  playNext() {
    if (this.playlistCore.currentIndex < this.playlistCore.items.length - 1) {
      this.playlistCore.currentIndex++;
      this.playMedia();
    }
  }

  togglePause() {
    const media = window.videoPreview || window.audioPreview;
    if (!media) return;
    media.paused ? media.play() : media.pause();
  }

  handleMediaEnd() {
    if (this.loopMode) {
      this.playMedia();
    } else if (this.shuffleMode) {
      let next;
      do next = Math.floor(Math.random() * this.playlistCore.items.length);
      while (next === this.playlistCore.currentIndex);
      this.playlistCore.currentIndex = next;
      this.playMedia();
    } else if (this.playlistCore.currentIndex < this.playlistCore.items.length - 1) {
      this.playlistCore.currentIndex++;
      this.playMedia();
    } else {
      this.playlistCore.currentIndex = -1;
    }
  }
}