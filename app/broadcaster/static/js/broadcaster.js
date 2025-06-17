let selectedSceneId = null;

// Load scenes from backend and render them
async function loadScenes() {
    const response = await fetch('/scenes');
    const scenes = await response.json();
    const list = document.getElementById('scenes-list');
    list.innerHTML = '';
    scenes.forEach((scene, idx) => {
        const li = document.createElement('li');
        li.className = 'scene-item';
        li.textContent = scene.name;
        li.dataset.sceneId = scene._id;

        // Highlight if selected
        if (scene._id === selectedSceneId || (selectedSceneId === null && idx === 0)) {
            li.classList.add('active');
            selectedSceneId = scene._id;
        }

        // Click to select
        li.onclick = function() {
            selectedSceneId = scene._id;
            document.querySelectorAll('#scenes-list .scene-item').forEach(item => item.classList.remove('active'));
            li.classList.add('active');
        };

        list.appendChild(li);
    });
}

// Load uploaded files and show thumbnails for MP4
async function loadUploadedFiles() {
    const res = await fetch('/uploads/files');
    const files = await res.json();
    const uploadedFilesList = document.getElementById('uploadedFilesList');
    uploadedFilesList.innerHTML = '';

    files.forEach(file => {
        const ext = file.filename.split('.').pop().toLowerCase();

        // Create container div for grid layout
        const fileDiv = document.createElement('div');
        fileDiv.className = 'upload-thumb-container';

        // Thumbnail (video or audio icon)
        let thumb;
        if (ext === 'mp4') {
            thumb = document.createElement('video');
            thumb.src = file.path;
            thumb.preload = 'metadata';
            thumb.muted = true;
            thumb.style.width = '100%';
            thumb.style.height = '100px';
            thumb.style.objectFit = 'cover';
            thumb.controls = false;
            thumb.currentTime = 1;

            // Make thumbnail clickable
            const link = document.createElement('a');
            link.href = file.path;
            link.target = '_blank';
            link.appendChild(thumb);
            fileDiv.appendChild(link);
        } else if (ext === 'mp3') {
            thumb = document.createElement('img');
            thumb.src = '/favicon.ico'; // Use favicon as audio icon
            thumb.alt = 'Audio';
            thumb.style.width = '100%';
            thumb.style.height = '100px';
            thumb.style.objectFit = 'contain';

            // Make icon clickable
            const link = document.createElement('a');
            link.href = file.path;
            link.target = '_blank';
            link.appendChild(thumb);
            fileDiv.appendChild(link);
        }

        // Label below thumbnail
        const label = document.createElement('div');
        label.className = 'upload-thumb-label';
        label.textContent = file.filename;
        fileDiv.appendChild(label);

        // Delete button to the right
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.className = 'upload-thumb-delete';
        delBtn.onclick = () => deleteUploadedFile(ext, file.filename);
        fileDiv.appendChild(delBtn);

        uploadedFilesList.appendChild(fileDiv);
    });
}

// Show modal for adding a scene
function showAddSceneModal() {
    document.getElementById('addSceneModal').classList.add('active');
    document.getElementById('sceneName').value = '';
    document.getElementById('sceneDesc').value = '';
}

// Hide modal
function hideAddSceneModal() {
    document.getElementById('addSceneModal').classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
    // Add Scene button
    const addBtn = document.querySelector('.panel-actions button[title="Add Scene"]');
    if (addBtn) addBtn.onclick = showAddSceneModal;

    // Delete Scene button
    const delBtn = document.querySelector('.panel-actions button[title="Delete Scene"]');
    if (delBtn) {
        delBtn.onclick = async function() {
            if (!selectedSceneId) {
                alert('Please select a scene to delete.');
                return;
            }
            if (confirm('Delete selected scene?')) {
                await fetch(`/scenes/${selectedSceneId}`, { method: 'DELETE' });
                selectedSceneId = null;
                loadScenes();
            }
        };
    }

    // Modal logic
    const cancelBtn = document.getElementById('cancelAddScene');
    if (cancelBtn) cancelBtn.onclick = hideAddSceneModal;

    const addSceneForm = document.getElementById('addSceneForm');
    if (addSceneForm) {
        addSceneForm.onsubmit = async function(e) {
            e.preventDefault();
            const name = document.getElementById('sceneName').value;
            const description = document.getElementById('sceneDesc').value;
            await fetch('/scenes', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({name, description})
            });
            hideAddSceneModal();
            loadScenes();
        };
    }

    // Upload form logic
    const uploadForm = document.getElementById('uploadForm');
    const uploadMessage = document.getElementById('uploadMessage');
    if (uploadForm) {
        uploadForm.onsubmit = async function(e) {
            e.preventDefault();
            const fileInput = document.getElementById('mediaFile');
            if (!fileInput.files.length) return;
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            const res = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            uploadMessage.textContent = data.message || data.error;
            loadUploadedFiles();
        };
    }

    loadScenes();
    loadUploadedFiles();
});

// Delete uploaded file (must be global for inline onclick)
window.deleteUploadedFile = async function(ext, filename) {
    if (!confirm(`Delete ${filename}?`)) return;
    const res = await fetch(`/uploads/${ext}/${filename}`, { method: 'DELETE' });
    const data = await res.json();
    alert(data.message || data.error);
    loadUploadedFiles();
};