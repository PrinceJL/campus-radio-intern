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