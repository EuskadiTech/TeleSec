# TeleSec - Secure Distributed Communication Application

TeleSec is a Spanish Progressive Web Application (PWA) built with vanilla JavaScript, HTML, and CSS that provides secure group communication using GunDB for distributed peer-to-peer networking. The application allows users to join encrypted communication groups using group codes and secret keys.

**ALWAYS reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Build and Deploy Process
- **Build the application (FASTEST BUILD EVER - 0.036 seconds):**
  - `cd /home/runner/work/TeleSec/TeleSec`
  - `python3 build.py`
  - **NEVER CANCEL**: Build completes in under 0.1 seconds. No timeout needed.
  - The build script copies files from `assets/` to `dist/` and processes template variables in `src/` files.

### Serving the Application
- **Python HTTP Server (Recommended for development):**
  - `cd /home/runner/work/TeleSec/TeleSec/dist`
  - `python3 -m http.server 8000`
  - Access at: `http://localhost:8000`
  
- **Node.js HTTP Server (Alternative with CORS support):**
  - `cd /home/runner/work/TeleSec/TeleSec/dist`
  - `npx http-server . --port 8001 --cors`
  - **NEVER CANCEL**: First run takes ~14 seconds to download http-server package. Set timeout to 30+ seconds.
  - Access at: `http://localhost:8001`

### Development Environment Requirements
- **Python 3.x** (for build script) - Version 3.12.3+ confirmed working
- **Node.js and npm** (optional, for alternative serving) - Version 20.19.4+ confirmed working
- **Web browser** (for testing the PWA functionality)

## Validation and Testing

### Mandatory Validation Steps
1. **Build Validation:**
   - Run `python3 build.py` and verify it completes in under 1 second
   - Verify `dist/` directory is created with all assets and processed files
   - Check that template variables (%%PREFETCH%%, %%VERSIONCO%%, %%ASSETSJSON%%) are replaced

2. **Application Functionality Test:**
   - Start web server: `python3 -m http.server 8000` in `dist/` directory
   - Navigate to `http://localhost:8000` in browser
   - **CRITICAL LOGIN TEST:** Enter any group code (e.g., "TEST") and secret key (e.g., "SECRET123")
   - Click "Iniciar sesión" button
   - **VERIFY NETWORK CONNECTIVITY:** Confirm the header shows connected nodes (e.g., "TeleSec - TEST - (8 nodos)")
   - **SUCCESS INDICATORS:** 
     - Application loads without errors
     - Login form accepts credentials
     - Distributed network connects (node count > 0)
     - No JavaScript console errors except expected WebSocket connection failures

3. **PWA Features Test:**
   - Verify Service Worker registration in browser console
   - Check manifest.json loads correctly
   - Confirm offline caching functionality

### Error Handling Validation
- **Build Script Errors:** Python syntax errors will cause build to fail with clear error messages
- **Network Connectivity:** Some WebSocket connections to gun-manhattan.herokuapp.com may fail - this is expected
- **Browser Compatibility:** Application works in modern browsers supporting Service Workers

## Repository Structure

### Key Files and Directories
```
/home/runner/work/TeleSec/TeleSec/
├── build.py                    # Main build script - processes template variables
├── index.html                  # Build error fallback (should never be served)
├── README.md                   # Basic repository information (minimal)
├── LICENSE                     # Project license
├── CNAME                       # GitHub Pages configuration
├── .gitignore                  # Excludes dist/, radata/, node_modules/
├── src/                        # Source files with template variables
│   ├── index.html             # Main application HTML with %%PREFETCH%% variables
│   ├── app_logic.js           # Core application logic and authentication
│   ├── app_modules.js         # Application modules and utilities
│   ├── config.js              # Configuration and relay servers
│   ├── gun_init.js            # GunDB initialization
│   ├── pwa.js                 # Progressive Web App functionality
│   ├── sw.js                  # Service Worker with cache configuration
│   └── page/                  # Individual page modules
│       ├── login.js           # Login functionality
│       ├── index.js           # Main dashboard
│       ├── materiales.js      # Materials management
│       ├── personas.js        # People management
│       ├── supercafe.js       # SuperCafé module
│       ├── comedor.js         # Dining hall module
│       ├── importar.js        # Data import functionality
│       ├── exportar.js        # Data export functionality
│       ├── resumen_diario.js  # Daily summary
│       └── notificaciones.js  # Notifications
└── assets/                     # Static assets copied to dist/
    ├── manifest.json          # PWA manifest
    ├── *.png, *.jpg           # Icons and images
    ├── static/                # JavaScript libraries and CSS
    │   ├── gun.js             # GunDB library
    │   ├── sea.js             # GunDB encryption
    │   ├── webrtc.js          # WebRTC functionality
    │   ├── euskaditech-css/   # CSS framework
    │   └── ico/               # Application icons
    └── page/                   # Page-specific assets (empty placeholder)
```

### Build Process Details
The `build.py` script performs these operations:
1. **Clean:** Removes existing `dist/` directory (if it exists)
2. **Copy Assets:** Copies all files from `assets/` to `dist/`
3. **Process Templates:** Processes files from `src/` and replaces:
   - `%%PREFETCH%%` - Generates link prefetch tags for all assets
   - `%%VERSIONCO%%` - Inserts version code "2025-08-04_1"
   - `%%ASSETSJSON%%` - Inserts JSON array of all asset files
4. **Output:** Creates complete deployable application in `dist/`

## Application Architecture

### Technology Stack
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Data Layer:** GunDB - distributed, decentralized database
- **Networking:** WebRTC for peer-to-peer connections
- **Authentication:** Group codes + secret keys (converted to uppercase)
- **Storage:** Browser LocalStorage + GunDB distributed storage
- **PWA Features:** Service Worker, Web App Manifest

### GunDB Relay Servers
The application connects to multiple relay servers:
- gun-es01.tech.eus through gun-es06.tech.eus
- gun-manhattan.herokuapp.com
- peer.wallie.io
- gun.defucc.me

### Application Modules
- **Login/Authentication:** Group-based access with secret keys
- **Materials Management:** Track and manage materials/supplies
- **People Management:** Manage group members
- **SuperCafé:** Café/beverage ordering system
- **Dining Hall:** Restaurant/meal management
- **Import/Export:** Data backup and restoration
- **Daily Summary:** Reports and analytics
- **Notifications:** Alert system

## Common Development Tasks

### Making Changes to the Application
1. **ALWAYS** edit files in `src/` directory, never `dist/`
2. Run `python3 build.py` to rebuild after changes
3. Refresh browser or restart web server to see changes
4. Test authentication flow and network connectivity after any changes

### Adding New Features
1. Create new JavaScript files in `src/page/` for new modules
2. Add script references in `src/index.html`
3. Update assets if new static files are needed
4. Rebuild and test complete user workflows

### Debugging Common Issues
- **Login Issues:** Check browser console for GunDB connection logs
- **Network Connectivity:** Verify relay servers are accessible
- **Build Issues:** Check Python syntax in build.py
- **Performance:** Monitor browser DevTools Network tab for asset loading

## Validation Scenarios

### Complete User Workflow Test
After making any changes, ALWAYS test this complete scenario:

1. **Build and Serve:**
   ```bash
   cd /home/runner/work/TeleSec/TeleSec
   python3 build.py
   cd dist
   python3 -m http.server 8000
   ```

2. **Login Test:**
   - Navigate to `http://localhost:8000`
   - Enter group code: "TEST"
   - Enter secret key: "SECRET123"
   - Click "Iniciar sesión"
   - Verify header shows: "TeleSec - TEST - (X nodos)" where X > 0

3. **Network Connectivity Test:**
   - Confirm green connection indicator appears (bottom right)
   - Check browser console shows GunDB peer connections
   - Verify heartbeat messages appear in console logs

4. **PWA Functionality Test:**
   - Check Service Worker registers successfully
   - Verify offline caching works (Network tab → Offline)
   - Test manifest.json loads correctly

## Quick Reference Commands

### Essential Operations
```bash
# Build application (< 0.1 seconds)
python3 build.py

# Serve with Python (most compatible)
cd dist && python3 -m http.server 8000

# Serve with Node.js (advanced features)
cd dist && npx http-server . --port 8001 --cors

# Clean rebuild
rm -rf dist && python3 build.py

# Check build output
ls -la dist/
```

### File Structure Verification
```bash
# Verify all source files exist
find src/ -name "*.js" -o -name "*.html" | sort

# Check template variable processing
grep -r "%%.*%%" dist/ || echo "All template variables processed correctly"

# Verify assets copied correctly
diff -r assets/ dist/ --exclude="*.js" --exclude="*.html" || echo "Some differences expected due to processing"
```

**CRITICAL REMINDERS:**
- **NEVER CANCEL**: Builds complete in under 0.1 seconds - no timeout needed
- **ALWAYS test login and network connectivity** after changes
- **Edit source files in `src/` directory only**, never `dist/`
- **Test with real user credentials** to verify distributed networking
- **Monitor browser console** for connection status and errors