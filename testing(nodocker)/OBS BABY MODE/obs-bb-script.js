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

//add camera
const cam = document.getElementById("cam1");
const camSelect = document.getElementById("webcamSelect");

async function getCamera() {
    const   devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = feeds.filter(feed => device.kind === 'feedInput')

    camSelect.innerHTML = '';

    cameras.forEach((camera, index) => {
      const option = document.createElement('option');
      option.value = camera.deviceId;
      option.text = camera.label ||  `Camera ${index + 1}`;
      camSelect.appendChild(option);
    });
  }

    async function startCamera(deviceId) {
      if (!deviceId) return;
    try{
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: {exact: deviceId} }
      });

    video.srcObject = stream;
  } catch (err) {
    console.error("camera error", err);
    alert("camera denied")
  }
}

camSelect.addEventListener('change' , () =>{
  startCamera(camSelect.value);
});

(async () => {
  await getCamera();
  if (camSelect.options.length > 0){
    startCamera(camSelect.value);
  }
})();


