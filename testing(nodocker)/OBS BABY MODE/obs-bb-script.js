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


// Media Uploading
const dropZone = document.getElementById('dropZone');
const mediaInput = document.getElementById('mediaInput');
const selectedFilesList = document.getElementById('selectedFilesList');
const uploadBtn = document.getElementById('uploadBtn');
const fileLibrary = document.getElementById('fileLibrary');
const videoPlaylist = document.getElementById('videoPlaylist');
const audioPlaylist = document.getElementById('audioPlaylist');


let pendingFiles = [];

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
  handleFileSelection(files);
});

mediaInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  handleFileSelection(files);
});

function handleFileSelection(files) {
  pendingFiles = files;
  selectedFilesList.innerHTML = '';
  files.forEach(file => {
    const li = document.createElement('li');
    li.textContent = file.name;
    
    selectedFilesList.appendChild(li);
  });
  uploadBtn.style.display = 'inline-block';
}

uploadBtn.addEventListener('click', () => {
  pendingFiles.forEach(file => addToFileLibrary(file));
  selectedFilesList.innerHTML = '';
  uploadBtn.style.display = 'none';
  pendingFiles = [];
});

function addToFileLibrary(file) {
  const li = document.createElement('li');
  const displayList = Array.from(fileLibrary.children).map (file => file.textContent);
  const fileURL = URL.createObjectURL(file);
  li.dataset.src = fileURL;
  li.textContent = file.name;
  li.draggable = true;
  li.classList.add('playlist-item');
  li.dataset.type = file.type.startsWith('video') ? 'video' : 'audio';
  li.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({
      name: file.name,
      type: li.dataset.type,
      source: li.dataset.src
    }));
  });
  if (li.dataset.type === 'video'){
    videoPlaylist.appendChild(li);
  } else audioPlaylist.appendChild(li);
  
  //checking
  console.log(displayList)
  console.log(li.dataset.src)
}

// Playlist Tabs
document.querySelectorAll('.playlist-tabs .tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.playlist-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.playlist-list').forEach(list => list.classList.remove('active'));
    const selectedTab = btn.getAttribute('data-tab');
    if (selectedTab === 'video') document.getElementById('videoPlaylist').classList.add('active');
    else if (selectedTab === 'audio') document.getElementById('audioPlaylist').classList.add('active');
    else if (selectedTab === 'files') fileLibrary.classList.add('active');
  });
});

// Drag-drop from fileLibrary to playlist
['videoPlaylist', 'audioPlaylist'].forEach(id => {
  const ul = document.getElementById(id);
  ul.addEventListener('dragover', e => e.preventDefault());
  ul.addEventListener('drop', e => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData("text/plain"));
    const li = document.createElement('li');
    li.textContent = data.name;
    li.classList.add('playlist-item');
    ul.appendChild(li);
  });
});

// Add Playlist Folder
document.getElementById('addPlaylistBtn').addEventListener('click', () => {
const name = prompt("Enter playlist folder name:");
if (!name) return;

// Detect active playlist tab
const activeTab = document.querySelector('.playlist-tabs .tab-btn.active');
if (!activeTab) return;

const tab = activeTab.getAttribute('data-tab');
const targetList = document.getElementById(tab + 'Playlist');

// Create collapsible playlist folder
const folder = document.createElement('li');
folder.classList.add('playlist-folder');

const header = document.createElement('div');
header.classList.add('folder-header');
header.textContent = name;
header.addEventListener('click', () => {
  nestedList.classList.toggle('collapsed');
});

const nestedList = document.createElement('ul');
nestedList.classList.add('nested-playlist');
nestedList.addEventListener('dragover', e => e.preventDefault());
nestedList.addEventListener('drop', e => {
  e.preventDefault();
  const data = JSON.parse(e.dataTransfer.getData("text/plain"));
  const li = document.createElement('li');
  li.textContent = data.name;
  li.classList.add('playlist-item');
  nestedList.appendChild(li);
});

folder.appendChild(header);
folder.appendChild(nestedList);
targetList.appendChild(folder);
});


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