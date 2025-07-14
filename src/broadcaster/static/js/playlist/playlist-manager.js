import { createPlaylistCore } from './playlist-core.js';
import { setMediaDuration, updateTotalDuration } from './playlist-duration.js';
import { renderPlaylist, clearPlaylistUI, updateNowPlaying } from './playlist-ui.js';
import { PlaylistControls } from './playlist-controls.js';
import { savePlaylist, listAllPlaylists, loadPlaylist, deletePlaylist } from './playlist-storage.js';
import { playMediaItem } from './playlist-media.js';

class PlaylistManager {
  constructor() {
    this.audioCore = createPlaylistCore();
    this.videoCore = createPlaylistCore();
    this.controls = new PlaylistControls(this.videoCore, () => this.playCurrent()); // Default control
    this.activeType = null; // 'audio' or 'video'
    this.initUI();
  }

  detectMediaType(url) {
    const extension = url.split('.').pop().toLowerCase();
    const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac'];
    const videoExts = ['mp4', 'webm', 'mkv', 'mov', 'avi'];

    if (audioExts.includes(extension)) return 'audio';
    if (videoExts.includes(extension)) return 'video';
    return 'unknown';
  }
  get core() {
    const type = this.activeType || 'video';
    return type === 'audio' ? this.audioCore : this.videoCore;
  }

  // --- UI Integration ---
  initUI() {
    // Render playlist on load or change
    this.render();
  }

  // --- Playlist Actions ---
  addItem(name, url) {
    const type = this.detectMediaType(url);
    if (type === 'unknown') {
      console.warn('[PlaylistManager] Unknown media type for', url);
      return;
    }

    const isNewType = this.activeType !== type;

    const core = type === 'audio' ? this.audioCore : this.videoCore;
    const otherCore = type === 'audio' ? this.videoCore : this.audioCore;

    // If switching types, clear the old one
    if (isNewType && this.activeType !== null) {
      console.log(`[PlaylistManager] Switching playlist type from ${this.activeType} to ${type}, clearing previous playlist`);
      otherCore.clear();
    }

    // Set the active type
    this.activeType = type;

    // Add new item to active playlist
    const item = core.addItem(name, url);
    console.log(`[PlaylistManager] Added ${type} item:`, name, url);

    setMediaDuration(item, () => {
      updateTotalDuration(core.items);
      this.render(); // re-render updated active playlist
      this.playCurrent();  // <- THIS is the crucial trigger

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

  // --- Playlist UI ---
  render() {
    const type = this.activeType || 'video'; // fallback default
    const core = type === 'audio' ? this.audioCore : this.videoCore;

    renderPlaylist(
      core.items,
      (index) => { core.setCurrentIndex(index); this.playCurrent(type); },
      (index) => { core.removeItemByIndex(index); this.render(); }
    );
  }
  replaceWithItem(name, url) {
    const type = this.detectMediaType(url);
    if (type === 'unknown') {
      console.warn('[PlaylistManager] Unknown media type for', url);
      return;
    }
    console.log(`[PlaylistManager] Replacing with ${type} item:`, name, url);
    const core = type === 'audio' ? this.audioCore : this.videoCore;

    const item = core.addItem(name, url);

    this.activeType = type;

    setMediaDuration(item, () => {
      updateTotalDuration(core.items);
      this.render();
    });
  }

  // --- Playback ---
  playCurrent(type = this.activeType || 'video') {
    const core = type === 'audio' ? this.audioCore : this.videoCore;
    const item = core.getCurrentItem();
    if (!item) return;
    playMediaItem(item, () => this.controls.handleMediaEnd());
    updateNowPlaying(item);
  }
  switchTo(type) {
    if (!['audio', 'video'].includes(type)) return;
    this.activeType = type;
    this.render();
  }
  // --- Storage ---
  async savePlaylist(name) {
    return await savePlaylist(name, this.core.items);
  }

  async listAllPlaylists() {
    return await listAllPlaylists();
  }

  async loadPlaylist(name, type = this.activeType || 'video') {
    const core = type === 'audio' ? this.audioCore : this.videoCore;
    const items = await loadPlaylist(name);
    core.load(items, name);
    updateTotalDuration(core.items);
    this.activeType = type;
    this.render();
  }


  async deletePlaylist(name) {
    return await deletePlaylist(name);
  }
}

// Export a singleton for easy use
export const playlistManager = new PlaylistManager();