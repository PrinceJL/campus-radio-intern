import { setupUploadManager } from "./file-handler";

setupUploadManager();

// function generateVideoThumbnail(videoUrl, imgElement) {
//   const video = document.createElement('video');
//   video.src = videoUrl;
//   video.crossOrigin = "anonymous"; // Required for drawing to canvas
//   video.muted = true;
//   video.playsInline = true;
//   video.preload = 'metadata';

//   video.addEventListener('loadedmetadata', () => {
//     // Set current time to a fraction (like 1s) into the video
//     video.currentTime = Math.min(1, video.duration / 2);
//   });

//   video.addEventListener('seeked', () => {
//     const canvas = document.createElement('canvas');
//     canvas.width = 80;
//     canvas.height = 60;
//     const ctx = canvas.getContext('2d');
//     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
//     imgElement.src = canvas.toDataURL();
//   });

//   video.addEventListener('error', () => {
//     imgElement.src = 'https://via.placeholder.com/40x40?text=VID';
//   });
// }

//Audio player
const audioPlayer = document.getElementById('audioPlayer');
const audioCtx = new (window.AudioContext ||window.webkitURL);
const player = audioCtx.createMediaElementSource(audioPlayer);
player.connect(audioCtx.destination);

//Music queue
let musicQueueIndex = 0;
let musicQueue = [];

//function will be updated in the new UI
function addToMusicQueue(){
  musicQueue = Array.from(audioPlaylist.querySelectorAll('li')).map(item => ({
  name: item.textContent,
  src: item.dataset.src
}));
}

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
musicLoader();
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    // Play or pause track depending on state
    if (playPauseButton.dataset.playing === "false") {
      playPauseButton.dataset.playing = "true";
      playPauseButton.innerHTML = 'Pause';
      audioPlayer.play();
    } else if (playPauseButton.dataset.playing === "true") {
      playPauseButton.dataset.playing = "false";
      playPauseButton.innerHTML = 'Play';
      audioPlayer.pause();
    }
      console.log(musicQueueIndex);
  },
  false,
  );

playPauseB.addEventListener('click', () => {
musicLoader();
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    // Play or pause track depending on state
    if (playPauseButton.dataset.playing === "false") {
      playPauseButton.dataset.playing = "true";
      playPauseButton.innerHTML = 'Pause';
      audioPlayer.play();
    } else if (playPauseButton.dataset.playing === "true") {
      playPauseButton.dataset.playing = "false";
      playPauseButton.innerHTML = 'Play';
      audioPlayer.pause();
    }
      console.log(musicQueueIndex);
  },
  false,
  );

// Volume Control
volumeA.addEventListener('input', () => {
  audioA.volume = volumeA.value;
});

volumeB.addEventListener('input', () => {
  audioB.volume = volumeB.value;
});

// Crossfade Control
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
