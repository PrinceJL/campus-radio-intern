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