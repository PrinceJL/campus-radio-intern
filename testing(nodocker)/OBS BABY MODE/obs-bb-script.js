//adding of videos (direct to stream not to playlist *augment it later*)
navigator.mediaDevices.enumerateDevices().then(devices => {
const webcamSelect = document.getElementById('webcamSelect');
const micSelect = document.getElementById('micSelect');

devices.forEach(device => {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.text = device.label || `${device.kind} ${webcamSelect.length + 1}`;

    if (device.kind === 'videoinput') {
    webcamSelect.appendChild(option);
    } else if (device.kind === 'audioinput') {
    micSelect.appendChild(option);
    }
});
});

navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  .then(stream => {
    const previewVideos = document.querySelectorAll('.preview-box');
    previewVideos.forEach(video => {
      video.srcObject = stream;
    });
  })
  .catch(err => {
    console.error("Error accessing webcam:", err);
  });


const dropZone = document.getElementById('dropZone');
const mediaInput = document.getElementById('mediaInput');
const mediaPlaylist = document.getElementById('mediaPlaylist');

dropZone.addEventListener('dragover', (e) => {
e.preventDefault();
dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
e.preventDefault();
dropZone.classList.remove('drag-over');
const files = Array.from(e.dataTransfer.files);
files.forEach(file => addToPlaylist(file));
});

mediaInput.addEventListener('change', (e) => {
const files = Array.from(e.target.files);
files.forEach(file => addToPlaylist(file));
});

function addToPlaylist(file) {
const li = document.createElement('li');
li.textContent = file.name;
mediaPlaylist.appendChild(li);
}

// cameras
const cam = [
  document.getElementById("cam1"),
  document.getElementById("cam2"),
  document.getElementById("cam3"),
  document.getElementById("cam4")
];

let cameraDevices = [];
const camInUse = new Map(); // deviceId -> video element
let activeVideoEl = null;   // Currently selected video element

const camSelect = document.getElementById("webcamSelect");

async function getCamera() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  cameraDevices = devices.filter(device => device.kind === 'videoinput');

  if (camSelect) {
    camSelect.innerHTML = '';
    cameraDevices.forEach((camera, index) => {
      const option = document.createElement('option');
      option.value = camera.deviceId;
      option.text = camera.label || `Camera ${index + 1}`;
      camSelect.appendChild(option);
    });
  }
}

async function startCamera(videoEl, deviceId) {
  if (!deviceId || !videoEl) return;

  if (camInUse.has(deviceId) && camInUse.get(deviceId) !== videoEl) {
    alert("This camera is already in use.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } },
      audio: false
    });

    if (videoEl.srcObject) {
      videoEl.srcObject.getTracks().forEach(track => track.stop());

      // Remove old assignment
      for (const [usedId, el] of camInUse.entries()) {
        if (el === videoEl) {
          camInUse.delete(usedId);
          break;
        }
      }
    }

    videoEl.srcObject = stream;
    camInUse.set(deviceId, videoEl);
  } catch (err) {
    console.error("Camera error:", err);
    alert("Camera access denied or failed.");
  }
}

function setupClickHandlers() {
  cam.forEach(videoEl => {
    videoEl.addEventListener('click', () => {
      // Remove blue border from all
      cam.forEach(c => c.style.border = "none");

      // Highlight selected video
      videoEl.style.border = "1px solid blue";

      // Set selected video element
      activeVideoEl = videoEl;

      
    });
  });
}

// When a camera is selected in the dropdown
if (camSelect) {
  camSelect.addEventListener('change', () => {
    if (!activeVideoEl) {
      alert("Please click a video box first.");
      return;
    }

    startCamera(activeVideoEl, camSelect.value);
  });
}

// Initialize
(async () => {
  await getCamera();
  setupClickHandlers();

  if (cameraDevices.length > 0) {
    await startCamera(cam[0], cameraDevices[0].deviceId);
    cam[0].style.border = "1px solid blue";
    activeVideoEl = cam[0];
  }
})();

(async () => {
  await getCamera();
  setupClickHandlers();

  if (cameraDevices.length > 0) {
    await startCamera(cam[0], cameraDevices[0].deviceId);
  }
})();



// Theme Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
  const themeToggle = document.getElementById('themeToggle');
  
  // Check for saved theme preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
      document.body.classList.add('light-mode');
      themeToggle.textContent = 'Switch to Dark Mode';
  }

  // Theme toggle click handler
  themeToggle.addEventListener('click', function() {
      document.body.classList.toggle('light-mode');
      
      // Save theme preference
      if (document.body.classList.contains('light-mode')) {
          localStorage.setItem('theme', 'light');
          themeToggle.textContent = 'Switch to Dark Mode';
      } else {
          localStorage.setItem('theme', 'dark');
          themeToggle.textContent = 'Switch to Light Mode';
      }
  });
});


