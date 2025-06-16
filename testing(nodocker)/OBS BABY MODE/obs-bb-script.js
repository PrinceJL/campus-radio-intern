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