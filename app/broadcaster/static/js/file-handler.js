import { queueVideo } from './playlist-manager.js';

export function setupUploadManager() {
    setupUploadButtons();
    loadExistingUploads();
}

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
        document.body.appendChild(input);

        const icon = card.querySelector('.upload-icon');
        if (icon) {
            icon.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent bubbling
                input.click();
            });
        }

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
                    displayInCard(card, file.name, data.url);  
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

function displayInCard(container, name, url) {
  const ext = name.split('.').pop().toLowerCase();
  const isVideo = /(mp4|webm|avi|mov)/.test(ext);
  const isAudio = /(mp3|wav|ogg)/.test(ext);
  const isImage = /(png|jpg|jpeg|gif|bmp|webp)/.test(ext);

  const media = document.createElement('div');
  media.classList.add('uploaded-media');

  const preview = document.createElement('img');
  preview.width = 40;
  preview.height = 40;

  if (isVideo) {
    generateVideoThumbnail(url, preview);
  } else if (isAudio) { //Set the thumbnail for audio
    preview.src = 'https://via.placeholder.com/40x40?text=MP3';
  } else if (isImage) { //Set the thumbnail for images
    preview.src = url;
  } else {
    preview.src = 'https://via.placeholder.com/40x40?text=?';
  }
  const label = document.createElement('div');
  label.textContent = name.length > 20 ? name.slice(0, 17) + '...' : name;
  label.classList.add('uploaded-label');

  media.appendChild(preview);
  media.appendChild(label);

  media.addEventListener('click', () => {
    console.log(`Clicked on ${name}`);
    if (isVideo) {
        queueVideo(name, url);
    }
    });
    const fileContainer = container.querySelector('.file-container');
    if (fileContainer) {
        fileContainer.appendChild(media);
    }
}


async function loadExistingUploads() {
    try {
        const res = await fetch('/uploads/files');
        const files = await res.json();

        files.forEach(f => {
            const ext = f.filename.split('.').pop().toLowerCase();
            const type = ext.match(/(mp4|webm|avi|mov)/) ? 'video' :
                         ext.match(/(mp3|wav|ogg)/) ? 'audio' :
                         ext.match(/(png|jpg|jpeg|gif|bmp|webp)/) ? 'image' : null;
            if (!type) return;

            const targetCard = document.querySelector(`.file-card[data-type="${type}"]`);
            if (targetCard) {
                displayInCard(targetCard, f.filename, f.path);
            }
        });
    } catch (err) {
        console.error('Failed to load files:', err);
    }
}

export function getVideoDuration(url, callback) {
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

export function generateVideoThumbnail(videoUrl, imgElement) {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto'; // more aggressive loading

    video.addEventListener('loadeddata', () => {
        // Seek to 1 second (or middle of video if shorter)
        video.currentTime = Math.min(1, video.duration / 2);
    });

    // Wait until the video has enough data for currentTime frame
    video.addEventListener('seeked', () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 80;
            canvas.height = 60;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            imgElement.src = canvas.toDataURL('image/jpeg');
        } catch (e) {
            console.error('Error drawing video frame:', e);
            imgElement.src = 'https://via.placeholder.com/40x40?text=VID';
        }
    });

    // Fallback in case of error
    video.addEventListener('error', () => {
        console.warn('Video error:', video.error);
        imgElement.src = 'https://via.placeholder.com/40x40?text=VID';
    });
}

async function deleteUploadedFile(ext, filename, blockElement) {
    try {
        const res = await fetch(`/uploads/${ext}/${filename}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (res.ok) {x``
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

