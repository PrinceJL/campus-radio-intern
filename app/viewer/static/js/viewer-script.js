// viewer.js
const video = document.getElementById('radio-stream');
const brb = document.getElementById('brb-standby');
const socket = io();
let peerConnection = null;

function showBRB(show) {
  brb.style.display = show ? 'block' : 'none';
  video.style.display = show ? 'none' : 'block';
}

showBRB(true);

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
      video.srcObject = receivedStream;
    }

    showBRB(false);
    video.muted = false;

    video.play().catch(e => console.warn('[Viewer] Autoplay blocked:', e));

    // Optional: Debug actual resolution
    const receiver = peerConnection.getReceivers().find(r => r.track.kind === 'video');
    if (receiver) {
      setInterval(async () => {
        const stats = await receiver.getStats();
        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            console.log(`[Viewer] Resolution: ${report.frameWidth}x${report.frameHeight}, FPS: ${report.framesPerSecond}`);
          }
        });
      }, 3000);
    }
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
