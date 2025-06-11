Campus Radio
A professional campus radio streaming application built with Electron, Caddy web server, WebSocket→FFmpeg bridge, and HLS viewer. This application allows you to stream live content (camera feeds, videos, and audio) to viewers through any web browser, both locally and over the network.
Features

🎥 Live Camera Streaming - Real-time camera feeds with preview
🎵 Media Playback - Support for MP3 and MP4 files with crossfade
📋 Playlist Management - Drag-and-drop playlist creation
🌐 Network Streaming - Viewers can connect from any device on the network
🔧 Easy Deployment - One-click Ubuntu server deployment
📊 Professional Interface - Clean, intuitive streaming controls

Prerequisites

Node.js (v14 or higher)
FFmpeg (automatically configured)
Modern web browser (for viewers)

🚀 Quick Start (Development)

Clone and install:

bashgit clone [repository-url]
cd electron-campus-radio
npm install

Start development environment:

bash# One command starts everything:
npm run dev
This automatically starts:

✅ Caddy web server (port 8080)
✅ WebSocket stream server (port 9999)
✅ Electron broadcaster application


Start streaming:


Electron app opens automatically for broadcasting
Viewers go to: http://localhost:8080/viewer.html

Alternative Development Commands
bash# Individual components:
npm run start:caddy    # Web server only
npm run start:stream   # Stream server only
npm start              # Electron app only

# Or use VSCode tasks (Ctrl+Shift+P → Tasks: Run Task)
📺 Usage
For Broadcasters (Streamer App)

Launch the broadcaster: npm start or use the Electron app
Set up your stream:

📹 Select camera from dropdown
🎵 Upload media files (drag & drop)
📋 Create playlists by dragging files
🎛️ Use crossfade controls for smooth transitions


Go live:

Click "Start Live Stream"
Your stream is now available to viewers



For Viewers (Web Browser)

Local viewers: Navigate to http://localhost:8080/viewer.html
Network viewers:

Open http://localhost:8080/viewer.html
Enter the broadcaster's IP address
Click "Connect"


Controls:

▶️ Play/pause stream
🔊 Volume control
🖥️ Fullscreen mode



🐧 Ubuntu Server Deployment
For production deployment on Ubuntu servers:
One-Time Setup

Prepare deployment package:

bash# Copy server files to deployment folder
mkdir campus-radio-deployment
# (Copy files as shown in deployment guide)

Deploy to Ubuntu server:

bash# On Ubuntu server:
chmod +x *.sh
./install.sh
Server Management
bash# Start servers
./start-servers.sh

# Check status  
./status.sh

# View logs
./logs.sh

# Restart servers
./restart-servers.sh

# Stop servers
./stop-servers.sh
🏗️ Architecture
┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐
│   Broadcaster   │    │   Server         │    │    Viewers     │
│   (Electron)    ├───►│   (Ubuntu)       ├───►│  (Web Browser) │
│                 │    │                  │    │                │
│ • Camera feeds  │    │ • Caddy server   │    │ • HLS playback │
│ • Media files   │    │ • Stream server  │    │ • Any device   │
│ • Playlist mgmt │    │ • FFmpeg bridge  │    │ • Network access│
└─────────────────┘    └──────────────────┘    └────────────────┘
📁 Project Structure
electron-campus-radio/
├── 🐧 Ubuntu Server Scripts  
│   ├── install.sh              # One-click Ubuntu installation
│   ├── start-servers.sh        # Start production servers
│   ├── stop-servers.sh         # Stop servers
│   ├── restart-servers.sh      # Restart servers
│   ├── status.sh               # Check server status
│   └── logs.sh                 # View server logs
├── ⚙️ Configuration
│   ├── Caddyfile              # Web server configuration
│   ├── ecosystem.config.js     # PM2 process management
│   └── package.json           # Dependencies & scripts
├── 🎨 Development Setup
│   └── .vscode/               # VSCode tasks & debugging
├── 📁 Source Code
│   ├── src/main.js            # Electron main process
│   ├── src/stream-server.js   # WebSocket stream server
│   ├── src/config.js          # FFmpeg configuration
│   └── src/preload.js         # Electron preload
└── 📁 Web Interface
    ├── public/viewer.html     # Viewer web page
    ├── public/index.html      # Broadcaster interface
    ├── public/rendered.js     # Application logic
    └── public/style.css       # Interface styling
🔧 Troubleshooting
Common Issues
Stream not starting:

Check if all servers are running: npm run dev
Verify FFmpeg is installed and accessible
Check console for WebSocket connection errors

Viewers can't connect:

Ensure Caddy server is running on port 8080
Check firewall settings (ports 8080, 9999)
Verify network connectivity between devices

Camera not working:

Grant camera permissions in your browser/OS
Ensure camera isn't being used by another application
Try selecting a different camera in the dropdown

Audio/video sync issues:

Check FFmpeg configuration in src/config.js
Verify media file formats are supported
Try restarting the stream server

Getting Help

Check logs: Use ./logs.sh on Ubuntu or check browser console
Verify status: Run ./status.sh to check all services
Restart services: Use ./restart-servers.sh if issues persist

🤝 Development
Key Files

Main application: src/main.js
Stream server: src/stream-server.js
Web server config: Caddyfile
Viewer interface: public/viewer.html
Broadcasting logic: public/rendered.js

Contributing

Fork the repository
Create a feature branch
Test thoroughly with npm run dev
Submit a pull request

📜 License
This project is part of the SLU Internship Program.
👥 Contributors

Development Team: SLU Internship Project
Institution: Saint Louis University
Project Type: Campus Radio Broadcasting System


🎯 Quick Reference
Development: npm run dev → http://localhost:8080/viewer.html
Production: ./install.sh → http://server-ip:8080/viewer.html
Management: Use the .sh scripts for server control
Support: Check logs and status using provided monitoring scripts


______________________________________________________________________________________
🔧 Step 1: Configure WAMP for Network Access
Option A: Quick Fix (Temporary)

Click the WAMP icon in your system tray (green/orange/red icon)
Left-click on the WAMP icon → Apache → httpd.conf
Find this line (around line 60):
apacheListen 80

Add this line below it:
apacheListen 192.168.100.61:80

Find this section (around line 200):
apache<Directory "C:/wamp64/www/">
    Options +Indexes +FollowSymLinks +MultiViews
    AllowOverride All
    Require local
</Directory>

Change Require local to:
apacheRequire all granted

Save the file and restart WAMP

Option B: Better Fix (Permanent)

Click WAMP icon → Apache → Alias directories → Add an Alias
Create alias: campus-radio pointing to your project folder
Click WAMP icon → Apache → httpd-vhosts.conf
Add this virtual host:
apache<VirtualHost *:80>
    DocumentRoot "C:/wamp64/www/campus-radio"
    ServerName campus-radio.local
    ServerAlias 192.168.100.61
    <Directory "C:/wamp64/www/campus-radio">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>


🔥 Step 2: Configure Windows Firewall

Open Windows Defender Firewall
Click "Allow an app or feature through Windows Defender Firewall"
Click "Change Settings" → "Allow another app..."
Browse and add:

C:\wamp64\bin\apache\apache2.4.x\bin\httpd.exe
C:\wamp64\bin\apache\apache2.4.x\bin\apache.exe


Check both "Private" and "Public" boxes
Click OK

OR create a specific rule:

Windows Firewall → Advanced Settings → Inbound Rules → New Rule
Port → Next
TCP → Specific Local Ports: 80,9999 → Next
Allow the connection → Next
Check all profiles → Next
Name: "Campus Radio Server" → Finish



1. Update WAMP Configuration (Most Important)
Open WAMP Apache config:

Click WAMP tray icon → Apache → httpd.conf
Find line ~60: Listen 80
Add below it: Listen 0.0.0.0:80
Find line ~200: Require local
Change to: Require all granted
Save and restart WAMP

Press Win+R → type firewall.cpl → Enter
"Allow an app through firewall" → "Allow another app"
Browse to: C:\wamp64\bin\apache\apache2.4.x\bin\httpd.exe
Check both Private and Public → OK

4. Test Network Access

On your PC, open: http://192.168.100.61/campus-radio/public/viewer.html
Check browser console for any errors
Verify ports are open:

Port 80 (web server)
Port 9999 (stream server)



5. Update viewer.html
Replace your public/viewer.html with the updated version from the artifact above (it now has better network support and mobile optimizations).
6. Restart Everything

Stop WAMP completely
Stop your Node.js stream server
Start WAMP
Start stream server: node src/stream-server.js
Test on phone: http://192.168.100.61/campus-radio/public/viewer.html


The "Forbidden" error means Apache is blocking network access. You need to fix the Apache configuration:
🔧 Fix Apache Permissions
Step 1: Edit Main Apache Config

Click WAMP icon → Apache → httpd.conf
Find this section (around line 200-250):
apache<Directory "C:/wamp64/www">
    Options +Indexes +Includes +FollowSymLinks +MultiViews
    AllowOverride All
    Require local
</Directory>

Change Require local to:
apache<Directory "C:/wamp64/www">
    Options +Indexes +Includes +FollowSymLinks +MultiViews
    AllowOverride All
    Require all granted
</Directory>


Step 2: Fix Virtual Host (Update Your Existing One)
In your httpd-vhosts.conf, update the first virtual host too:
apache<VirtualHost *:80>
  ServerName localhost
  ServerAlias localhost
  DocumentRoot "${INSTALL_DIR}/www"
  <Directory "${INSTALL_DIR}/www/">
    Options +Indexes +Includes +FollowSymLinks +MultiViews
    AllowOverride All
    Require all granted
  </Directory>
</VirtualHost>

<VirtualHost *:80>
    DocumentRoot "C:/wamp64/www/campus-radio"
    ServerName campus-radio.local
    ServerAlias 192.168.100.61
    <Directory "C:/wamp64/www/campus-radio">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
Step 3: Restart Apache

Click WAMP icon → Apache → Service → Restart Service
OR click WAMP icon and click Restart All Services

Step 4: Test

Try: http://192.168.100.61/ (should show WAMP homepage)
Then: http://192.168.100.61/campus-radio/public/viewer.html

The key change is: Require local → Require all granted in both the main directory and virtual host configurations.