import { setupUploadManager } from "./file-handler.js";
import { audioA } from "./broadcaster.js";
import { videoPreview, switchToStream } from './broadcaster.js';
setupUploadManager();

//Audio player
const audioCtx = new (window.AudioContext ||window.webkitURL);
const player = audioCtx.createMediaElementSource(audioA);
player.connect(audioCtx.destination);

//Music queue
let currentIndex = 0;
let audioQueue = [];
let audioPlaylistItems = [];


//get audio from uploaded files and play on click
//all clicked audio files will be pushed to audio queue
//all items in the audio queue can be saved to a playlist
//render audio queue
//access audio player 
//there are two audio players: deck a and deck b.
  //under these audio players are audio functions such as panning, volume control, crossfade etc.

//
export function queueAudio(name, url) {
  const normUrl = new URL(url, window.location.origin).pathname;
  const item = { id: crypto.randomUUID(), name, url: normUrl };
  audioQueue.push(item);
  audioPlaylistItems.push(item);
  renderAudioPlaylist();
  console.log(audioQueue.map(item => item.name));
}

function renderAudioPlaylist() {
     const container = document.querySelector('.playlist-items');
     if (!container) return;
   
     container.innerHTML = '';
     audioPlaylistItems.forEach((item, index) => {
       const block = createAudioMediaBlock(item.name, item.url, index);
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
         audioPlaylistItems.splice(newIndex, 0, movedItem);
   
         // Recalculate currentIndex based on the video URL
         if (currentIndex !== -1) {
           const currentUrl = audioA.src;
           const match = audioPlaylistItems.findIndex(item => currentUrl.includes(item.url));
           if (match !== -1) currentIndex = match;
         }
   
         renderAudioPlaylist(); // Re-render updated list
       }
     });
   }
   
 
 
function playCurrentAudio() {
  if (currentIndex < 0 || currentIndex >= audioPlaylistItems.length) return;

  const { name, url } = audioPlaylistItems[currentIndex];
  console.log('Playing: ' + name, url);

  // Reset audioA
  audioA.pause();
  audioA.srcObject = null;
  audioA.removeAttribute('src');
  audioA.load();
  audioA.src = url;
  audioA.controls = true;
  audioA.autoplay = true;
  audioA.muted = false;

  // Resume AudioContext if needed
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  // Bind capture logic
  audioA.onplaying = () => {
    console.log('[DBG] Audio started. Capturing stream...');
    const stream = audioA.captureStream?.();
    if (stream) switchToStream(stream);
    else console.warn('[WARN] captureStream failed');
  };

  // Error/Metadata/End handlers
  audioA.onerror = e => console.error('[Audio Error]', e);
  audioA.onloadedmetadata = () => console.log('[Metadata] Duration:', audioA.duration);
  audioA.onended = () => handleVideoEnd();

  // Show audio preview container, hide camera (optional)
  document.getElementById('audio-preview-container')?.style.setProperty('display', 'block');
  document.getElementById('camera-preview-container')?.style.setProperty('display', 'none');

  const audioMount = document.getElementById('audio-preview-container');
  if (audioMount) {
    audioMount.innerHTML = '';
    audioMount.appendChild(audioA);
  }

  // Update now-playing UI
  const nowPlayingContent = document.querySelector('.now-playing-content');
  const nowPlayingBlock = document.querySelector('.now-playing-block');
  nowPlayingContent.innerHTML = '';
  nowPlayingContent.appendChild(createAudioMediaBlock(name, url, currentIndex));
  nowPlayingBlock?.classList.add('playing');

  audioA.play().catch(err => console.warn('[play()] error:', err));
}

function createAudioMediaBlock (name, url, index) {
  const block = document.createElement('div');
  block.className = 'media-block';
  block.dataset.index = index;

  const mediaInfo = document.createElement('div');
  mediaInfo.className = 'media-info';

  const preview = document.createElement('img');
  preview.width = 40;
  preview.height = 40;

  const ext = name.split('.').pop().toLowerCase();
  if (/(mp3|wav|ogg)/.test(ext)) {
    // (url, preview);
  } else {
    preview.src = '/broadcaster/static/icon/CheersLogo.png';
  }

  const label = document.createElement('span');
  label.className = 'media-title';
  label.textContent = name;

  mediaInfo.append(preview, label);

  const rightSide = document.createElement('div');
  rightSide.className = 'media-right';

  // if (/(mp3|wav|ogg)/.test(ext)) {
  //   const duration = document.createElement('span');
  //   duration.className = 'media-duration';
  //   getVideoDuration(url, dur => duration.textContent = dur);
  //   rightSide.appendChild(duration);
  // }

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
    playCurrentAudio();
  };

  return block;
}


 //Functions to be added:
 //play current function
 //automatically load next song to deck b
 //buttons to queue next song to deck a or deck b


 //DJ deck elements-need to be added first 
// const audioA = document.getElementById('audioA');
// const audioB = document.getElementById('audioB');
const playPauseA = document.getElementById('playPauseA');
const playPauseB = document.getElementById('playPauseB');
const volumeA = document.getElementById('volumeA');
const volumeB = document.getElementById('volumeB');
const crossfader = document.getElementById('crossfader');
let audioPlayList = document.getElementById('playlist')

// Play/Pause
// playPauseA.addEventListener('click', () => {

//     if (audioCtx.state === "suspended") {
//       audioCtx.resume();
//     }
//     // Play or pause track depending on state
//     if (playPauseButton.dataset.playing === "false") {
//       playPauseButton.dataset.playing = "true";
//       playPauseButton.innerHTML = 'Pause';
//       audioA.play();
//     } else if (playPauseButton.dataset.playing === "true") {
//       playPauseButton.dataset.playing = "false";
//       playPauseButton.innerHTML = 'Play';
//       audioA.pause();
//     }
//       console.log(musicQueueIndex);
//     let state = 
//       playPauseA.getAttribute("aria-checked") === "true" ? 'true': false;
//       playPauseA.setAttribute("aria-checked", state ? true : false);
//   },
//   false
//   );


// playPauseB.addEventListener('click', () => {
//   if (audioCtx.state === "suspended") {
//       f.resume();
//     }
//     // Play or pause track depending on state
//     if (playPauseButton.dataset.playing === "false") {
//       playPauseButton.dataset.playing = "true";
//       playPauseButton.innerHTML = 'Pause';
//       audioB.play();
//     } else if (playPauseButton.dataset.playing === "true") {
//       playPauseButton.dataset.playing = "false";
//       playPauseButton.innerHTML = 'Play';
//       audioB.pause();
//     }
//       console.log(musicQueueIndex);
//     let state = 
//       playPauseB.getAttribute("aria-checked") === "true" ? 'true': false;
//       playPauseB.setAttribute("aria-checked", state ? true : false);
//   },
//   false
//   );

// // Volume Control
// volumeA.addEventListener('input', () => {
//   audioA.volume = volumeA.value;
// });

// volumeB.addEventListener('input', () => {
//   audioB.volume = volumeB.value;
// });

// // Crossfade Control- change implementation
// crossfader.addEventListener('input', () => {
//   audioA.volume = 1 - crossfader.value;
//   audioB.volume = crossfader.value;
// });


// function debugging(){
//   console.log("Music queue:", musicQueue.length);
// }

// //Music Operations

// function nextInQueue(){
//   if (musicQueueIndex < (musicQueue.length-1)){
//     musicQueueIndex++;
//     } else console.warn ('No next song');
// }
// function prevInQueue(){
//   if (musicQueueIndex > 0){
//     musicQueueIndex--;
//   } else console.warn ('No previous song');
// }

