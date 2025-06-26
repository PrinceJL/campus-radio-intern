import { setupUploadManager } from "./file-handler.js";
import { normalizeUrl } from "./playlist-manager.js";

setupUploadManager();

//Web audio API
const audioPlayer = document.getElementById('audioPlayer');
const audioCtx = new (window.AudioContext ||window.webkitURL);
const player = audioCtx.createMediaElementSource(audioPlayer);
player.connect(audioCtx.destination);

//Music queue
let musicQueueIndex = 0;
let audioPlaylistItems = [];

//queueing audio
export function queueAudio(name,url){
   const normUrl = normalizeUrl(url);
   if (audioPlaylistItems.some(item => normalizeUrl(item.url) === normUrl)) {
     console.log(`⚠️ Skipping duplicate: ${name} (${normUrl})`);
     return;
   }
   audioPlayList.push({ name, url });
   console.log(`✅ Queued: ${name} (${normUrl})`);
   //have to create renderPlaylist function for audio
   renderAudioPlaylist();
 }


 function renderAudioPlaylist() {
   const nextUp = document.querySelector('.playlist-items');
   if (!nextUp) return;
   nextUp.innerHTML = '';
 
   audioPlaylistItems.forEach((item, index) => {
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
       if (currentIndex >= playlistItems.length) currentIndex = audioPlaylistItems.length - 1;
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
       renderAudioPlaylist();
     }
   });
 }
 
 
 function playCurrentAudio() {
   if (currentIndex < 0 || currentIndex >= playlistItems.length) return;
 
  //can add visualizer for audio

   const item = audioPlayList[currentIndex];
   const nowPlayingBlock = document.querySelector('.now-playing-block');

   if (audioA.src === true){
    audioB.src = item.src[currentIndex + 1]
   } else audioA.src = item.src;
   audioA.play();

   // needs fixing: audio deck a and b
  //  mainPreview.pause();
  //  mainPreview.srcObject = null;
  //  mainPreview.src = item.url;
  //  mainPreview.controls = true;
  //  mainPreview.autoplay = true;
  //  mainPreview.muted = false;
 
//    mainPreview.onloadedmetadata = () => {
//      rebroadcastStreamFrom(mainPreview);
//    };
 
// Inject mainPreview into the preview area
//    previewArea.innerHTML = '';
//    previewArea.appendChild(mainPreview);
 
//    // Show now playing info
//    const contentArea = nowPlayingBlock.querySelector('.now-playing-content');
//    contentArea.innerHTML = '';
//    contentArea.appendChild(createMediaBlock(item.name, item.url, currentIndex));
//    nowPlayingBlock.classList.add('playing');
 
//    const pauseBtn = nowPlayingBlock.querySelector('.ctrl-btn.pause');
//    if (pauseBtn) pauseBtn.textContent = '⏸️';
 
//    // Handle end of video
//    mainPreview.onended = () => {
//      if (loopMode) {
//        mainPreview.currentTime = 0;
//        mainPreview.play();
//      } else if (shuffleMode) {
//        let nextIndex;
//        do {
//          nextIndex = Math.floor(Math.random() * playlistItems.length);
//        } while (nextIndex === currentIndex && playlistItems.length > 1);
//        currentIndex = nextIndex;
//        playCurrent();
//      } else if (currentIndex < playlistItems.length - 1) {
//        currentIndex++;
//        playCurrent();
//      } else {
//        currentIndex = -1;
//      }
//    };
 
//    highlightPlaylistItem(currentIndex);
 }

 //Functions to be added:
 //play current function
 //automatically load next song to deck b
 //buttons to queue next song to deck a or deck b


 //DJ deck elements
const audioA = document.getElementById('audioA');
const audioB = document.getElementById('audioB');
const playPauseA = document.getElementById('playPauseA');
const playPauseB = document.getElementById('playPauseB');
const volumeA = document.getElementById('volumeA');
const volumeB = document.getElementById('volumeB');
const crossfader = document.getElementById('crossfader');
let audioPlayList = document.getElementById('playlist')

// Play/Pause
playPauseA.addEventListener('click', () => {

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    // Play or pause track depending on state
    if (playPauseButton.dataset.playing === "false") {
      playPauseButton.dataset.playing = "true";
      playPauseButton.innerHTML = 'Pause';
      audioA.play();
    } else if (playPauseButton.dataset.playing === "true") {
      playPauseButton.dataset.playing = "false";
      playPauseButton.innerHTML = 'Play';
      audioA.pause();
    }
      console.log(musicQueueIndex);
    let state = 
      playPauseA.getAttribute("aria-checked") === "true" ? 'true': false;
      playPauseA.setAttribute("aria-checked", state ? true : false);
  },
  false
  );


playPauseB.addEventListener('click', () => {
  if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    // Play or pause track depending on state
    if (playPauseButton.dataset.playing === "false") {
      playPauseButton.dataset.playing = "true";
      playPauseButton.innerHTML = 'Pause';
      audioB.play();
    } else if (playPauseButton.dataset.playing === "true") {
      playPauseButton.dataset.playing = "false";
      playPauseButton.innerHTML = 'Play';
      audioB.pause();
    }
      console.log(musicQueueIndex);
    let state = 
      playPauseB.getAttribute("aria-checked") === "true" ? 'true': false;
      playPauseB.setAttribute("aria-checked", state ? true : false);
  },
  false
  );

// Volume Control
volumeA.addEventListener('input', () => {
  audioA.volume = volumeA.value;
});

volumeB.addEventListener('input', () => {
  audioB.volume = volumeB.value;
});

// Crossfade Control- change implementation
crossfader.addEventListener('input', () => {
  audioA.volume = 1 - crossfader.value;
  audioB.volume = crossfader.value;
});


function debugging(){
  console.log("Music queue:", musicQueue.length);
}

//Music Operations

function nextInQueue(){
  if (musicQueueIndex < (musicQueue.length-1)){
    musicQueueIndex++;
    } else console.warn ('No next song');
}
function prevInQueue(){
  if (musicQueueIndex > 0){
    musicQueueIndex--;
  } else console.warn ('No previous song');
}

function musicLoader(){
  const currentSong = musicQueue[musicQueueIndex];
  const nextSong = musicQueue[musicQueueIndex + 1];
  audioPlayer.src = currentSong.src;
  console.log ('currentsource:', audioPlayer.src);
  console.log('currentSong:', currentSong);
  console.log('musicQueueIndex:', musicQueueIndex);
}
