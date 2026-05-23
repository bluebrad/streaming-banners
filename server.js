const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Directories
const PUBLIC_DIR = path.join(__dirname, 'public');
const MEDIA_DIR = path.join(__dirname, 'media');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const TRACKING_FILE = path.join(__dirname, 'tracking.json');

// Ensure directories exist
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, MEDIA_DIR);
  },
  filename: (req, file, cb) => {
    // Sanitize filename and prepend timestamp to prevent collisions
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-z0-9_-]/gi, '_');
    cb(null, `${Date.now()}-${base}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.mp4', '.webm'];
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, JPEG, GIF, WEBP, SVG images and MP4, WEBM videos are allowed.'));
    }
  }
});

// Middleware
app.use(express.json());
app.use('/public', express.static(PUBLIC_DIR));
app.use('/media', express.static(MEDIA_DIR));

// Default settings
const DEFAULT_SETTINGS = {
  ratio: '16:9',         // '16:9', '4:3', '1:1', etc. or 'custom'
  customWidth: 1920,     // custom pixel width
  customHeight: 1080,    // custom pixel height
  fit: 'contain',
  displayMode: 'manual', // 'manual' or 'slideshow'
  interval: 10,          // in seconds
  waitVideo: true,       // wait for video to end before advancing
  transition: 'fade',    // 'fade', 'slide-h', 'slide-v', 'zoom', 'none'
  transitionSpeed: 500,  // in ms
  activeMediaId: null,   // currently selected media ID (for manual mode)
  mediaList: []
};

// Helper: Read Settings
function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      // Ensure properties are backward compatible
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.error('Error reading settings file, resetting to default:', err);
  }
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

// Helper: Write Settings
function writeSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    // Broadcast changes to all WebSocket clients
    broadcast({ type: 'settings_update', data: settings });
  } catch (err) {
    console.error('Error writing settings file:', err);
  }
}

// Helper: Read Tracking
function readTracking() {
  try {
    if (fs.existsSync(TRACKING_FILE)) {
      const data = fs.readFileSync(TRACKING_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading tracking file:', err);
  }
  return [];
}

// Helper: Write Tracking
function writeTracking(logs) {
  try {
    fs.writeFileSync(TRACKING_FILE, JSON.stringify(logs, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing tracking file:', err);
  }
}

// Sync media directory files with settings
function syncMediaSettings() {
  const settings = readSettings();
  let files = [];
  try {
    files = fs.readdirSync(MEDIA_DIR);
  } catch (err) {
    console.error('Error reading media directory:', err);
    return;
  }

  const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.mp4', '.webm'];
  const videoExts = ['.mp4', '.webm'];

  // Filter valid files in media directory
  const validFiles = files.filter(f => allowedExts.includes(path.extname(f).toLowerCase()));

  // Map settings mediaList by filename for quick check
  const mediaMap = new Map(settings.mediaList.map(m => [m.filename, m]));
  const updatedMediaList = [];

  // Add existing or new files
  validFiles.forEach(filename => {
    const ext = path.extname(filename).toLowerCase();
    const type = videoExts.includes(ext) ? 'video' : 'image';

    if (mediaMap.has(filename)) {
      // Keep existing media entry
      updatedMediaList.push(mediaMap.get(filename));
    } else {
      // Create new entry
      const id = 'media_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      updatedMediaList.push({
        id: id,
        filename: filename,
        type: type,
        active: true, // active in slideshow by default
        order: updatedMediaList.length
      });
    }
  });

  // Re-sort elements by their order
  updatedMediaList.sort((a, b) => a.order - b.order);
  // Re-index orders to ensure consistency (0, 1, 2...)
  updatedMediaList.forEach((media, index) => {
    media.order = index;
  });

  // If activeMediaId is no longer in valid files, reset it
  const activeExists = updatedMediaList.some(m => m.id === settings.activeMediaId);
  if (!activeExists) {
    settings.activeMediaId = updatedMediaList.length > 0 ? updatedMediaList[0].id : null;
  }

  settings.mediaList = updatedMediaList;
  writeSettings(settings);
}

// WebSocket broadcast
function broadcast(message) {
  const rawMessage = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(rawMessage);
    }
  });
}

// REST Endpoints

// Redirect base to dashboard
app.get('/', (req, res) => {
  res.redirect('/public/dashboard.html');
});

// Get settings and synced media list
app.get('/api/settings', (req, res) => {
  syncMediaSettings(); // Always sync prior to reading to ensure accuracy
  res.json(readSettings());
});

// Update global config settings (supports custom ratios)
app.post('/api/settings', (req, res) => {
  const currentSettings = readSettings();
  const { 
    ratio, customWidth, customHeight, fit, displayMode, 
    interval, waitVideo, transition, transitionSpeed, activeMediaId 
  } = req.body;

  if (ratio !== undefined) currentSettings.ratio = ratio;
  if (customWidth !== undefined) currentSettings.customWidth = Number(customWidth) || 1920;
  if (customHeight !== undefined) currentSettings.customHeight = Number(customHeight) || 1080;
  if (fit !== undefined) currentSettings.fit = fit;
  if (displayMode !== undefined) currentSettings.displayMode = displayMode;
  if (interval !== undefined) currentSettings.interval = Number(interval) || 10;
  if (waitVideo !== undefined) currentSettings.waitVideo = !!waitVideo;
  if (transition !== undefined) currentSettings.transition = transition;
  if (transitionSpeed !== undefined) currentSettings.transitionSpeed = Number(transitionSpeed) || 500;
  if (activeMediaId !== undefined) currentSettings.activeMediaId = activeMediaId;

  writeSettings(currentSettings);
  res.json({ success: true, settings: currentSettings });
});

// Upload media file
app.post('/api/media/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    syncMediaSettings();
    const settings = readSettings();
    res.json({ success: true, settings });
  });
});

// Toggle active state of a specific media
app.post('/api/media/toggle', (req, res) => {
  const { id, active } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'Media ID required.' });

  const settings = readSettings();
  const media = settings.mediaList.find(m => m.id === id);
  if (media) {
    media.active = !!active;
    writeSettings(settings);
    return res.json({ success: true, settings });
  }
  res.status(404).json({ success: false, error: 'Media not found.' });
});

// Delete media file and entry
app.post('/api/media/delete', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'Media ID required.' });

  const settings = readSettings();
  const mediaIndex = settings.mediaList.findIndex(m => m.id === id);
  if (mediaIndex !== -1) {
    const media = settings.mediaList[mediaIndex];
    const filePath = path.join(MEDIA_DIR, media.filename);

    // Delete physically
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error physically deleting file:', err);
      }
    }

    // Remove from settings list
    settings.mediaList.splice(mediaIndex, 1);

    // Re-index orders
    settings.mediaList.forEach((m, idx) => {
      m.order = idx;
    });

    // Reset active media if deleted
    if (settings.activeMediaId === id) {
      settings.activeMediaId = settings.mediaList.length > 0 ? settings.mediaList[0].id : null;
    }

    writeSettings(settings);
    return res.json({ success: true, settings });
  }
  res.status(404).json({ success: false, error: 'Media not found.' });
});

// Reorder media (move up/down)
app.post('/api/media/reorder', (req, res) => {
  const { id, direction } = req.body; // direction: 'up' or 'down'
  if (!id || !direction) return res.status(400).json({ success: false, error: 'id and direction are required.' });

  const settings = readSettings();
  const index = settings.mediaList.findIndex(m => m.id === id);
  if (index === -1) return res.status(404).json({ success: false, error: 'Media not found.' });

  if (direction === 'up' && index > 0) {
    // Swap with index - 1
    const temp = settings.mediaList[index];
    settings.mediaList[index] = settings.mediaList[index - 1];
    settings.mediaList[index - 1] = temp;
  } else if (direction === 'down' && index < settings.mediaList.length - 1) {
    // Swap with index + 1
    const temp = settings.mediaList[index];
    settings.mediaList[index] = settings.mediaList[index + 1];
    settings.mediaList[index + 1] = temp;
  }

  // Update order properties
  settings.mediaList.forEach((m, idx) => {
    m.order = idx;
  });

  writeSettings(settings);
  res.json({ success: true, settings });
});


// Analytics Tracking REST Endpoints

// Add a tracking view event
app.post('/api/tracking/event', (req, res) => {
  const { mediaId, filename, loadTimeMs, duration, timestamp } = req.body;
  if (!mediaId || duration === undefined) {
    return res.status(400).json({ success: false, error: 'mediaId and duration are required.' });
  }

  const logs = readTracking();
  const newEvent = {
    mediaId,
    filename,
    loadTimeMs: Number(loadTimeMs) || 0,
    duration: Number(duration) || 0,
    timestamp: Number(timestamp) || Date.now()
  };

  logs.push(newEvent);
  writeTracking(logs);

  // Broadcast update to update dashboard in real-time
  broadcast({ type: 'tracking_update', data: { event: newEvent, logs } });

  res.json({ success: true, event: newEvent });
});

// Fetch analytics logs
app.get('/api/tracking', (req, res) => {
  const logs = readTracking();
  res.json({ success: true, logs });
});

// Clear analytics logs
app.post('/api/tracking/reset', (req, res) => {
  writeTracking([]);
  broadcast({ type: 'tracking_update', data: { logs: [] } });
  res.json({ success: true, logs: [] });
});


// WebSocket Server Handlers
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket (total clients:', wss.clients.size, ')');
  
  // Send current settings & tracking state immediately
  ws.send(JSON.stringify({ type: 'settings_update', data: readSettings() }));
  ws.send(JSON.stringify({ type: 'tracking_load', data: readTracking() }));

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket (total clients:', wss.clients.size, ')');
  });
});

// Sync on startup and launch server
syncMediaSettings();
server.listen(PORT, () => {
  console.log(`===========================================================`);
  console.log(` Streaming Banner Manager is running on:`);
  console.log(` http://localhost:${PORT}`);
  console.log(` Dashboard: http://localhost:${PORT}/public/dashboard.html`);
  console.log(` OBS Overlay: http://localhost:${PORT}/public/obs.html`);
  console.log(`===========================================================`);
});
