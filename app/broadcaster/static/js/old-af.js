import { audioPreview, videoPreview, cameraPreview } from "./media-elements.js";
import { switchToStream } from './broadcaster/stream-manager.js';
import { setActiveMedia } from './mediaManager.js';
import { generateUUID } from "./gen-ID.js";

let analyser, dataArray, visualizerId; //audio visualizer variables
let animationId;


//Audio player
const audioCtx = new (window.AudioContext ||window.webkitURL);
const player = audioCtx.createMediaElementSource(audioPreview);
player.connect(audioCtx.destination);

audioPreview.addEventListener('play', () => {
  console.log('[AUDIO] Audio started playing.');
  setActiveMedia(audioPreview); 
});
//Music queue
let currentIndex = 0;
let audioQueue = [];

//controls
let activeMedia = null;

export function setupNowPlayingControlsAudio() {
  document.querySelector('.ctrl-btn-msc.prev')?.addEventListener('click', () => {
    if (currentIndex > 0) {
      console.log("Press Previous");
      currentIndex--;
      playCurrentAudio();
    }
  });

  document.querySelector('.ctrl-btn-msc.next')?.addEventListener('click', () => {
    if (currentIndex < audioQueue.length - 1) {
      console.log("Press Next");
      currentIndex++;
      playCurrentAudio();
    }
  });

  document.querySelector('.ctrl-btn-msc.pause')?.addEventListener('click', () => {
    if (!audioPreview) return;
    console.log("Pause/Play Video");
    audioPreview.paused ? audioPreview.play() : audioPreview.pause();
  });


  // btnLoop?.addEventListener('click', () => {
  //   console.log("Toggle Loop Mode");
  //   loopMode = !loopMode;
  //   shuffleMode = false;
  //   updateModeButtons();
  // });

  // btnShuffle?.addEventListener('click', () => {
  //   console.log("Toggle Shuffle Mode");
  //   shuffleMode = !shuffleMode;
  //   loopMode = false;
  //   updateModeButtons();
  // });
}

//play and pause for audio
audioPreview.addEventListener('play', () => {
  activeMedia = audioPreview;
});
audioPreview.addEventListener('pause', () => {
  activeMedia = audioPreview;
});

document.getElementById('btnPlayPause')?.addEventListener('click', () => {
  if (audioPreview.paused) {
    audioPreview.play();
  } else {
    audioPreview.pause();
  }
});
//there are two audio players: deck a and deck b.
  //under these audio players are audio functions such as panning, volume control, crossfade etc.

export function queueAudio(name, url) {
  const normUrl = new URL(url, window.location.origin).pathname;
  const item = { id: generateUUID, name, url: normUrl };
  audioQueue.push(item);
  renderAudioPlaylist();
  console.log(audioQueue.map(item => item.name));
}

function renderAudioPlaylist() {
     const container = document.querySelector('.playlist-items');
     if (!container) return;
   
     container.innerHTML = '';
     audioQueue.forEach((item, index) => {
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
         audioQueue.splice(newIndex, 0, movedItem);
   
         // Recalculate currentIndex based on the video URL
         if (currentIndex !== -1) {
           const currentUrl = audioPreview.src;
           const match = audioQueue.findIndex(item => currentUrl.includes(item.url));
           if (match !== -1) currentIndex = match;
         }
   
         renderAudioPlaylist(); // Re-render updated list
       }
     });
   }
   
 
 
function playCurrentAudio() {
  if (currentIndex < 0 || currentIndex >= audioQueue.length) return;

  const { name, url } = audioQueue[currentIndex];
  console.log('Playing: ' + name, url);

  const audioPreview = document.getElementById('audio-preview-container');
  const videoPreview = document.getElementById('video-preview-container');
  if (audioPreview) {
    audioPreview.style.display = 'block';
    // DO NOT clear innerHTML, just remove any previous audio element
    const oldAudio = audioPreview.querySelector('audio');
    if (oldAudio) oldAudio.remove();
    audioPreview.appendChild(audioPreview);
  }
  if (videoPreview) videoPreview.style.display = 'none';

  // Reset audioPreview
  audioPreview.pause();
  audioPreview.srcObject = null;
  audioPreview.removeAttribute('src');
  audioPreview.load();
  audioPreview.src = url;
  audioPreview.controls = true;
  audioPreview.autoplay = true;
  audioPreview.muted = false;

  // Resume AudioContext if needed
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  // Bind capture logic
  audioPreview.onplaying = () => {
    console.log('[DBG] Audio started. Capturing stream...');
    const stream = audioPreview.captureStream?.();
    if (stream) switchToStream(stream);
    else console.warn('[WARN] captureStream failed');
  };

  // Error/Metadata/End handlers
  audioPreview.onerror = e => console.error('[Audio Error]', e);
  audioPreview.onloadedmetadata = () => console.log('[Metadata] Duration:', audioPreview.duration);
  audioPreview.onended = () => handleVideoEnd();

  // Show audio preview container, hide camera
  document.getElementById('audio-preview-container')?.style.setProperty('display', 'block');
  document.getElementById('camera-preview-container')?.style.setProperty('display', 'none');

  // No need to clear and recreate the canvas here!

  // Update now-playing UI
  const nowPlayingContent = document.querySelector('.now-playing-content');
  const nowPlayingBlock = document.querySelector('.now-playing-block');
  nowPlayingContent.innerHTML = '';
  nowPlayingContent.appendChild(createAudioMediaBlock(name, url, currentIndex));
  nowPlayingBlock?.classList.add('playing');

  audioPreview.play().catch(err => console.warn('[play()] error:', err));
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
    preview.src = '/broadcaster/static/icon/mp3-icon.png';
  } else {
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
    audioQueue.splice(index, 1);
    if (currentIndex >= audioQueue.length) currentIndex = audioQueue.length - 1;
    renderAudioPlaylist();
  };
  rightSide.appendChild(delBtn);

  block.append(mediaInfo, rightSide);
  block.onclick = () => {
    currentIndex = index;
    playCurrentAudio();
  };

  return block;
}

function clearQueue() {
  audioQueue = [];
  currentIndex = -1;
  document.querySelector('.now-playing-block')?.classList.remove('playing');
  document.querySelector('.playlist-items').innerHTML = '';
  document.querySelector('.now-playing-content').innerHTML = '';
  // Hide audio preview container
  const audioPreview = document.getElementById('audio-preview-container');
  if (audioPreview) audioPreview.style.display = 'none';
}

function setupAudioVisualizer() {
  const canvas = document.getElementById('audio-visualizer');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Match canvas size to its actual display size
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  if (!analyser) {
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    player.connect(analyser);
    analyser.connect(audioCtx.destination);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
  }

  function draw() {
    animationId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const spacing = 2;
    const totalSpacing = spacing * (dataArray.length - 1);
    const barWidth = (canvas.width - totalSpacing) / dataArray.length;

    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = (dataArray[i] / 255) * (canvas.height * 0.8);
      const x = i * (barWidth + spacing);

      ctx.fillStyle = "#d1d5db"; // light gray
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

      if (i < Math.floor(dataArray.length * 1)) {
        ctx.fillStyle = "#073066"; // highlight leftmost
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      }
    }
  }

  draw();
}

function stopAudioVisualizer() {
  if (animationId) cancelAnimationFrame(animationId);
  const canvas = document.getElementById('audio-visualizer');
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

// Start/stop visualizer on play/pause/ended
audioPreview.addEventListener('play', setupAudioVisualizer);
audioPreview.addEventListener('pause', stopAudioVisualizer);
audioPreview.addEventListener('ended', stopAudioVisualizer);

















 //Functions to be added:
 //play current function
 //automatically load next song to deck b
 //buttons to queue next song to deck a or deck b


 //DJ deck elements-need to be added first 
// const audioPreview = document.getElementById('audioPreview');
// const audioB = document.getElementById('audioB');
// const playPauseA = document.getElementById('playPauseA');
// const playPauseB = document.getElementById('playPauseB');
// const volumeA = document.getElementById('volumeA');
// const volumeB = document.getElementById('volumeB');
// const crossfader = document.getElementById('crossfader');

// Play/Pause
// playPauseA.addEventListener('click', () => {

//     if (audioCtx.state === "suspended") {
//       audioCtx.resume();
//     }
//     // Play or pause track depending on state
//     if (playPauseButton.dataset.playing === "false") {
//       playPauseButton.dataset.playing = "true";
//       playPauseButton.innerHTML = 'Pause';
//       audioPreview.play();
//     } else if (playPauseButton.dataset.playing === "true") {
//       playPauseButton.dataset.playing = "false";
//       playPauseButton.innerHTML = 'Play';
//       audioPreview.pause();
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
//   audioPreview.volume = volumeA.value;
// });

// volumeB.addEventListener('input', () => {
//   audioB.volume = volumeB.value;
// });

// // Crossfade Control- change implementation
// crossfader.addEventListener('input', () => {
//   audioPreview.volume = 1 - crossfader.value;
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

