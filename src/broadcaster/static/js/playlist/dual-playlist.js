export const dualPlaylistManager = {
  videoPlaylist: [],
  audioPlaylist: [],
  activeType: null, // null means no manual selection yet

  addItem(name, url) {
    const ext = name.split('.').pop().toLowerCase();
    const type = /(mp4|webm|avi|mov)/.test(ext) ? 'video' :
                 /(mp3|wav|ogg|aac|flac|m4a)/.test(ext) ? 'audio' : null;
    if (!type) return;

    const playlist = type === 'video' ? this.videoPlaylist : this.audioPlaylist;
    const exists = playlist.find(item => item.name === name || item.url === url);
    if (!exists) playlist.push({ name, url });

    // If no playlist selected yet, auto-activate
    if (!this.activeType) {
      this.activate(type);
    }

    // If user previously selected a playlist, only show its type
    if (this.activeType === type || this.activeType === null) {
      this.renderPlaylist(type);
    }
  },

  activate(type) {
    this.activeType = type;
    this.renderPlaylist(type);
  },

  renderPlaylist(type) {
    const playlist = type === 'video' ? this.videoPlaylist : this.audioPlaylist;
    const container = document.getElementById('playlist-items');
    container.innerHTML = '';
    playlist.forEach(item => {
      const el = this.createItemElement(item);
      container.appendChild(el);
    });
  },

  createItemElement(item) {
    const li = document.createElement('div');
    li.className = 'playlist-item';
    li.textContent = item.name;
    li.onclick = () => {
      import('../media/playlist-media.js').then(({ playMediaItem }) => {
        playMediaItem(item);
      });
    };
    return li;
  }
};
