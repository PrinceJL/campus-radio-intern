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
                for (let h = 0; h < 24; h++) {
                    for (let m = 0; m < 60; m += 10) {
                        const option = document.createElement("option");
                        const timeLabel = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                        option.value = h * 3600 + m * 60; // Convert time to seconds
                        option.textContent = timeLabel;
                        dropdown.appendChild(option);
                    }
                }
            }

            // Add change event listener to the dropdown
            dropdown.addEventListener("change", function () {
                console.log("scheduled time at" + selectedTime);
                if (!currentStream) return alert("Nothing to stream.");
                    socket.emit('broadcaster');
                    statusDiv.textContent = "Broadcasting...";
                    startSessionTimer();
                    isStreaming = true;
                const selectedTime = parseInt(dropdown.value, 10);
                video.currentTime = selectedTime;
                
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
