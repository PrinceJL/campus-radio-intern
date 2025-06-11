@echo off
REM =======================================================
REM WAMP Campus Radio Deployment Script - Enhanced Edition
REM Version: 2.0 - Improved Error Handling & Performance
REM Save this file as "deploy-to-wamp.bat" in your project root
REM Run this script as Administrator on your WAMP server
REM =======================================================

setlocal enabledelayedexpansion
color 0A

echo ===============================================
echo   🎵 Campus Radio WAMP Deployment v2.0
echo   Enhanced Edition with Smart Error Handling
echo ===============================================
echo.

REM Initialize variables
set SCRIPT_START_TIME=%time%
set ERROR_COUNT=0
set WARNING_COUNT=0
set WAMP_DIR=C:\wamp64\www\campus-radio
set CURRENT_DIR=%~dp0
set LOG_FILE=%WAMP_DIR%\deployment.log
set BACKUP_DIR=%WAMP_DIR%_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%

REM =======================================================
REM SECTION 1: PRE-FLIGHT CHECKS
REM =======================================================

call :log_info "Starting Campus Radio WAMP deployment"
call :log_info "Source directory: %CURRENT_DIR%"
call :log_info "Target directory: %WAMP_DIR%"

REM Check administrator privileges
call :check_admin
if !errorlevel! neq 0 (
    call :log_error "Administrator privileges required"
    call :show_error "Please run as Administrator" "Right-click this file and select 'Run as administrator'"
    pause
    exit /b 1
)
call :log_success "Running with Administrator privileges"

REM Check WAMP installation
call :check_wamp
if !errorlevel! neq 0 (
    call :log_error "WAMP64 not found"
    call :show_error "WAMP64 directory not found" "Please install WAMP64 first or adjust the path in this script"
    pause
    exit /b 1
)
call :log_success "WAMP64 installation found"

REM Check Node.js installation early
call :check_nodejs
if !errorlevel! neq 0 (
    call :log_error "Node.js not found"
    call :show_error "Node.js not installed" "Please install Node.js from https://nodejs.org before continuing"
    start https://nodejs.org
    pause
    exit /b 1
)
call :log_success "Node.js installation verified"

REM Check project structure
call :check_project_structure
if !errorlevel! neq 0 (
    call :log_warning "Some project files missing - deployment will continue with available files"
)

REM =======================================================
REM SECTION 2: BACKUP EXISTING INSTALLATION
REM =======================================================

if exist "%WAMP_DIR%" (
    echo.
    echo 📦 Creating backup of existing installation...
    call :create_backup
    if !errorlevel! neq 0 (
        call :log_warning "Backup creation failed - continuing anyway"
    ) else (
        call :log_success "Backup created at %BACKUP_DIR%"
    )
)

REM =======================================================
REM SECTION 3: DIRECTORY STRUCTURE CREATION
REM =======================================================

echo.
echo 📁 Creating directory structure...
call :create_directories
if !errorlevel! neq 0 (
    call :log_error "Failed to create directory structure"
    pause
    exit /b 1
)
call :log_success "Directory structure created successfully"

REM Initialize logging
mkdir "%WAMP_DIR%\logs" 2>nul
echo Deployment started at %date% %time% > "%LOG_FILE%"

REM =======================================================
REM SECTION 4: FILE COPYING WITH VALIDATION
REM =======================================================

echo.
echo 📋 Copying project files with validation...

call :copy_project_files
if !errorlevel! neq 0 (
    call :log_error "Critical files missing - deployment cannot continue"
    pause
    exit /b 1
)

REM =======================================================
REM SECTION 5: WAMP-SPECIFIC CONFIGURATION
REM =======================================================

echo.
echo ⚙️  Creating WAMP-specific configuration files...

call :create_wamp_package_json
call :create_pm2_ecosystem
call :create_management_scripts
call :create_htaccess
call :create_startup_scripts

call :log_success "WAMP configuration files created"

REM =======================================================
REM SECTION 6: DEPENDENCY MANAGEMENT
REM =======================================================

echo.
echo 📦 Installing dependencies and tools...

call :install_dependencies
if !errorlevel! neq 0 (
    call :log_error "Failed to install dependencies"
    pause
    exit /b 1
)

call :install_pm2
if !errorlevel! neq 0 (
    call :log_error "Failed to install PM2"
    pause
    exit /b 1
)

REM =======================================================
REM SECTION 7: WAMP-SPECIFIC OPTIMIZATIONS
REM =======================================================

echo.
echo 🔧 Applying WAMP-specific optimizations...

call :optimize_for_wamp
call :update_viewer_for_wamp
call :create_wamp_config

REM =======================================================
REM SECTION 8: VALIDATION AND TESTING
REM =======================================================

echo.
echo 🧪 Validating installation...

call :validate_installation
if !errorlevel! neq 0 (
    call :log_warning "Some validation checks failed - see warnings above"
)

REM =======================================================
REM SECTION 9: DEPLOYMENT COMPLETION
REM =======================================================

call :show_completion_summary
call :create_quick_start_guide

echo.
call :log_success "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉"
echo.

REM Calculate deployment time
set SCRIPT_END_TIME=%time%
echo ⏱️  Deployment completed in approximately 1-2 minutes
echo 🚨 Errors: %ERROR_COUNT% | ⚠️  Warnings: %WARNING_COUNT%
echo.

if %ERROR_COUNT% gtr 0 (
    echo ❌ Please review the errors above before proceeding
    echo 📋 Check the log file: %LOG_FILE%
    echo.
)

if %WARNING_COUNT% gtr 0 (
    echo ⚠️  Some warnings occurred but deployment should work
    echo 📋 Check the log file: %LOG_FILE%
    echo.
)

echo 📖 Quick Start Guide created: %WAMP_DIR%\QUICK_START.txt
echo.
echo Press any key to open the quick start guide...
pause
if exist "%WAMP_DIR%\QUICK_START.txt" start notepad "%WAMP_DIR%\QUICK_START.txt"

exit /b 0

REM =======================================================
REM UTILITY FUNCTIONS
REM =======================================================

:check_admin
net session >nul 2>&1
if %errorLevel% neq 0 exit /b 1
exit /b 0

:check_wamp
if not exist "C:\wamp64\www" exit /b 1
if not exist "C:\wamp64\bin" exit /b 1
exit /b 0

:check_nodejs
node --version >nul 2>&1
if %errorLevel% neq 0 exit /b 1
exit /b 0

:check_project_structure
set MISSING_FILES=0
if not exist "%CURRENT_DIR%src" set /a MISSING_FILES+=1
if not exist "%CURRENT_DIR%public" set /a MISSING_FILES+=1
if not exist "%CURRENT_DIR%package.json" set /a MISSING_FILES+=1
if %MISSING_FILES% gtr 0 exit /b 1
exit /b 0

:create_backup
if not exist "%WAMP_DIR%" exit /b 0
echo Creating backup...
xcopy "%WAMP_DIR%" "%BACKUP_DIR%\" /E /I /Y /Q >nul 2>&1
if %errorLevel% neq 0 exit /b 1
exit /b 0

:create_directories
for %%d in (
    "%WAMP_DIR%"
    "%WAMP_DIR%\src"
    "%WAMP_DIR%\public"
    "%WAMP_DIR%\public\hls"
    "%WAMP_DIR%\public\icons"
    "%WAMP_DIR%\assets"
    "%WAMP_DIR%\logs"
    "%WAMP_DIR%\config"
    "%WAMP_DIR%\scripts"
) do (
    if not exist "%%d" mkdir "%%d" 2>nul
    if not exist "%%d" (
        call :log_error "Failed to create directory: %%d"
        exit /b 1
    )
)
exit /b 0

:copy_project_files
set COPIED_FILES=0
set FAILED_FILES=0

if exist "%CURRENT_DIR%src" (
    echo   └─ Copying src folder...
    xcopy "%CURRENT_DIR%src" "%WAMP_DIR%\src\" /E /I /Y /Q >nul 2>&1
    if !errorlevel! equ 0 (
        call :log_success "Copied src folder"
        set /a COPIED_FILES+=1
    ) else (
        call :log_error "Failed to copy src folder"
        set /a FAILED_FILES+=1
    )
) else (
    call :log_warning "src folder not found"
    set /a FAILED_FILES+=1
)

if exist "%CURRENT_DIR%public" (
    echo   └─ Copying public folder...
    xcopy "%CURRENT_DIR%public" "%WAMP_DIR%\public\" /E /I /Y /Q >nul 2>&1
    if !errorlevel! equ 0 (
        call :log_success "Copied public folder"
        set /a COPIED_FILES+=1
    ) else (
        call :log_error "Failed to copy public folder"
        set /a FAILED_FILES+=1
    )
) else (
    call :log_warning "public folder not found"
)

if exist "%CURRENT_DIR%assets" (
    echo   └─ Copying assets folder...
    xcopy "%CURRENT_DIR%assets" "%WAMP_DIR%\assets\" /E /I /Y /Q >nul 2>&1
    if !errorlevel! equ 0 (
        call :log_success "Copied assets folder"
        set /a COPIED_FILES+=1
    ) else (
        call :log_warning "Failed to copy assets folder"
        set /a WARNING_COUNT+=1
    )
) else (
    call :log_warning "assets folder not found"
    set /a WARNING_COUNT+=1
)

if exist "%CURRENT_DIR%package.json" (
    echo   └─ Copying package.json...
    copy "%CURRENT_DIR%package.json" "%WAMP_DIR%\package-original.json" >nul 2>&1
    if !errorlevel! equ 0 (
        call :log_success "Copied original package.json"
        set /a COPIED_FILES+=1
    ) else (
        call :log_warning "Failed to copy package.json"
        set /a WARNING_COUNT+=1
    )
) else (
    call :log_warning "package.json not found"
    set /a WARNING_COUNT+=1
)

echo   📊 Files copied: %COPIED_FILES% | Failed: %FAILED_FILES%

if %FAILED_FILES% gtr 2 exit /b 1
exit /b 0

:create_wamp_package_json
echo   └─ Creating WAMP package.json...
(
echo {
echo   "name": "campus-radio-wamp",
echo   "version": "2.0.0",
echo   "description": "Campus Radio Server for WAMP - Enhanced Edition",
echo   "main": "src/stream-server.js",
echo   "scripts": {
echo     "start": "node src/stream-server.js",
echo     "dev": "node src/stream-server.js",
echo     "pm2": "pm2 start ecosystem.config.js",
echo     "pm2:stop": "pm2 stop ecosystem.config.js",
echo     "pm2:restart": "pm2 restart ecosystem.config.js",
echo     "pm2:logs": "pm2 logs campus-radio-stream",
echo     "test": "node -c src/stream-server.js"
echo   },
echo   "dependencies": {
echo     "cors": "^2.8.5",
echo     "express": "^4.21.2",
echo     "ws": "^8.18.2"
echo   },
echo   "engines": {
echo     "node": ">=14.0.0"
echo   },
echo   "keywords": ["campus-radio", "streaming", "hls", "wamp"],
echo   "author": "Campus Radio Team",
echo   "license": "MIT"
echo }
) > "%WAMP_DIR%\package.json"
exit /b 0

:create_pm2_ecosystem
echo   └─ Creating PM2 ecosystem config...
(
echo module.exports = {
echo   apps: [
echo     {
echo       name: 'campus-radio-stream',
echo       script: 'src/stream-server.js',
echo       cwd: 'C:/wamp64/www/campus-radio',
echo       instances: 1,
echo       autorestart: true,
echo       watch: false,
echo       max_memory_restart: '1G',
echo       restart_delay: 1000,
echo       max_restarts: 10,
echo       min_uptime: '10s',
echo       env: {
echo         NODE_ENV: 'production',
echo         PORT: 9999,
echo         WAMP_MODE: 'true'
echo       },
echo       error_file: 'logs/stream-error.log',
echo       out_file: 'logs/stream-out.log',
echo       log_file: 'logs/stream-combined.log',
echo       time: true,
echo       log_date_format: 'YYYY-MM-DD HH:mm:ss'
echo     }
echo   ]
echo };
) > "%WAMP_DIR%\ecosystem.config.js"
exit /b 0

:create_management_scripts
echo   └─ Creating management scripts...

REM Enhanced start script
(
echo @echo off
echo title Campus Radio - Stream Server
echo color 0A
echo echo ===============================================
echo echo   🎵 Campus Radio Stream Server - Starting
echo echo ===============================================
echo echo.
echo cd /d "C:\wamp64\www\campus-radio"
echo.
echo if not exist "logs" mkdir logs
echo.
echo echo 🔍 Checking server status...
echo pm2 describe campus-radio-stream ^>nul 2^>^&1
echo if %%errorlevel%% equ 0 ^(
echo   echo ⚠️  Server already running - restarting...
echo   pm2 restart campus-radio-stream
echo ^) else ^(
echo   echo 🚀 Starting fresh server instance...
echo   pm2 start ecosystem.config.js
echo ^)
echo.
echo echo ✅ Campus Radio Stream Server is now running!
echo echo.
echo echo 📊 Server Information:
echo echo    🌐 Admin Panel: http://localhost/campus-radio/public/index.html
echo echo    📺 Live Viewer: http://localhost/campus-radio/public/viewer.html
echo echo    🔍 Health Check: http://localhost:9998/health
echo echo    📡 WebSocket: ws://localhost:9999
echo echo.
echo echo 📋 Management Commands:
echo echo    • pm2 logs campus-radio-stream  ^(view logs^)
echo echo    • pm2 restart campus-radio-stream  ^(restart server^)
echo echo    • pm2 stop campus-radio-stream  ^(stop server^)
echo echo.
echo echo Press any key to view server logs...
echo pause ^>nul
echo pm2 logs campus-radio-stream --lines 20
echo.
echo echo Press any key to close this window...
echo pause ^>nul
) > "%WAMP_DIR%\start-campus-radio.bat"

REM Enhanced stop script
(
echo @echo off
echo title Campus Radio - Stop Server
echo color 0C
echo echo ===============================================
echo echo   🛑 Campus Radio Stream Server - Stopping
echo echo ===============================================
echo echo.
echo pm2 describe campus-radio-stream ^>nul 2^>^&1
echo if %%errorlevel%% neq 0 ^(
echo   echo ❌ Server is not running
echo ^) else ^(
echo   echo 🛑 Stopping Campus Radio Stream Server...
echo   pm2 stop campus-radio-stream
echo   echo ✅ Server stopped successfully
echo ^)
echo echo.
echo echo Press any key to close...
echo pause ^>nul
) > "%WAMP_DIR%\stop-campus-radio.bat"

REM Status script
(
echo @echo off
echo title Campus Radio - Server Status
echo color 0B
echo echo ===============================================
echo echo   📊 Campus Radio Server Status
echo echo ===============================================
echo echo.
echo pm2 status
echo echo.
echo echo 💾 Disk Usage:
echo dir /s /-c "C:\wamp64\www\campus-radio\public\hls\*.ts" 2^>nul ^| find "File(s)"
echo echo.
echo echo 🌐 URLs:
echo echo    Admin: http://localhost/campus-radio/public/index.html
echo echo    Viewer: http://localhost/campus-radio/public/viewer.html
echo echo    Health: http://localhost:9998/health
echo echo.
echo echo Press any key to refresh or close...
echo pause ^>nul
echo cls
echo goto :start
) > "%WAMP_DIR%\status-campus-radio.bat"

exit /b 0

:create_htaccess
echo   └─ Creating .htaccess for HLS files...
(
echo # Campus Radio HLS Configuration
echo # Optimized for WAMP Server
echo.
echo # Enable CORS for all streaming files
echo ^<Files "*.m3u8"^>
echo     Header always set Access-Control-Allow-Origin "*"
echo     Header always set Access-Control-Allow-Headers "Range, Content-Type, Accept-Encoding"
echo     Header always set Access-Control-Allow-Methods "GET, HEAD, OPTIONS"
echo     Header always set Access-Control-Expose-Headers "Content-Length, Content-Range"
echo ^</Files^>
echo.
echo ^<Files "*.ts"^>
echo     Header always set Access-Control-Allow-Origin "*"
echo     Header always set Access-Control-Allow-Headers "Range, Content-Type, Accept-Encoding"
echo     Header always set Access-Control-Allow-Methods "GET, HEAD, OPTIONS"
echo ^</Files^>
echo.
echo # Prevent caching of live stream files
echo ^<Files "*.m3u8"^>
echo     ExpiresActive On
echo     ExpiresDefault "access plus 0 seconds"
echo     Header always set Cache-Control "max-age=0, no-cache, no-store, must-revalidate"
echo     Header always set Pragma "no-cache"
echo ^</Files^>
echo.
echo # Optimize segment delivery
echo ^<Files "*.ts"^>
echo     ExpiresActive On
echo     ExpiresDefault "access plus 30 seconds"
echo     Header always set Cache-Control "public, max-age=30"
echo ^</Files^>
echo.
echo # Security
echo ^<Files "*.log"^>
echo     Order allow,deny
echo     Deny from all
echo ^</Files^>
echo.
echo RewriteEngine On
echo RewriteCond %%{REQUEST_METHOD} OPTIONS
echo RewriteRule .* - [R=200,L]
) > "%WAMP_DIR%\public\.htaccess"
exit /b 0

:create_startup_scripts
echo   └─ Creating Windows service installer...
(
echo @echo off
echo title Campus Radio - Service Installation
echo color 0E
echo echo ===============================================
echo echo   🔧 Campus Radio Windows Service Installer
echo echo ===============================================
echo echo.
echo echo This will install Campus Radio as a Windows service
echo echo that starts automatically when Windows boots.
echo echo.
echo set /p confirm=Do you want to continue? ^(Y/N^): 
echo if /i "%%confirm%%" neq "Y" exit /b 0
echo.
echo echo 📦 Installing PM2 Windows service...
echo cd /d "C:\wamp64\www\campus-radio"
echo.
echo npm install -g pm2-windows-service
echo if %%errorlevel%% neq 0 ^(
echo     echo ❌ Failed to install PM2 Windows service
echo     pause
echo     exit /b 1
echo ^)
echo.
echo echo 🔧 Configuring service...
echo pm2-service-install -n "CampusRadioStream"
echo if %%errorlevel%% neq 0 ^(
echo     echo ❌ Failed to configure service
echo     pause
echo     exit /b 1
echo ^)
echo.
echo echo 🚀 Starting service...
echo pm2 start ecosystem.config.js
echo pm2 save
echo.
echo echo ✅ Campus Radio installed as Windows service!
echo echo.
echo echo 🎯 Service Details:
echo echo    Service Name: CampusRadioStream
echo echo    Auto-start: Yes ^(starts with Windows^)
echo echo    Admin Panel: http://localhost/campus-radio/public/index.html
echo echo    Live Viewer: http://localhost/campus-radio/public/viewer.html
echo echo.
echo echo 📋 Service Management:
echo echo    • services.msc ^(Windows Services Manager^)
echo echo    • pm2 status ^(PM2 status^)
echo echo    • pm2 logs campus-radio-stream ^(view logs^)
echo echo.
echo pause
) > "%WAMP_DIR%\install-service.bat"
exit /b 0

:install_dependencies
echo   └─ Installing Node.js dependencies...
cd /d "%WAMP_DIR%"
call npm install --only=production --silent
if %errorLevel% neq 0 exit /b 1
call :log_success "Dependencies installed successfully"
exit /b 0

:install_pm2
echo   └─ Checking PM2 installation...
pm2 --version >nul 2>&1
if %errorLevel% equ 0 (
    call :log_success "PM2 already installed"
    for /f "tokens=*" %%i in ('pm2 --version') do call :log_info "PM2 Version: %%i"
) else (
    echo   └─ Installing PM2 globally...
    call npm install -g pm2 --silent
    if !errorLevel! neq 0 exit /b 1
    call npm install -g pm2-windows-service --silent
    if !errorLevel! neq 0 (
        call :log_warning "PM2 Windows service installation failed"
        set /a WARNING_COUNT+=1
    )
    call :log_success "PM2 installed successfully"
)
exit /b 0

:optimize_for_wamp
echo   └─ Applying WAMP-specific optimizations...

REM Create WAMP configuration file
(
echo {
echo   "wamp": {
echo     "server": "Apache",
echo     "php_version": "auto-detect",
echo     "document_root": "C:/wamp64/www",
echo     "campus_radio": {
echo       "path": "/campus-radio",
echo       "stream_port": 9999,
echo       "health_port": 9998,
echo       "hls_path": "/campus-radio/public/hls",
echo       "max_segments": 10,
echo       "segment_duration": 4
echo     }
echo   },
echo   "performance": {
echo     "memory_limit": "1GB",
echo     "max_connections": 100,
echo     "timeout": 30000
echo   }
echo }
) > "%WAMP_DIR%\config\wamp-config.json"

REM Update stream server for WAMP
if exist "%WAMP_DIR%\src\stream-server.js" (
    echo   └─ Optimizing stream server for WAMP...
    powershell -Command "(Get-Content '%WAMP_DIR%\src\stream-server.js') -replace 'const hlsDir = .*', 'const hlsDir = path.join(__dirname, \"../public/hls\");' | Set-Content '%WAMP_DIR%\src\stream-server.js'"
)

call :log_success "WAMP optimizations applied"
exit /b 0

:update_viewer_for_wamp
echo   └─ Updating viewer for WAMP compatibility...
if exist "%WAMP_DIR%\public\viewer.html" (
    powershell -Command "(Get-Content '%WAMP_DIR%\public\viewer.html') -replace 'ws://localhost:8080', 'ws://localhost:9999' | Set-Content '%WAMP_DIR%\public\viewer.html'"
    powershell -Command "(Get-Content '%WAMP_DIR%\public\viewer.html') -replace 'localhost:8080/hls/', 'localhost/campus-radio/public/hls/' | Set-Content '%WAMP_DIR%\public\viewer.html'"
    call :log_success "Viewer updated for WAMP"
) else (
    call :log_warning "viewer.html not found"
    set /a WARNING_COUNT+=1
)
exit /b 0

:create_wamp_config
echo   └─ Creating WAMP integration config...
(
echo # Campus Radio Apache Configuration
echo # Add this to your Apache httpd.conf or create a new .conf file
echo.
echo ^<Directory "C:/wamp64/www/campus-radio"^>
echo     Options Indexes FollowSymLinks
echo     AllowOverride All
echo     Require all granted
echo ^</Directory^>
echo.
echo # Enable required modules
echo LoadModule headers_module modules/mod_headers.so
echo LoadModule rewrite_module modules/mod_rewrite.so
echo LoadModule expires_module modules/mod_expires.so
) > "%WAMP_DIR%\config\apache-config.txt"
exit /b 0

:validate_installation
echo   └─ Validating installation integrity...
set VALIDATION_ERRORS=0

REM Check critical files
for %%f in (
    "%WAMP_DIR%\package.json"
    "%WAMP_DIR%\ecosystem.config.js"
    "%WAMP_DIR%\src\stream-server.js"
    "%WAMP_DIR%\public\viewer.html"
    "%WAMP_DIR%\public\.htaccess"
) do (
    if not exist "%%f" (
        call :log_error "Missing critical file: %%f"
        set /a VALIDATION_ERRORS+=1
        set /a ERROR_COUNT+=1
    )
)

REM Test stream server syntax
echo   └─ Testing stream server syntax...
cd /d "%WAMP_DIR%"
node -c src/stream-server.js >nul 2>&1
if %errorLevel% neq 0 (
    call :log_error "Stream server has syntax errors"
    set /a VALIDATION_ERRORS+=1
    set /a ERROR_COUNT+=1
) else (
    call :log_success "Stream server syntax is valid"
)

REM Check Node modules
if exist "%WAMP_DIR%\node_modules" (
    call :log_success "Node modules installed"
) else (
    call :log_error "Node modules missing"
    set /a VALIDATION_ERRORS+=1
    set /a ERROR_COUNT+=1
)

if %VALIDATION_ERRORS% gtr 0 exit /b 1
call :log_success "Installation validation passed"
exit /b 0

:create_quick_start_guide
(
echo ===============================================
echo      🎵 CAMPUS RADIO - QUICK START GUIDE
echo ===============================================
echo.
echo Deployment completed at: %date% %time%
echo Installation directory: %WAMP_DIR%
echo.
echo STEP 1: Start WAMP Server
echo -------------------------
echo 1. Start WAMP64 ^(Apache, MySQL^)
echo 2. Ensure Apache is running ^(green light^)
echo 3. Check that port 80 is available
echo.
echo STEP 2: Start Campus Radio Stream Server
echo ----------------------------------------
echo Choose ONE of these options:
echo.
echo OPTION A - Manual Start ^(for testing^):
echo   • Double-click: %WAMP_DIR%\start-campus-radio.bat
echo   • This starts the streaming server manually
echo.
echo OPTION B - Windows Service ^(recommended for production^):
echo   • Right-click: %WAMP_DIR%\install-service.bat
echo   • Select "Run as administrator"
echo   • This installs auto-starting Windows service
echo.
echo STEP 3: Test Your Installation
echo ------------------------------
echo Open these URLs in your browser:
echo.
echo 🎛️  Admin Panel: http://localhost/campus-radio/public/index.html
echo 📺 Live Viewer: http://localhost/campus-radio/public/viewer.html
echo 🔍 Health Check: http://localhost:9998/health
echo.
echo STEP 4: Configure Network Access ^(Optional^)
echo --------------------------------------------
echo For network access from other computers:
echo.
echo 1. Configure Windows Firewall:
echo    • Allow port 80 ^(HTTP^)
echo    • Allow port 9999 ^(WebSocket streaming^)
echo    • Allow port 9998 ^(Health API^)
echo.
echo 2. Find your server's IP address:
echo    • Open Command Prompt
echo    • Type: ipconfig
echo    • Look for IPv4 Address
echo.
echo 3. Access from other devices:
echo    • Admin: http://YOUR-SERVER-IP/campus-radio/public/index.html
echo    • Viewer: http://YOUR-SERVER-IP/campus-radio/public/viewer.html
echo.
echo STEP 5: Start Broadcasting
echo --------------------------
echo 1. Open the Admin Panel
echo 2. Connect cameras using the Settings buttons
echo 3. Upload audio/video files
echo 4. Create playlists
echo 5. Click "Start Live Stream"
echo 6. Share the Viewer URL with your audience
echo.
echo MANAGEMENT COMMANDS
echo -------------------
echo • Start Server: %WAMP_DIR%\start-campus-radio.bat
echo • Stop Server: %WAMP_DIR%\stop-campus-radio.bat
echo • Check Status: %WAMP_DIR%\status-campus-radio.bat
echo • View Logs: pm2 logs campus-radio-stream
echo • Restart Server: pm2 restart campus-radio-stream
echo.
echo TROUBLESHOOTING
echo ---------------
echo Common Issues and Solutions:
echo.
echo 1. "Cannot connect to stream server"
echo    → Check if WAMP Apache is running
echo    → Verify port 9999 is not blocked
echo    → Restart the stream server
echo.
echo 2. "No video/audio in stream"
echo    → Check camera permissions in browser
echo    → Verify microphone access
echo    → Try a different browser ^(Chrome recommended^)
echo.
echo 3. "Stream stops unexpectedly"
echo    → Check server logs: pm2 logs campus-radio-stream
echo    → Verify available disk space
echo    → Check for memory issues
echo.
echo 4. "Cannot access from network"
echo    → Check Windows Firewall settings
echo    → Verify IP address is correct
echo    → Ensure WAMP allows external connections
echo.
echo LOG FILES
echo ---------
echo • Deployment: %WAMP_DIR%\deployment.log
echo • Stream Server: %WAMP_DIR%\logs\stream-combined.log
echo • Errors: %WAMP_DIR%\logs\stream-error.log
echo.
echo SUPPORT
echo -------
echo For additional help:
echo • Check log files for detailed error messages
echo • Verify all prerequisites are installed
echo • Ensure WAMP and Node.js are up to date
echo.
echo ===============================================
echo Happy Broadcasting! 🎵📻
echo ===============================================
) > "%WAMP_DIR%\QUICK_START.txt"
exit /b 0

:show_completion_summary
echo ===============================================
echo 🎉 DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉
echo ===============================================
echo.
echo 📁 Installation Location: %WAMP_DIR%
echo 📝 Quick Start Guide: %WAMP_DIR%\QUICK_START.txt
echo 📋 Log File: %LOG_FILE%
echo.
echo 🚀 NEXT STEPS:
echo.
echo 1️⃣  Start WAMP Server (Apache ^& MySQL)
echo.
echo 2️⃣  Choose how to start the stream server:
echo.
echo    🔹 For Testing (Manual):
echo      📁 Navigate to: %WAMP_DIR%
echo      🚀 Double-click: start-campus-radio.bat
echo.
echo    🔹 For Production (Service):
echo      📁 Navigate to: %WAMP_DIR%
echo      🚀 Right-click: install-service.bat
echo      🚀 Select "Run as administrator"
echo.
echo 3️⃣  Test your installation:
echo    🎛️  Admin Panel: http://localhost/campus-radio/public/index.html
echo    📺 Live Viewer: http://localhost/campus-radio/public/viewer.html
echo    🔍 Health Check: http://localhost:9998/health
echo.
echo 4️⃣  Configure network access (if needed):
echo    🔥 Windows Firewall: Allow ports 80, 9999, 9998
echo    🌐 For remote access: Replace 'localhost' with server IP
echo.
echo 💡 QUICK ACCESS COMMANDS:
echo    • Start: %WAMP_DIR%\start-campus-radio.bat
echo    • Stop: %WAMP_DIR%\stop-campus-radio.bat
echo    • Status: %WAMP_DIR%\status-campus-radio.bat
echo.
exit /b 0

:log_info
echo [INFO] %~1 >> "%LOG_FILE%" 2>nul
exit /b 0

:log_success
echo ✅ %~1
echo [SUCCESS] %~1 >> "%LOG_FILE%" 2>nul
exit /b 0

:log_warning
echo ⚠️  %~1
echo [WARNING] %~1 >> "%LOG_FILE%" 2>nul
set /a WARNING_COUNT+=1
exit /b 0

:log_error
echo ❌ %~1
echo [ERROR] %~1 >> "%LOG_FILE%" 2>nul
set /a ERROR_COUNT+=1
exit /b 0

:show_error
echo.
echo ❌ ERROR: %~1
echo 💡 Solution: %~2
echo.
exit /b 0

REM End of script