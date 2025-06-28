import { generateVideoThumbnail, getVideoDuration } from './file-handler.js';
import { videoPreview, switchToStream } from './broadcaster.js';

let playlistItems = [];
let currentIndex = -1;
let loopMode = false;
let shuffleMode = false;
let currentPlaylistName = null;

// UI buttons
const btnLoop = document.querySelector('.ctrl-btn-msc.loop');
const btnShuffle = document.querySelector('.ctrl-btn-msc.shuffle');

/**
 * Toggle UI button states based on loop/shuffle modes
 */
function updateModeButtons() {
  btnLoop?.classList.toggle('active', loopMode);
  btnShuffle?.classList.toggle('active', shuffleMode);
}

export function updatePlayPauseIcon() {
  const icon = document.getElementById('playPauseIcon');
  if (!icon) return;
  if (videoPreview.paused) {
    icon.src = '/broadcaster/static/icon/play.png';
    icon.alt = 'Play';
  } else {
    icon.src = '/broadcaster/static/icon/pause-button.png';
    icon.alt = 'Pause';
  }
}

// Attach event listeners to update icon on play/pause
videoPreview.addEventListener('play', updatePlayPauseIcon);
videoPreview.addEventListener('pause', updatePlayPauseIcon);

// Play/pause toggle on button click
document.getElementById('btnPlayPause')?.addEventListener('click', () => {
  if (videoPreview.paused) {
    videoPreview.play();
  } else {
    videoPreview.pause();
  }
});

// Set initial icon state on page load
updatePlayPauseIcon();

/**
 * Add a new video to the queue and update playlist view
 */
export function queueVideo(name, url) {
  const normUrl = new URL(url, window.location.origin).pathname;
  playlistItems.push({ id: crypto.randomUUID(), name, url: normUrl });
  renderPlaylist();
}


/**
 * Render all queued videos in the playlist
 */
function renderPlaylist() {
  const container = document.querySelector('.playlist-items');
  if (!container) return;

  container.innerHTML = '';
  playlistItems.forEach((item, index) => {
    const block = createMediaBlock(item.name, item.url, index);
    container.appendChild(block);
  });

  // Make it sortable
  Sortable.create(container, {
    animation: 150,
    onEnd: function (evt) {
      const oldIndex = evt.oldIndex;
      const newIndex = evt.newIndex;
      if (oldIndex === newIndex) return;

      const movedItem = playlistItems.splice(oldIndex, 1)[0];
      playlistItems.splice(newIndex, 0, movedItem);

      // 🔁 Recalculate currentIndex based on the video URL
      if (currentIndex !== -1) {
        const currentUrl = videoPreview.src;
        const match = playlistItems.findIndex(item => currentUrl.includes(item.url));
        if (match !== -1) currentIndex = match;
      }

      renderPlaylist(); // Re-render updated list
    }
  });
}

/**
 * Create a playlist item block
 */
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
  if (/(mp4|webm|avi|mov)/.test(ext)) {
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

  if (/(mp4|webm|avi|mov)/.test(ext)) {
    const duration = document.createElement('span');
    duration.className = 'media-duration';
    getVideoDuration(url, dur => duration.textContent = dur);
    rightSide.appendChild(duration);
  }

  const delBtn = document.createElement('button');
  delBtn.className = 'delete-btn';
  delBtn.innerHTML = `<img src="${window.STATIC_ICON_PATH}close.png" alt="Delete" style="width:11px;height:11px;vertical-align:middle;">`;
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

/**
 * Play the currently selected video
 */
function playCurrent() {
  if (currentIndex < 0 || currentIndex >= playlistItems.length) return;

  const { name, url } = playlistItems[currentIndex];
  console.log('[DBG] Now playing:', name, url);

  // Reset videoPreview
  videoPreview.pause();
  videoPreview.srcObject = null;
  videoPreview.removeAttribute('src');
  videoPreview.load(); // ensure it's flushed
  videoPreview.src = url;
  videoPreview.controls = true;
  videoPreview.autoplay = true;
  videoPreview.muted = false;

  // Bind capture logic
  videoPreview.onplaying = () => {
    console.log('[DBG] Video started. Capturing stream...');
    const stream = videoPreview.captureStream?.();
    if (stream) switchToStream(stream);
    else console.warn('[WARN] captureStream failed');
  };

  // Error/Metadata/End handlers
  videoPreview.onerror = e => console.error('[Video Error]', e);
  videoPreview.onloadedmetadata = () => console.log('[Metadata] Duration:', videoPreview.duration);
  videoPreview.onended = () => handleVideoEnd();

  // Show video preview container, hide camera
  document.getElementById('video-preview-container')?.style.setProperty('display', 'block');
  document.getElementById('camera-preview-container')?.style.setProperty('display', 'none');

  const videoMount = document.getElementById('video-preview-container');
  if (videoMount) {
    videoMount.innerHTML = '';
    videoMount.appendChild(videoPreview);
  }

  // Update now-playing UI
  const nowPlayingContent = document.querySelector('.now-playing-content');
  const nowPlayingBlock = document.querySelector('.now-playing-block');
  nowPlayingContent.innerHTML = '';
  nowPlayingContent.appendChild(createMediaBlock(name, url, currentIndex));
  nowPlayingBlock?.classList.add('playing');

  videoPreview.play().catch(err => console.warn('[play()] error:', err));
}

/**
 * Handle what happens when a video ends
 * #Need to fix this logic to handle the ending of videos properly
 * it needs to not play the video or supercede the current camera if camera is set to be shown
 * 
 */
function handleVideoEnd() {
  if (loopMode) return videoPreview.play();

  if (shuffleMode) {
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
}
/**
 * Clear playlist and reset UI
 */
export function clearPlaylist() {
  playlistItems = [];
  currentIndex = -1;
  currentPlaylistName = null;
  document.querySelector('.now-playing-block')?.classList.remove('playing');
  document.querySelector('.playlist-items').innerHTML = '';
  document.querySelector('.now-playing-content').innerHTML = '';
}

/**
 * Setup all playback control buttons
 */
export function setupNowPlayingControls() {
  document.querySelector('.ctrl-btn-msc.prev')?.addEventListener('click', () => {
    if (currentIndex > 0) {
      console.log("Press Previous");
      currentIndex--;
      playCurrent();
    }
  });

  document.querySelector('.ctrl-btn-msc.next')?.addEventListener('click', () => {
    if (currentIndex < playlistItems.length - 1) {
      console.log("Press Next");
      currentIndex++;
      playCurrent();
    }
  });

  document.querySelector('.ctrl-btn-msc.pause')?.addEventListener('click', () => {
    if (!videoPreview) return;
    console.log("Pause/Play Video");
    videoPreview.paused ? videoPreview.play() : videoPreview.pause();
  });


  btnLoop?.addEventListener('click', () => {
    console.log("Toggle Loop Mode");
    loopMode = !loopMode;
    shuffleMode = false;
    updateModeButtons();
  });

  btnShuffle?.addEventListener('click', () => {
    console.log("Toggle Shuffle Mode");
    shuffleMode = !shuffleMode;
    loopMode = false;
    updateModeButtons();
  });
}

// ---------------- Playlist Saving ----------------

document.getElementById('savePlaylistBtn')?.addEventListener('click', () => {
  const name = prompt("Enter a name for the new playlist:");
  if (name) savePlaylist(name);
});

document.getElementById('saveOrderBtn')?.addEventListener('click', () => {
  if (!currentPlaylistName) return alert("No loaded playlist to save.");
  savePlaylist(currentPlaylistName);
});

async function savePlaylist(name) {
  try {
    const res = await fetch('/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, items: playlistItems })
    });

    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Failed to save playlist.');

    alert(`Playlist "${name}" saved successfully.`);
    currentPlaylistName = name;
    await listAllPlaylists();
  } catch (err) {
    console.error('[SavePlaylist]', err);
    alert("Error saving playlist.");
  }
}

/**
 * Load list of all saved playlists
 */
export async function listAllPlaylists() {
  try {
    const res = await fetch('/playlists');
    const data = await res.json();

    const group = document.querySelector('.playlist-group');
    if (!group) return;
    group.innerHTML = '';

    data.forEach(pl => {
      const wrapper = document.createElement('div');
      wrapper.className = 'playlist-btn';
      wrapper.textContent = pl.name;

      // Create remove icon
      const remove = document.createElement('span');
      remove.className = 'delete-btn';
      remove.innerHTML = `<img src="${window.STATIC_ICON_PATH}close.png" alt="Delete">`;
      remove.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Delete playlist "${pl.name}"?`)) {
          deletePlaylist(pl.name);
        }
      };

      wrapper.appendChild(remove);
      wrapper.onclick = () => loadPlaylist(pl.name);
      group.appendChild(wrapper);
    });
  } catch (err) {
    console.error('[LoadPlaylists]', err);
  }
}

/**
 * Load a playlist and queue all items
 */
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

// ---------------- Playlist Adding ----------------

document.getElementById('savePlaylistBtn-video')?.addEventListener('click', () => {
  const name = prompt("Enter a name for the new playlist:");
  if (name) savePlaylist(name);
});


// ---------------- Playlist Deletion ----------------
export function removeFromPlaylistByUrl(url) {
  const removedCount = playlistItems.filter(item => item.url === url).length;
  playlistItems = playlistItems.filter(item => item.url !== url);

  if (removedCount > 0) {
    console.log(`Removed ${removedCount} instance(s) of "${url}" from playlist`);
    renderPlaylist();
  }

  if (currentIndex >= playlistItems.length) {
    currentIndex = playlistItems.length - 1;
  }
}

async function deletePlaylist(name) {
  try {
    const res = await fetch(`/playlists/${name}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) return alert(data.error || 'Failed to delete playlist.');

    alert(`Playlist "${name}" deleted successfully.`);
    if (currentPlaylistName === name) clearPlaylist();
    await listAllPlaylists();
  } catch (err) {
    console.error('[DeletePlaylist]', err);
    alert('Error deleting playlist.');
  }
}

