// viewer.js
const video = document.getElementById('radio-stream');
const canvas = document.getElementById('audio-visualizer');
const brb = document.getElementById('brb-standby');
const socket = io();
let peerConnection = null;

function showBRB(show) {
  brb.style.display = show ? 'block' : 'none';
  video.style.display = show ? 'none' : 'block';
  if (canvas) canvas.style.display = 'none';
}

showBRB(true);


function setupAudioVisualizer(stream) {
  console.log('setupAudioVisualizer called');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  function draw() {
    requestAnimationFrame(draw);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / dataArray.length) * 1.5;
    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = dataArray[i] / 2;
      ctx.fillStyle = 'limegreen';
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  }
  draw();
}

const c = document.getElementById('audio-visualizer');
c.style.display = 'block';
c.style.zIndex = 1000;
c.style.border = '5px solid red';
c.width = 800;
c.height = 180;

const ctx = canvas.getContext('2d');
ctx.fillStyle = 'red';
ctx.fillRect(10, 10, 100, 100);

// Call this when you receive a stream:
function handleIncomingStream(stream) {
  const hasVideo = stream.getVideoTracks().length > 0;
  video.srcObject = stream; // Always set this

  if (hasVideo) {
    video.style.display = 'block';
    video.style.opacity = 1;
    canvas.style.display = 'none';
    video.play().catch(e => {});
    audioVisualizerActive = false;
  } else {
    video.style.display = 'none';
    video.style.opacity = 100; // Hide visually, but keep playing audio
    canvas.style.display = 'block';
    setupAudioVisualizer(stream);
    video.play().catch(e => {});
  }
}

socket.on('connect', () => {
  console.log('[Viewer] Connected to signaling server');
  socket.emit('watcher');
});

socket.on('offer', async (id, description) => {
  console.log('[Viewer] Received offer from broadcaster:', id);

  peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  let receivedStream = new MediaStream();

  peerConnection.ontrack = event => {
    if (!receivedStream.getTracks().includes(event.track)) {
      receivedStream.addTrack(event.track);
    }
    handleIncomingStream(receivedStream);
    showBRB(false);
    video.muted = false;
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('candidate', id, event.candidate);
    }
  };

  peerConnection.onconnectionstatechange = () => {
    if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
      showBRB(true);
    }
  };

  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(description));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', id, peerConnection.localDescription);
  } catch (err) {
    console.error('[Viewer] Error handling offer:', err);
    showBRB(true);
  }
});

socket.on('candidate', (id, candidate) => {
  if (peerConnection) {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      .catch(err => console.error('[Viewer] Error adding ICE candidate:', err));
  }
});

socket.on('broadcaster', () => {
  socket.emit('watcher');
});

socket.on('disconnectPeer', id => {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  showBRB(true);
});

window.onbeforeunload = () => {
  socket.close();
  if (peerConnection) {
    peerConnection.close();
  }
};

video.onended = () => {
  showBRB(true);
};

// Ticker logic
let tickerTimeouts = [];
socket.on('start-ticker', ({ message, speed, loops, interval }) => {
  const tickerContainer = document.getElementById('ticker-container');
  const tickerText = document.getElementById('ticker-content');
  tickerText.textContent = message;
  tickerText.style.animationDuration = `${speed}s`;
  tickerContainer.style.display = 'block';

  tickerTimeouts.forEach(clearTimeout);
  tickerTimeouts = [];

  let count = 0;
  const loopTicker = () => {
    tickerText.style.animation = 'none';
    void tickerText.offsetWidth;
    tickerText.style.animation = `scroll-left ${speed}s linear`;
    count++;
    if (loops === 0 || count < loops) {
      tickerTimeouts.push(setTimeout(loopTicker, (speed + interval) * 1000));
    }
  };
  loopTicker();
});

socket.on('stop-ticker', () => {
  const tickerContainer = document.getElementById('ticker-container');
  tickerContainer.style.display = 'none';
  tickerTimeouts.forEach(clearTimeout);
  tickerTimeouts = [];
});

socket.on('audio-waveform', ({ image, duration }) => {
  console.log('audio-waveform event received', image, duration);
  const waveformImg = document.getElementById('waveform-img');
  const playhead = document.getElementById('waveform-playhead');
  waveformImg.src = image;
  waveformImg.style.display = 'block';
  waveformImg.onerror = () => console.error('Waveform image failed to load');
  waveformImg.onload = () => console.log('Waveform image loaded', waveformImg.width, waveformImg.height);
  playhead.style.display = 'block';
  playhead.style.left = '0px'; // Reset playhead
  playhead.dataset.duration = duration || 0; // Store duration for later
});


function animatePlayhead() {
  const waveformImg = document.getElementById('waveform-img');
  const playhead = document.getElementById('waveform-playhead');
  if (waveformImg.style.display === 'none' || playhead.style.display === 'none') return;

  const duration = parseFloat(playhead.dataset.duration || video.duration || 0);
  if (!duration || video.paused) {
    requestAnimationFrame(animatePlayhead);
    return;
  }

  const percent = video.currentTime / duration;
  const containerWidth = waveformImg.offsetWidth;
  playhead.style.left = `${percent * containerWidth}px`;

  requestAnimationFrame(animatePlayhead);
}

// Start animation when audio is playing
video.addEventListener('play', animatePlayhead);
video.addEventListener('seeked', animatePlayhead);
video.addEventListener('timeupdate', animatePlayhead);

// Hide waveform and playhead when not needed (e.g., when video is playing)
function hideWaveform() {
  document.getElementById('waveform-img').style.display = 'none';
  document.getElementById('waveform-playhead').style.display = 'none';
}

