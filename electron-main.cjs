const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { Client } = require('minecraft-launcher-core');
const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');

let mainWindow;

function createWindow() {
  const splashWindow = new BrowserWindow({
    width: 400,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));

  mainWindow = new BrowserWindow({
    width: 1050,
    height: 650,
    frame: false,
    resizable: false,
    show: false, // Don't show immediately
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load the Vite dev server in development, or the built files in production
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Once main window is ready to show, wait a bit for splash animation then swap
  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      splashWindow.close();
      mainWindow.show();
    }, 3000); // 3 second splash minimum
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Custom window controls IPC
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});
ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});
ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('open-minecraft-folder', () => {
  const rootPath = path.join(app.getPath('userData'), 'minecraft-data');
  if (!fs.existsSync(rootPath)) {
    fs.mkdirSync(rootPath, { recursive: true });
  }
  shell.openPath(rootPath);
});

ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});
// Mod install IPC (for modpack manager)
ipcMain.handle('install-mod', async (event, { modpackId, downloadUrl, filename }) => {
  const rootPath = path.join(app.getPath('userData'), 'minecraft-data');
  const modsPath = path.join(rootPath, 'profiles', `modpack-${modpackId}`, 'mods');
  if (!fs.existsSync(modsPath)) fs.mkdirSync(modsPath, { recursive: true });
  const jarPath = path.join(modsPath, filename);
  if (fs.existsSync(jarPath)) return { success: true, cached: true };
  return new Promise((resolve, reject) => {
    downloadFile(downloadUrl, jarPath, () => resolve({ success: true }), (e) => reject(e));
  });
});

ipcMain.handle('remove-mod', async (event, { modpackId, filename }) => {
  const rootPath = path.join(app.getPath('userData'), 'minecraft-data');
  const jarPath = path.join(rootPath, 'profiles', `modpack-${modpackId}`, 'mods', filename);
  try { if (fs.existsSync(jarPath)) fs.unlinkSync(jarPath); } catch(e) {}
  return { success: true };
});

ipcMain.handle('install-resourcepack', async (event, { modpackId, downloadUrl, filename }) => {
  const rootPath = path.join(app.getPath('userData'), 'minecraft-data');
  const rpPath = path.join(rootPath, 'profiles', `modpack-${modpackId}`, 'resourcepacks');
  if (!fs.existsSync(rpPath)) fs.mkdirSync(rpPath, { recursive: true });
  const destPath = path.join(rpPath, filename);
  if (fs.existsSync(destPath)) return { success: true, cached: true };
  return new Promise((resolve, reject) => {
    downloadFile(downloadUrl, destPath, () => resolve({ success: true }), (e) => reject(e));
  });
});

ipcMain.handle('remove-resourcepack', async (event, { modpackId, filename }) => {
  const rootPath = path.join(app.getPath('userData'), 'minecraft-data');
  const destPath = path.join(rootPath, 'profiles', `modpack-${modpackId}`, 'resourcepacks', filename);
  try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); } catch(e) {}
  return { success: true };
});

ipcMain.handle('install-shader', async (event, { modpackId, downloadUrl, filename }) => {
  const rootPath = path.join(app.getPath('userData'), 'minecraft-data');
  const shaderPath = path.join(rootPath, 'profiles', `modpack-${modpackId}`, 'shaderpacks');
  if (!fs.existsSync(shaderPath)) fs.mkdirSync(shaderPath, { recursive: true });
  const destPath = path.join(shaderPath, filename);
  if (fs.existsSync(destPath)) return { success: true, cached: true };
  return new Promise((resolve, reject) => {
    downloadFile(downloadUrl, destPath, () => resolve({ success: true }), (e) => reject(e));
  });
});

ipcMain.handle('remove-shader', async (event, { modpackId, filename }) => {
  const rootPath = path.join(app.getPath('userData'), 'minecraft-data');
  const destPath = path.join(rootPath, 'profiles', `modpack-${modpackId}`, 'shaderpacks', filename);
  try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); } catch(e) {}
  return { success: true };
});

// Launch minecraft with a specific modpack profile
ipcMain.on('launch-modpack', async (event, args) => {
  const { username, modpackId, mcVersion, loader, javaPath, maxMemory } = args;
  const rootPath = path.join(app.getPath('userData'), 'minecraft-data');
  const profilePath = path.join(rootPath, 'profiles', `modpack-${modpackId}`);
  if (!fs.existsSync(profilePath)) fs.mkdirSync(profilePath, { recursive: true });

  const maxMem = maxMemory || '4G';
  const minMem = parseInt(maxMem) >= 4 ? '2G' : '1G';

  let opts = {
    clientPackage: null,
    authorization: {
      access_token: '0', client_token: '0',
      uuid: '00000000-0000-0000-0000-000000000000',
      name: username, user_properties: '{}',
      meta: { type: 'mojang', demo: false }
    },
    root: rootPath,
    overrides: { gameDirectory: profilePath },
    version: { number: mcVersion, type: 'release' },
    memory: { max: maxMem, min: minMem }
  };
  if (javaPath && javaPath.trim() !== '') opts.javaPath = javaPath;

  if (loader === 'Fabric') {
    try {
      event.sender.send('launch-progress', { status: 'Setting up Fabric...', percent: 10 });
      const fabricVersion = await installFabric(mcVersion, rootPath);
      opts.version.custom = fabricVersion;
    } catch (err) {
      event.sender.send('launch-error', 'Failed to install Fabric: ' + err);
      return;
    }
  }

  const launchClient = new Client();
  launchClient.on('progress', (e) => {
    let percent = e.task !== undefined && e.total > 0 ? Math.round((e.task / e.total) * 100) : undefined;
    event.sender.send('launch-progress', { status: `Downloading ${e.type || 'files'} (${e.task}/${e.total})...`, percent });
  });
  launchClient.on('download-status', (e) => {
    event.sender.send('launch-progress', { percent: Math.round((e.current / e.total) * 100), status: `Downloading ${e.name}...` });
  });
  launchClient.on('close', () => event.sender.send('launch-closed'));
  try {
    event.sender.send('launch-progress', { percent: 0, status: 'Initializing...' });
    await launchClient.launch(opts);
    // Game process is now running — tell renderer to hide overlay
    event.sender.send('game-launched');
  } catch (err) {
    event.sender.send('launch-error', err.message);
  }
});

// Minecraft Launch IPC
ipcMain.on('launch-minecraft', async (event, args) => {
  const { username, version, javaPath, loader, autoOptimization, maxMemory } = args;
  
  const rootPath = path.join(app.getPath('userData'), 'minecraft-data');
  const profilePath = path.join(rootPath, 'profiles', version);
  if (!fs.existsSync(profilePath)) fs.mkdirSync(profilePath, { recursive: true });

  const maxMem = maxMemory || '4G';
  const minMem = parseInt(maxMem) >= 4 ? '2G' : '1G';

  let opts = {
    clientPackage: null,
    authorization: {
      access_token: '0',
      client_token: '0',
      uuid: '00000000-0000-0000-0000-000000000000',
      name: username,
      user_properties: '{}',
      meta: { type: 'mojang', demo: false }
    },
    root: rootPath,
    overrides: { gameDirectory: profilePath },
    version: { number: version, type: 'release' },
    memory: { max: maxMem, min: minMem }
  };

  if (javaPath && javaPath.trim() !== '') {
    opts.javaPath = javaPath;
  }

  // Handle Mod Loader
  try {
    if (loader === 'Fabric') {
      event.sender.send('launch-progress', { status: 'Downloading Fabric loader...', percent: 10 });
      const fabricVersion = await installFabric(version, rootPath);
      opts.version.custom = fabricVersion;
      
      if (autoOptimization) {
        event.sender.send('launch-progress', { status: 'Downloading Sodium...', percent: 20 });
        const sodiumInstalled = await installSodium(version, profilePath);
        if (!sodiumInstalled) {
          event.sender.send('launch-warning', `Sodium is not available for Minecraft ${version}. The game will launch without it.`);
        }
      }
    } else if (loader === 'Forge') {
      event.sender.send('launch-error', 'Automated Forge & Optifine downloads are blocked by their ad-walls! Please download them manually, or use Fabric + Sodium instead!');
      return;
    }
  } catch (err) {
    event.sender.send('launch-error', 'Failed to install mod loader: ' + err);
    return;
  }

  // Fresh Client per launch — avoids stale listener accumulation
  const launchClient = new Client();

  launchClient.on('debug', (e) => console.log(e));
  launchClient.on('data', (e) => console.log(e));
  
  launchClient.on('progress', (e) => {
    console.log('Progress:', e);
    let statusText = `Downloading ${e.type || 'files'}...`;
    let percent;
    if (e.task !== undefined && e.total !== undefined && e.total > 0) {
      percent = Math.round((e.task / e.total) * 100);
      statusText = `Downloading ${e.type || 'files'} (${e.task}/${e.total})...`;
    }
    event.sender.send('launch-progress', { status: statusText, percent });
  });

  launchClient.on('download-status', (e) => {
    let percent = Math.round((e.current / e.total) * 100);
    let statusText = `Downloading ${e.name}...`;
    event.sender.send('launch-progress', { percent, status: statusText });
  });

  launchClient.on('close', () => {
    console.log('Game closed');
    event.sender.send('launch-closed');
  });

  try {
    event.sender.send('launch-progress', { percent: 0, status: 'Initializing...' });
    await launchClient.launch(opts);
    // Game process is now running — tell renderer to hide the overlay
    event.sender.send('game-launched');
  } catch (err) {
    console.error('Failed to launch', err);
    event.sender.send('launch-error', err.message);
  }
});

// Helper Functions
function installFabric(version, rootPath) {
  return new Promise((resolve, reject) => {
    https.get(`https://meta.fabricmc.net/v2/versions/loader/${version}`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if(json.length === 0) return reject("Fabric not available for this version.");
          const loaderVersion = json[0].loader.version;
          const jarName = `fabric-loader-${loaderVersion}-${version}`;
          
          const versionsPath = path.join(rootPath, 'versions', jarName);
          if (!fs.existsSync(versionsPath)) fs.mkdirSync(versionsPath, {recursive: true});

          // Delete the dummy 0-byte jar from any previous buggy runs
          const dummyJarPath = path.join(versionsPath, `${jarName}.jar`);
          if (fs.existsSync(dummyJarPath)) {
            try {
              if (fs.statSync(dummyJarPath).size === 0) {
                fs.unlinkSync(dummyJarPath);
              }
            } catch (e) { console.error("Failed to delete dummy jar", e); }
          }

          // Fetch only the JSON instead of the full ZIP, bypassing the dummy jar completely!
          const jsonUrl = `https://meta.fabricmc.net/v2/versions/loader/${version}/${loaderVersion}/profile/json`;
          const file = fs.createWriteStream(path.join(versionsPath, `${jarName}.json`));
          
          https.get(jsonUrl, (r) => {
            r.pipe(file);
            file.on('finish', () => {
              file.close();
              resolve(jarName);
            });
          }).on('error', reject);
        } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Helper: follow redirects recursively then pipe to a write stream
function downloadFile(url, destPath, resolve, reject, depth = 0) {
  if (depth > 5) return reject(new Error('Too many redirects'));
  console.log(`[Sodium] Downloading (depth=${depth}): ${url}`);
  https.get(url, (r) => {
    console.log(`[Sodium] Status: ${r.statusCode}`);
    if (r.statusCode === 301 || r.statusCode === 302 || r.statusCode === 303 || r.statusCode === 307 || r.statusCode === 308) {
      const location = r.headers.location;
      console.log(`[Sodium] Redirecting to: ${location}`);
      r.resume(); // drain it
      return downloadFile(location, destPath, resolve, reject, depth + 1);
    }
    if (r.statusCode !== 200) {
      return reject(new Error(`Download failed with status ${r.statusCode}`));
    }
    const file = fs.createWriteStream(destPath);
    r.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`[Sodium] Saved to: ${destPath}`);
      resolve();
    });
    file.on('error', reject);
    r.on('error', reject);
  }).on('error', reject);
}

// profilePath is the per-version directory (e.g. profiles/1.16.4)
// mods are placed in profilePath/mods, fully isolated per game version
function installSodium(version, profilePath) {
  return new Promise((resolve, reject) => {
    const gameVersions = encodeURIComponent(JSON.stringify([version]));
    const loaders = encodeURIComponent(JSON.stringify(["fabric"]));
    const url = `https://api.modrinth.com/v2/project/sodium/version?game_versions=${gameVersions}&loaders=${loaders}`;
    console.log(`[Sodium] Querying Modrinth: ${url}`);

    https.get(url, { headers: { 'User-Agent': 'IDKLauncher/1.0 (contact@idklauncher.app)' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          console.log(`[Sodium] Modrinth response (${res.statusCode}):`, data.substring(0, 300));
          const json = JSON.parse(data);
          if (!Array.isArray(json) || json.length === 0) {
            console.log(`[Sodium] No versions found for ${version}, skipping.`);
            return resolve(false); // Signal: not supported
          }

          const fileObj = json[0].files.find(f => f.primary) || json[0].files[0];
          const downloadUrl = fileObj.url;
          const fileName = fileObj.filename;
          console.log(`[Sodium] Found: ${fileName} — ${downloadUrl}`);

          // Mods folder is inside the per-version profile — no more cross-version leaking!
          const modsPath = path.join(profilePath, 'mods');
          if (!fs.existsSync(modsPath)) {
            fs.mkdirSync(modsPath, { recursive: true });
            console.log(`[Sodium] Created mods dir: ${modsPath}`);
          } else {
            // Clean stale sodium JARs in this version's mods folder
            fs.readdirSync(modsPath).forEach(file => {
              if (file.toLowerCase().includes('sodium')) {
                try { fs.unlinkSync(path.join(modsPath, file)); } catch(e) {}
              }
            });
          }

          const jarPath = path.join(modsPath, fileName);
          downloadFile(downloadUrl, jarPath, () => resolve(true), reject);
        } catch(e) {
          console.error('[Sodium] Error parsing Modrinth response:', e);
          reject(e);
        }
      });
    }).on('error', (e) => {
      console.error('[Sodium] Request error:', e);
      reject(e);
    });
  });
}
