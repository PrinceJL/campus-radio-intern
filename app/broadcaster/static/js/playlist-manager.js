import { generateVideoThumbnail, getVideoDuration } from './file-handler.js';
import { mainPreview, switchToStream } from './broadcaster.js';

let currentIndex = -1;
let playlistItems = [];
let loopMode = false;
let shuffleMode = false;
let currentPlaylistName = null;

function updateModeButtons() {
  btnLoop.classList.toggle('active', loopMode);
  btnShuffle.classList.toggle('active', shuffleMode);
}

export function queueVideo(name, url) {
  const normUrl = new URL(url, window.location.origin).pathname;
  playlistItems.push({ name, url: normUrl });
  renderPlaylist();
}

function renderPlaylist() {
  const container = document.querySelector('.playlist-items');
  if (!container) return;

  container.innerHTML = '';
  playlistItems.forEach((item, index) => {
    const block = createMediaBlock(item.name, item.url, index);
    container.appendChild(block);
  });
}

function createMediaBlock(name, url, index) {
  const block = document.createElement('div');
  block.className = 'media-block';
  block.dataset.index = index;

  const mediaInfo = document.createElement('div');
  mediaInfo.className = 'media-info';

  const preview = document.createElement('img');
  preview.width = 40;
  preview.height = 40;

  const ext = name.split('.').pop().toLowerCase();
  if (ext.match(/(mp4|webm|avi|mov)/)) {
    generateVideoThumbnail(url, preview);
  } else {
    preview.src = 'https://via.placeholder.com/40x40?text=NA';
  }

  const label = document.createElement('span');
  label.className = 'media-title';
  label.textContent = name;

  mediaInfo.append(preview, label);

  const rightSide = document.createElement('div');
  rightSide.className = 'media-right';

  if (ext.match(/(mp4|webm|avi|mov)/)) {
    const duration = document.createElement('span');
    duration.className = 'media-duration';
    getVideoDuration(url, dur => duration.textContent = dur);
    rightSide.appendChild(duration);
  }

  const delBtn = document.createElement('button');
  delBtn.textContent = '❌';
  delBtn.className = 'delete-btn';
  delBtn.onclick = (e) => {
    e.stopPropagation();
    playlistItems.splice(index, 1);
    if (currentIndex >= playlistItems.length) currentIndex = playlistItems.length - 1;
    renderPlaylist();
  };
  rightSide.appendChild(delBtn);

  block.append(mediaInfo, rightSide);

  block.onclick = () => {
    currentIndex = index;
    playCurrent();
  };

  return block;
}

function playCurrent() {
  if (currentIndex < 0 || currentIndex >= playlistItems.length) return;

  const { name, url } = playlistItems[currentIndex];
  console.log('[DBG] Now playing:', name, url);

  mainPreview.pause();
  mainPreview.srcObject = null;
  mainPreview.src = url;
  mainPreview.controls = true;
  mainPreview.autoplay = true;
  mainPreview.muted = false;

  mainPreview.onplaying = () => {
    console.log('[DBG] onplaying fired.');
    const stream = mainPreview.captureStream?.() || mainPreview.mozCaptureStream?.();
    if (!stream) {
      console.warn('[DBG] captureStream() failed.');
    } else {
      console.log('[DBG] Stream captured, rebroadcasting...');
      switchToStream(stream);
    }
  };

  mainPreview.onerror = (e) => {
    console.error('[DBG] Video error:', e);
  };

  mainPreview.onloadedmetadata = () => {
    console.log('[DBG] Metadata loaded, duration:', mainPreview.duration);
  };

  mainPreview.onended = () => {
    console.log('[DBG] Video ended.');
    if (loopMode) mainPreview.play();
    else if (shuffleMode) {
      let next;
      do next = Math.floor(Math.random() * playlistItems.length);
      while (next === currentIndex);
      currentIndex = next;
      playCurrent();
    } else if (currentIndex < playlistItems.length - 1) {
      currentIndex++;
      playCurrent();
    } else {
      currentIndex = -1;
    }
  };

  const previewArea = document.querySelector('.stream-preview-area');
  previewArea.innerHTML = '';
  previewArea.appendChild(mainPreview);

  const nowPlayingContent = document.querySelector('.now-playing-content');
  const nowPlayingBlock = document.querySelector('.now-playing-block');

  if (nowPlayingContent) {
    nowPlayingContent.innerHTML = '';
    nowPlayingContent.appendChild(createMediaBlock(name, url, currentIndex));
  }

  // ✅ Show now-playing-controls
  nowPlayingBlock?.classList.add('playing');

  mainPreview.play().then(() => {
    console.log('[DBG] Video play promise resolved.');
  }).catch(err => {
    console.warn('[DBG] play() failed:', err);
  });
}

export function clearPlaylist() {
  playlistItems = [];
  currentIndex = -1;
  currentPlaylistName = null;
  document.querySelector('.now-playing-block').classList.remove('playing');
  document.querySelector('.playlist-items').innerHTML = '';
  document.querySelector('.now-playing-content').innerHTML = '';
}

export function setupNowPlayingControls() {
  document.querySelector('.ctrl-btn-msc.prev')?.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      playCurrent();
    }
  });

  document.querySelector('.ctrl-btn-msc.next')?.addEventListener('click', () => {
    if (currentIndex < playlistItems.length - 1) {
      currentIndex++;
      playCurrent();
    }
  });

  document.querySelector('.ctrl-btn-msc.pause')?.addEventListener('click', () => {
    if (!mainPreview) return;
    if (mainPreview.paused) {
      mainPreview.play();
    } else {
      mainPreview.pause();
    }
  });

  document.querySelector('ctrl.btn-msc.loop')?.addEventListener('click', () => {
    loopMode = !loopMode;
    shuffleMode = false;
    updateModeButtons();
  });
  
  document.querySelector('.ctrl-btn-msc.shuffle')?.addEventListener('click', () => {
    shuffleMode = !shuffleMode;
    loopMode = false;
    updateModeButtons();
  });
}

document.getElementById('savePlaylistBtn')?.addEventListener('click', () => {
  const name = prompt("Enter a name for the new playlist:");
  if (!name) return;
  savePlaylist(name);
});

document.getElementById('saveOrderBtn')?.addEventListener('click', () => {
  if (!currentPlaylistName) {
    alert("No loaded playlist to save.");
    return;
  }
  savePlaylist(currentPlaylistName);
});

async function savePlaylist(name) {
  try {
    const res = await fetch('/playlists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        items: playlistItems
      })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to save playlist.');
    } else {
      alert(`Playlist "${name}" saved successfully.`);
      currentPlaylistName = name;
      await listAllPlaylists();
    }
  } catch (err) {
    console.error('[SavePlaylist]', err);
    alert("Error saving playlist.");
  }
}
export async function listAllPlaylists() {
  try {
    const res = await fetch('/playlists');
    const data = await res.json();
    const group = document.querySelector('.playlist-group');
    group.innerHTML = '';

    data.forEach(pl => {
      const wrapper = document.createElement('div');
      wrapper.className = 'playlist-btn';
      wrapper.textContent = pl.name;
      wrapper.onclick = () => loadPlaylist(pl.name);
      group.appendChild(wrapper);
    });
  } catch (err) {
    console.error('[LoadPlaylists]', err);
  }
}

async function loadPlaylist(name) {
  try {
    const res = await fetch(`/playlists/${name}`);
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Load failed');

    clearPlaylist();
    data.items.forEach(item => queueVideo(item.name, item.url));
    currentPlaylistName = name;
  } catch (err) {
    console.error('[LoadPlaylist]', err);
  }
}
