// Basic JavaScript for interactivity
document.querySelector('.start-btn').addEventListener('click', () => {
    alert('Stream started!');
    document.querySelector('.start-btn').disabled = true;
    document.querySelector('.pause-btn').disabled = false;
    document.querySelector('.stop-btn').disabled = false;
});

document.querySelector('.stop-btn').addEventListener('click', () => {
    alert('Stream stopped!');
    document.querySelector('.start-btn').disabled = false;
    document.querySelector('.pause-btn').disabled = true;
    document.querySelector('.stop-btn').disabled = true;
});

document.querySelector('.pause-btn').addEventListener('click', () => {
    alert('Stream paused!');
    document.querySelector('.pause-btn').textContent = 'Resume Stream';
});

// Progress bar animation
const progress = document.querySelector('.progress');
let width = 0;
const interval = setInterval(() => {
    if (width >= 100) {
        clearInterval(interval);
    } else {
        width++;
        progress.style.width = `${width}%`;
    }
}, 200);

function setupUploadButtons() {
    const cards = document.querySelectorAll('.file-card');

    cards.forEach(card => {
        const type = card.dataset.type;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = type === 'video' ? 'video/*' :
            type === 'audio' ? 'audio/*' :
                type === 'image' ? 'image/*' : '*/*';
        input.style.display = 'none';

        // Append input OUTSIDE the card to avoid nesting issues
        document.body.appendChild(input);

        card.addEventListener('click', () => {
            input.click();
        });

        input.addEventListener('change', async () => {
            const file = input.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (res.ok) {
                    insertUploadedFile(file.name, data.url);
                } else {
                    alert(data.error || 'Upload failed.');
                }
            } catch (err) {
                console.error('Upload error:', err);
                alert('Network error during upload.');
            }
        });
    });
}

async function loadExistingUploads() {
    try {
        const res = await fetch('/uploads/files');
        const files = await res.json();
        files.forEach(f => {
            insertUploadedFile(f.filename, f.path);
        });
    } catch (err) {
        console.error('Failed to load files:', err);
    }
}

function getVideoDuration(url, callback) {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    video.muted = true;
    video.onloadedmetadata = () => {
        const duration = video.duration;
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60).toString().padStart(2, '0');
        callback(`${minutes}:${seconds}`);
        URL.revokeObjectURL(video.src);
    };
}

function generateVideoThumbnail(videoUrl, imgElement) {
  const video = document.createElement('video');
  video.src = videoUrl;
  video.crossOrigin = "anonymous"; // Required for drawing to canvas
  video.muted = true;
  video.playsInline = true;
  video.preload = 'metadata';

  video.addEventListener('loadedmetadata', () => {
    // Set current time to a fraction (like 1s) into the video
    video.currentTime = Math.min(1, video.duration / 2);
  });

  video.addEventListener('seeked', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    imgElement.src = canvas.toDataURL();
  });

  video.addEventListener('error', () => {
    imgElement.src = 'https://via.placeholder.com/40x40?text=VID';
  });
}


function insertUploadedFile(name, url) {
    const ext = name.split('.').pop().toLowerCase();
    const fileType = ext.match(/(mp4|webm|avi|mov)/) ? 'video' :
        ext.match(/(mp3|wav|ogg)/) ? 'audio' :
            ext.match(/(png|jpg|jpeg|gif|bmp|webp)/) ? 'image' : 'other';

    const container =
        fileType === 'video' ? document.querySelector('.next-up') :
            fileType === 'audio' ? document.querySelector('.now-playing-block') :
                fileType === 'image' ? document.querySelector('.media-files') : null;

    if (!container) return;

    const block = document.createElement('div');
    block.classList.add('media-block');

    const mediaInfo = document.createElement('div');
    mediaInfo.classList.add('media-info');

    const preview = document.createElement('img');
    preview.alt = name;
    preview.width = 40;
    preview.height = 40;

    if (fileType === 'image') {
        preview.src = url;
    } else if (fileType === 'video') {
        generateVideoThumbnail(url, preview);
    } else if (fileType === 'audio') {
        preview.src = 'https://via.placeholder.com/40x40?text=MP3';
    } else {
        preview.src = 'https://via.placeholder.com/40x40?text=?';
    }

    const label = document.createElement('span');
    label.classList.add('media-title');
    label.textContent = name.length > 20 ? name.slice(0, 17) + '...' : name;

    mediaInfo.appendChild(preview);
    mediaInfo.appendChild(label);

    const rightSide = document.createElement('div');
    rightSide.classList.add('media-right');

    // Add duration for video
    if (fileType === 'video') {
        const durationSpan = document.createElement('span');
        durationSpan.classList.add('media-duration');
        rightSide.appendChild(durationSpan);

        getVideoDuration(url, (durationText) => {
            durationSpan.textContent = durationText;
        });
    }

    const del = document.createElement('button');
    del.textContent = '❌';
    del.classList.add('delete-file-btn');
    del.addEventListener('click', () => deleteUploadedFile(ext, name, block));
    rightSide.appendChild(del);

    block.appendChild(mediaInfo);
    block.appendChild(rightSide);
    container.appendChild(block);
}



async function deleteUploadedFile(ext, filename, blockElement) {
    try {
        const res = await fetch(`/uploads/${ext}/${filename}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (res.ok) {
            blockElement.remove();
            console.log('Deleted:', filename);
        } else {
            alert(data.error || 'Delete failed.');
        }
    } catch (err) {
        console.error('Delete error:', err);
        alert('Network error during delete.');
    }
}

