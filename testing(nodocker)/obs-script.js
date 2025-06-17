// Add Scene
function addScene() {
  const scenesList = document.getElementById("scenes-list");
  const sceneCount = scenesList.children.length;
  const newScene = document.createElement("li");
  newScene.className = "scene-item";
  newScene.textContent = `Scene ${sceneCount + 1}`;
  scenesList.appendChild(newScene);
}

// Add Source
function addSource() {
  const sourcesList = document.getElementById("sources-list");
  const sourceCount = sourcesList.children.length;
  const newSource = document.createElement("li");
  newSource.className = "source-item";
  newSource.innerHTML = `<input type="checkbox" checked /> Source ${sourceCount + 1}`;
  sourcesList.appendChild(newSource); 

}

//integrate camera to source
window.goLive = async function(cameraId) {
  const camEl = document.getElementById(cameraId);
  console.log("Audio ID on cam:", camEl.dataset.audioDeviceId);

  if (!confirm(`Do you want to add camera ${cameraId} to the live monitor feed?`)) {
    return;
  }

  confirmAndReplaceLiveMonitor(async () => {
    const liveMonitor = document.getElementById("liveMonitor");
    
    try {
      const constraints = {
        video: camEl.dataset.deviceId ? { deviceId: { exact: camEl.dataset.deviceId } } : true,
        audio: camEl.dataset.audioDeviceId ? { deviceId: { exact: camEl.dataset.audioDeviceId } } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      camEl.srcObject = stream;
      camEl.play();

      liveMonitor.srcObject = stream;
      liveMonitor.play();
      
      console.log(`Camera ${cameraId} is now live in monitor with audio:`, !!constraints.audio);
    } catch (error) {
      console.error('Error starting camera stream:', error);
      alert('Failed to start camera stream: ' + error.message);
    }
  });
};
