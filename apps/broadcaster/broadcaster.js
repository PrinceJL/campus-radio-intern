let mediaRecorder, stream, ws;
const preview = document.getElementById('preview');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

startBtn.onclick = async () => {
  stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  preview.srcObject = stream;
  ws = new WebSocket(`ws://${window.location.hostname}:8080/api/broadcast`);
  ws.binaryType = "arraybuffer";
  ws.onopen = () => {
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp8,opus' });
    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0 && ws.readyState === 1) ws.send(e.data);
    };
    mediaRecorder.start(1000); // send in 1s chunks
    startBtn.disabled = true;
    stopBtn.disabled = false;
  };
};

stopBtn.onclick = () => {
  mediaRecorder.stop();
  stream.getTracks().forEach(t => t.stop());
  ws.close();
  startBtn.disabled = false;
  stopBtn.disabled = true;
};