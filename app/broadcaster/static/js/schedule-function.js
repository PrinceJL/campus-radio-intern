import { updateModeButtons } from './playlist-manager.js';

let playlist = [];

document.addEventListener("DOMContentLoaded", function () {
    // Function to create a dropdown menu
    function createDropdown(button) {
        const dropdown = document.createElement("select");
        dropdown.className = "dropdown-menu";
        dropdown.style.display = "none"; // Initially hidden
        button.parentNode.insertBefore(dropdown, button.nextSibling); // Insert after the button
        return dropdown;
    }

    // Function to attach playlist logic to a button
    function attachPlaylistLogic(button) {
        let dropdown = button.nextElementSibling;
        
        // Create the dropdown if it doesn't exist
        if (!dropdown || !dropdown.classList.contains("dropdown-menu")) {
            dropdown = createDropdown(button);
        }

        button.addEventListener("click", function () {
            console.log("Playlist button clicked!");

            // Toggle dropdown visibility
            dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";

            // Populate the dropdown with times in 24-hour format if not already populated
            if (dropdown.childElementCount === 0) {
    const now = new Date();
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60;

    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 10) {
            const timeInSeconds = h * 3600 + m * 60;
            if (timeInSeconds <= currentSeconds) continue; // Skip past times

            const option = document.createElement("option");
            const timeLabel = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            option.value = timeInSeconds;
            option.textContent = timeLabel;
            dropdown.appendChild(option);
        }
    }

    if (dropdown.childElementCount === 0) {
        const opt = document.createElement("option");
        opt.disabled = true;
        opt.textContent = "No future time slots available";
        dropdown.appendChild(opt);
    }
}


            // Add change event listener to the dropdown
  dropdown.addEventListener("change", function () {
    console.log("Dropdown changed to: " + dropdown.value);
    const selectedTime = parseInt(dropdown.value, 10)
    console.log("scheduled time at" + selectedTime);
    document.getElementsByClassName("broadcast-status").textContent = "Ready to stream at " + selectedTime + " seconds.";
    const delay = selectedTime * 1000;
    if (delay <= 0) {
        console.log("Selected time is in the past or now. Timer not started.");
        return;
    }
    console.log(`Timer started. Will trigger in ${delay} seconds.`);
    // Start the timer
    setTimeout(() => {
        console.log("🎯 Timer is over! Scheduled time reached.");
        // You can call your broadcast/start logic here
        updateModeButtons();
        }, delay);  
                 });
        });
    }

    // Attach logic to existing buttons
    Array.from(document.getElementsByClassName("playlist-btn")).forEach((button) => {
        if (!button.dataset.initialized) { // Avoid duplicate listeners
            button.dataset.initialized = true;
            attachPlaylistLogic(button);
        }
    });

    // MutationObserver to handle dynamically added buttons
    const observer = new MutationObserver(function (mutationsList) {
        mutationsList.forEach((mutation) => {
            if (mutation.type === "childList") {
                mutation.addedNodes.forEach((node) => {
                    if (node.classList && node.classList.contains("playlist-btn")) {
                        if (!node.dataset.initialized) { // Avoid duplicate listeners
                            node.dataset.initialized = true;
                            attachPlaylistLogic(node);
                        }
                    }
                });
            }
        });
    });

    // Start observing the document for added nodes
    observer.observe(document.body, { childList: true, subtree: true });
});
