import { playlistCore } from './playlist-core.js';
import { setMediaDuration, updateTotalDuration } from './playlist-duration.js';
import { renderPlaylist, clearPlaylistUI, updateNowPlaying } from './playlist-ui.js';
import { PlaylistControls } from './playlist-controls.js';
import { savePlaylist, listAllPlaylists, loadPlaylist, deletePlaylist } from './playlist-storage.js';
import { playMediaItem } from './playlist-media.js';

class PlaylistManager {
  constructor() {
    this.core = playlistCore;
    this.controls = new PlaylistControls(this.core, () => this.playCurrent());
    this.initUI();
  }

  // --- UI Integration ---
  initUI() {
    // Render playlist on load or change
    this.render();
  }

  // --- Playlist Actions ---
  addItem(name, url) {
    console.log("[PlaylistManager] Adding item:", name, url);
    const item = this.core.addItem(name, url);
    setMediaDuration(item, () => {
      console.log("[PlaylistManager] Item duration set:", item.name, item.duration);
      updateTotalDuration(this.core.items);
      this.render();
    });
    return item;
  }

  removeItemByIndex(index) {
    this.core.removeItemByIndex(index);
    updateTotalDuration(this.core.items);
    this.render();
  }

  removeItemsByUrl(url) {
    this.core.removeItemsByUrl(url);
    updateTotalDuration(this.core.items);
    this.render();
  }

  clear() {
    this.core.clear();
    clearPlaylistUI();
    updateTotalDuration([]);
  }

  moveItem(oldIndex, newIndex) {
    this.core.moveItem(oldIndex, newIndex);
    this.render();
  }

  setCurrentIndex(index) {
    this.core.setCurrentIndex(index);
  }

  getCurrentItem() {
    return this.core.getCurrentItem();
  }

  // --- UI Rendering ---
  render() {
    renderPlaylist(
      this.core.items,
      (index) => { this.setCurrentIndex(index); this.playCurrent(); },
      (index) => { this.removeItemByIndex(index); }
    );
  }

  // --- Playback ---
  playCurrent() {
    const item = this.getCurrentItem();
    if (!item) return;
    playMediaItem(item, () => this.controls.handleMediaEnd());
    updateNowPlaying(item);
  }

  // --- Storage ---
  async savePlaylist(name) {
    return await savePlaylist(name, this.core.items);
  }

  async listAllPlaylists() {
    return await listAllPlaylists();
  }

  async loadPlaylist(name) {
    const items = await loadPlaylist(name);
    this.core.load(items, name);
    updateTotalDuration(this.core.items);
    this.render();
  }

  async deletePlaylist(name) {
    return await deletePlaylist(name);
  }
}

// Export a singleton for easy use
export const playlistManager = new PlaylistManager();