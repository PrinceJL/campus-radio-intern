import { generateVideoThumbnail, getVideoDuration } from './file-handler.js';

let currentIndex = -1;
let playlistItems = [];
let prevClickTimeout = null;
let prevClickCount = 0;
let loopMode = false;
let shuffleMode = false;
let currentPlaylistName = null;

const btnLoop = document.getElementById('btnLoop');
const btnShuffle = document.getElementById('btnShuffle');

btnLoop?.addEventListener('click', () => {
  loopMode = !loopMode;
  shuffleMode = false;
  updateModeButtons();
});

btnShuffle?.addEventListener('click', () => {
  shuffleMode = !shuffleMode;
  loopMode = false;
  updateModeButtons();
});

function updateModeButtons() {
  btnLoop.classList.toggle('active', loopMode);
  btnShuffle.classList.toggle('active', shuffleMode);
}

export function queueVideo(name, url) {
  const normUrl = normalizeUrl(url);
  if (playlistItems.some(item => normalizeUrl(item.url) === normUrl)) {
    console.log(`⚠️ Skipping duplicate: ${name} (${normUrl})`);
    return;
  }
  playlistItems.push({ name, url });
  console.log(`✅ Queued: ${name} (${normUrl})`);
  renderPlaylist();
}
function normalizeUrl(url) {
  const a = document.createElement('a');
  a.href = url;
  return a.pathname;  // Ensures consistent comparison
}

function renderPlaylist() {
  const nextUp = document.querySelector('.playlist-items');
  if (!nextUp) return;
  nextUp.innerHTML = '';

  playlistItems.forEach((item, index) => {
    const block = createMediaBlock(item.name, item.url, index);

    block.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-btn')) return;
      currentIndex = index;
      playCurrent();
    });

    const delBtn = document.createElement('button');
    delBtn.textContent = '❌';
    delBtn.classList.add('delete-btn');
    delBtn.style.marginLeft = '8px';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playlistItems.splice(index, 1);
      if (currentIndex >= playlistItems.length) currentIndex = playlistItems.length - 1;
      renderPlaylist();
    });

    block.querySelector('.media-right')?.appendChild(delBtn);
    nextUp.appendChild(block);
  });

  Sortable.create(nextUp, {
    animation: 150,
    handle: '.media-block',
    draggable: '.media-block',
    onEnd: () => {
      const reordered = Array.from(nextUp.querySelectorAll('.media-block')).map(el =>
        playlistItems[parseInt(el.dataset.index)]
      );
      playlistItems = reordered;
      renderPlaylist();
    }
  });
}

export function clearPlaylist() {
  playlistItems = [];
  currentIndex = -1;
  currentPlaylistName = null;
  document.querySelector('.playlist-items').innerHTML = '';
  document.querySelector('.stream-preview-area').innerHTML = '';
  document.querySelector('.now-playing-block .now-playing-content').innerHTML = '';
}


function playCurrent() {
  if (currentIndex < 0 || currentIndex >= playlistItems.length) return;

  const item = playlistItems[currentIndex];
  const previewArea = document.querySelector('.stream-preview-area');
  const nowPlayingBlock = document.querySelector('.now-playing-block');

  const video = document.createElement('video');
  video.src = item.url;
  video.controls = true;
  video.autoplay = true;
  video.style.width = '100%';
  previewArea.innerHTML = '';
  previewArea.appendChild(video);

  const contentArea = nowPlayingBlock.querySelector('.now-playing-content');
  contentArea.innerHTML = '';
  contentArea.appendChild(createMediaBlock(item.name, item.url, currentIndex));

  nowPlayingBlock.classList.add('playing');
  const pauseBtn = nowPlayingBlock.querySelector('.ctrl-btn.pause');
  if (pauseBtn) pauseBtn.textContent = '⏸️';

  video.onended = () => {
    if (loopMode) {
      video.currentTime = 0;
      video.play();
    } else if (shuffleMode) {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * playlistItems.length);
      } while (nextIndex === currentIndex && playlistItems.length > 1);
      currentIndex = nextIndex;
      playCurrent();
    } else if (currentIndex < playlistItems.length - 1) {
      currentIndex++;
      playCurrent();
    } else {
      currentIndex = -1;
    }
  };

  highlightPlaylistItem(currentIndex);
}

function createMediaBlock(name, url, index) {
  const block = document.createElement('div');
  block.classList.add('media-block');
  block.dataset.index = index;

  const mediaInfo = document.createElement('div');
  mediaInfo.classList.add('media-info');

  const preview = document.createElement('img');
  preview.alt = name;
  preview.width = 40;
  preview.height = 40;

  const ext = name.split('.').pop().toLowerCase();
  if (ext.match(/(mp4|webm|avi|mov)/)) {
    generateVideoThumbnail(url, preview);
  } else if (ext.match(/(mp3|wav|ogg)/)) {
    preview.src = 'https://via.placeholder.com/40x40?text=MP3';
  } else {
    preview.src = 'https://via.placeholder.com/40x40?text=?';
  }

  const label = document.createElement('span');
  label.classList.add('media-title');
  label.textContent = name.length > 20 ? name.slice(0, 17) + '...' : name;

  mediaInfo.appendChild(preview);
  mediaInfo.appendChild(label);

  const rightSide = document.createElement('div');
  rightSide.classList.add('media-right');

  if (ext.match(/(mp4|webm|avi|mov)/)) {
    const durationSpan = document.createElement('span');
    durationSpan.classList.add('media-duration');
    getVideoDuration(url, dur => durationSpan.textContent = dur);
    rightSide.appendChild(durationSpan);
  }

  block.appendChild(mediaInfo);
  block.appendChild(rightSide);
  return block;
}

function highlightPlaylistItem(index) {
  const blocks = document.querySelectorAll('.next-up .media-block');
  blocks.forEach((b, i) => {
    b.classList.toggle('active', i === index);
  });
}

export function setupPlaylistControls() {
  const ctrlPrev = document.querySelector('.ctrl-btn.prev');
  const ctrlNext = document.querySelector('.ctrl-btn.next');
  const ctrlPause = document.querySelector('.ctrl-btn.pause');

  ctrlPrev?.addEventListener('click', () => {
    const video = document.querySelector('.stream-preview-area video');
    if (!video) return;

    prevClickCount++;
    clearTimeout(prevClickTimeout);

    prevClickTimeout = setTimeout(() => {
      if (prevClickCount === 1) {
        video.currentTime = 0;
        video.play();
      } else if (prevClickCount >= 2) {
        if (currentIndex > 0) {
          currentIndex--;
          playCurrent();
        } else {
          video.currentTime = 0;
          video.play();
        }
      }
      prevClickCount = 0;
    }, 250);
  });

  ctrlNext?.addEventListener('click', () => {
    if (playlistItems.length === 0) return;
    if (shuffleMode) {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * playlistItems.length);
      } while (nextIndex === currentIndex && playlistItems.length > 1);
      currentIndex = nextIndex;
    } else if (currentIndex < playlistItems.length - 1) {
      currentIndex++;
    } else {
      currentIndex = -1;
      return;
    }
    playCurrent();
  });

  ctrlPause?.addEventListener('click', () => {
    const video = document.querySelector('.stream-preview-area video');
    if (!video) return;
    if (video.paused) {
      video.play();
      ctrlPause.textContent = '⏸️';
    } else {
      video.pause();
      ctrlPause.textContent = '▶️';
    }
  });
}

// Save Playlist
document.getElementById('savePlaylistBtn')?.addEventListener('click', () => {
  const name = prompt("Enter a new playlist name:");
  if (!name) return;

  fetch('/playlists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      items: playlistItems.map(item => ({ name: item.name, url: item.url }))
    })
  })
    .then(res => res.json())
    .then(data => {
      alert(`Created playlist "${name}"`);
      currentPlaylistName = name;
    })
    .catch(err => {
      console.error('Create playlist error:', err);
      alert('Failed to create playlist.');
    });
});

// Save Current Order
document.getElementById('saveOrderBtn')?.addEventListener('click', () => {
  if (!currentPlaylistName) {
    alert("No active playlist to save. Use ➕ to create one first.");
    return;
  }

  fetch('/playlists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: currentPlaylistName,
      items: playlistItems.map(item => ({ name: item.name, url: item.url }))
    })
  })
    .then(res => res.json())
    .then(data => {
      alert(`Playlist "${currentPlaylistName}" saved!`);
    })
    .catch(err => {
      console.error('Save playlist error:', err);
      alert('Failed to save playlist.');
    });
});

export async function listAllPlaylists() {
  try {
    const res = await fetch('/playlists');
    const data = await res.json();
    const group = document.querySelector('.playlist-group');
    if (!group) return;

    group.innerHTML = '';

    data.forEach(pl => {
      const wrapper = document.createElement('div');
      wrapper.classList.add('playlist-btn');
      wrapper.dataset.name = pl.name;

      const label = document.createElement('span');
      label.textContent = pl.name;

      const removeBtn = document.createElement('span');
      removeBtn.textContent = '🗑️';
      removeBtn.classList.add('remove-icon');
      removeBtn.title = 'Delete playlist';

      removeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const confirmed = confirm(`Delete playlist "${pl.name}"? This will remove it from the database.`);
        if (!confirmed) return;

        try {
          const delRes = await fetch(`/playlists/${encodeURIComponent(pl.name)}`, {
            method: 'DELETE'
          });

          const result = await delRes.json();
          if (delRes.ok) {
            alert(`Deleted "${pl.name}"`);
            wrapper.remove(); // Remove from UI
          } else {
            alert(result.error || 'Failed to delete playlist.');
          }
        } catch (err) {
          console.error('Error deleting playlist:', err);
          alert('Network error while deleting playlist.');
        }
      });

      // Clicking the main button loads the playlist
      wrapper.addEventListener('click', () => {
        loadPlaylist(pl.name);
      });

      wrapper.appendChild(label);
      wrapper.appendChild(removeBtn);
      group.appendChild(wrapper);
    });
  } catch (err) {
    console.error('Failed to load playlists:', err);
  }
}


async function loadPlaylist(name) {
  try {
    const res = await fetch(`/playlists/${name}`);
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Failed to load');

    clearPlaylist();
    data.items.forEach(item => queueVideo(item.name, item.url));
    currentPlaylistName = name;
  } catch (err) {
    console.error('Load error:', err);
    alert('Failed to load playlist.');
  }
}
