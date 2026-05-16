const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { Client } = require('minecraft-launcher-core');
const fs = require('fs');
const https = require('https');
const { exec, execSync } = require('child_process');

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

ipcMain.on('toggle-devtools', () => {
  if (mainWindow) {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  }
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


ipcMain.handle('unzip-curseforge', async (event, { filePath }) => {
  try {
    const tempExt = path.join(app.getPath('userData'), 'temp-import-' + Date.now());
    if (fs.existsSync(tempExt)) fs.rmSync(tempExt, { recursive: true, force: true });
    fs.mkdirSync(tempExt, { recursive: true });
    
    execSync(`powershell.exe -NoProfile -NonInteractive -Command "Expand-Archive -Path '${filePath}' -DestinationPath '${tempExt}' -Force"`);
    
    const manifestPath = path.join(tempExt, 'manifest.json');
    if (!fs.existsSync(manifestPath)) throw new Error("Not a valid CurseForge modpack (manifest.json missing)");
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const modpackId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    
    const profilePath = path.join(app.getPath('userData'), 'minecraft-data', 'profiles', `modpack-${modpackId}`);
    fs.mkdirSync(profilePath, { recursive: true });
    
    const overridesFolder = manifest.overrides || 'overrides';
    const overridesPath = path.join(tempExt, overridesFolder);
    if (fs.existsSync(overridesPath)) {
      // Use Copy-Item to copy contents inside overrides path
      execSync(`powershell.exe -NoProfile -NonInteractive -Command "Copy-Item -Path '${overridesPath}\*' -Destination '${profilePath}' -Recurse -Force"`);
    }
    
    fs.rmSync(tempExt, { recursive: true, force: true });
    
    return { success: true, manifest, modpackId };
  } catch (e) {
    return { success: false, error: e.message };
  }
});


ipcMain.handle('download-curseforge-modpack', async (event, { downloadUrl }) => {
  try {
    const tempZip = path.join(app.getPath('userData'), 'temp-modpack-' + Date.now() + '.zip');
    await new Promise((resolve, reject) => {
      downloadFile(downloadUrl, tempZip, resolve, reject);
    });
    
    const tempExt = path.join(app.getPath('userData'), 'temp-import-' + Date.now());
    if (fs.existsSync(tempExt)) fs.rmSync(tempExt, { recursive: true, force: true });
    fs.mkdirSync(tempExt, { recursive: true });
    
    execSync(`powershell.exe -NoProfile -NonInteractive -Command "Expand-Archive -Path '${tempZip}' -DestinationPath '${tempExt}' -Force"`);
    
    const manifestPath = path.join(tempExt, 'manifest.json');
    if (!fs.existsSync(manifestPath)) throw new Error("Not a valid CurseForge modpack (manifest.json missing)");
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const modpackId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    
    const profilePath = path.join(app.getPath('userData'), 'minecraft-data', 'profiles', `modpack-${modpackId}`);
    fs.mkdirSync(profilePath, { recursive: true });
    
    const overridesFolder = manifest.overrides || 'overrides';
    const overridesPath = path.join(tempExt, overridesFolder);
    if (fs.existsSync(overridesPath)) {
      execSync(`powershell.exe -NoProfile -NonInteractive -Command "Copy-Item -Path '${overridesPath}\*' -Destination '${profilePath}' -Recurse -Force"`);
    }
    
    fs.rmSync(tempExt, { recursive: true, force: true });
    fs.unlinkSync(tempZip);
    
    return { success: true, manifest, modpackId };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Launch minecraft with a specific modpack profile
ipcMain.handle('elyby-authenticate', async (event, { username, password, clientToken }) => {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      agent: { name: 'Minecraft', version: 1 },
      username, password, clientToken
    });
    const req = https.request({
      hostname: 'authserver.ely.by', port: 443, path: '/auth/authenticate', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ ok: res.statusCode === 200, data: JSON.parse(data) }); }
        catch (e) { resolve({ ok: false, data: { errorMessage: 'Invalid JSON response' } }); }
      });
    });
    req.on('error', (e) => resolve({ ok: false, data: { errorMessage: e.message } }));
    req.write(postData);
    req.end();
  });
});

ipcMain.on('launch-modpack', async (event, args) => {
  const { username, modpackId, mcVersion, loader, javaPath, maxMemory, authData } = args;
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

  if (authData && authData.accessToken) {
    opts.authorization = {
      access_token: authData.accessToken,
      client_token: authData.clientToken,
      uuid: authData.selectedProfile.id,
      name: authData.selectedProfile.name,
      user_properties: '{}',
      meta: { type: 'mojang', demo: false }
    };
    try {
      event.sender.send('launch-progress', { status: 'Downloading Ely.by Injector...', percent: 50 });
      const injectorPath = await ensureAuthlibInjector(rootPath);
      opts.customArgs = [`-javaagent:${injectorPath}=https://authserver.ely.by`];
    } catch (e) {
      console.warn("Injector failed", e);
      event.sender.send('launch-warning', "Ely.by skins may not work (injector failed).");
    }
  }
  if (javaPath && javaPath.trim() !== '') {
    opts.javaPath = javaPath;
  } else {
    try {
      opts.javaPath = await ensureJava(mcVersion, rootPath, loader, (progress) => {
        event.sender.send('launch-progress', progress);
      });
    } catch (e) {
      event.sender.send('launch-error', 'Java Auto-Install Failed: ' + e.message);
      return;
    }
  }

  const loaderLC = (loader || '').toLowerCase();

  // Initialize customArgs if not already present
  if (!opts.customArgs) opts.customArgs = [];

  if (loaderLC === 'fabric') {
    try {
      event.sender.send('launch-progress', { status: 'Setting up Fabric...', percent: 10 });
      const fabricVersion = await installFabric(mcVersion, rootPath);
      opts.version.custom = fabricVersion;
    } catch (err) {
      event.sender.send('launch-error', 'Failed to install Fabric: ' + err);
      return;
    }
  } else if (loaderLC === 'forge') {
    try {
      event.sender.send('launch-progress', { status: 'Installing Forge (this may take a moment)...', percent: 10 });
      const forgeVersionId = await installForge(mcVersion, rootPath, opts.javaPath, (p) => event.sender.send('launch-progress', p));
      opts.version.custom = forgeVersionId;
    } catch (err) {
      event.sender.send('launch-error', 'Failed to install Forge: ' + err.message);
      return;
    }
  } else if (loaderLC === 'neoforge') {
    try {
      event.sender.send('launch-progress', { status: 'Installing NeoForge (this may take a moment)...', percent: 10 });
      const neoVersionId = await installNeoForge(mcVersion, rootPath, opts.javaPath, (p) => event.sender.send('launch-progress', p));
      opts.version.custom = neoVersionId;
    } catch (err) {
      event.sender.send('launch-error', 'Failed to install NeoForge: ' + err.message);
      return;
    }
  }

  // Inject Forge/NeoForge specific JVM arguments (module paths, etc.)
  if (loaderLC === 'forge' || loaderLC === 'neoforge') {
    const forgeArgs = getForgeJvmArgs(rootPath, opts.version.custom);
    opts.customArgs.push(...forgeArgs);
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
  launchClient.on('data', (e) => console.log('[MC Process]', e));
  launchClient.on('debug', (e) => console.log('[MC Debug]', e));
  try {
    event.sender.send('launch-progress', { percent: 0, status: 'Initializing...' });
    // Clean empty files to prevent ZipException corruption
    cleanEmptyFiles(path.join(rootPath, 'libraries'));
    cleanEmptyFiles(path.join(rootPath, 'versions'));
    await launchClient.launch(opts);
    // Game process is now running — tell renderer to hide overlay
    event.sender.send('game-launched');
  } catch (err) {
    event.sender.send('launch-error', err.message);
  }
});

// Minecraft Launch IPC
ipcMain.on('launch-minecraft', async (event, args) => {
  const { username, version, javaPath, loader, autoOptimization, maxMemory, authData } = args;
  
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

  if (authData && authData.accessToken) {
    opts.authorization = {
      access_token: authData.accessToken,
      client_token: authData.clientToken,
      uuid: authData.selectedProfile.id,
      name: authData.selectedProfile.name,
      user_properties: '{}',
      meta: { type: 'mojang', demo: false }
    };
    try {
      event.sender.send('launch-progress', { status: 'Downloading Ely.by Injector...', percent: 50 });
      const injectorPath = await ensureAuthlibInjector(rootPath);
      opts.customArgs = [`-javaagent:${injectorPath}=https://authserver.ely.by`];
    } catch (e) {
      console.warn("Injector failed", e);
      event.sender.send('launch-warning', "Ely.by skins may not work (injector failed).");
    }
  }

  if (javaPath && javaPath.trim() !== '') {
    opts.javaPath = javaPath;
  } else {
    try {
      opts.javaPath = await ensureJava(version, rootPath, loader, (progress) => {
        event.sender.send('launch-progress', progress);
      });
    } catch (e) {
      event.sender.send('launch-error', 'Java Auto-Install Failed: ' + e.message);
      return;
    }
  }

  // Handle Mod Loader
  try {
    const loaderNameLC = (loader || '').toLowerCase();

    if (!opts.customArgs) opts.customArgs = [];

    if (loaderNameLC === 'fabric') {
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
    } else if (loaderNameLC === 'forge') {
      event.sender.send('launch-progress', { status: 'Installing Forge (this may take a moment)...', percent: 10 });
      const forgeVersionId = await installForge(version, rootPath, opts.javaPath, (p) => event.sender.send('launch-progress', p));
      opts.version.custom = forgeVersionId;
    } else if (loaderNameLC === 'neoforge') {
      event.sender.send('launch-progress', { status: 'Installing NeoForge (this may take a moment)...', percent: 10 });
      const neoVersionId = await installNeoForge(version, rootPath, opts.javaPath, (p) => event.sender.send('launch-progress', p));
      opts.version.custom = neoVersionId;
    } else if (loaderNameLC === 'quilt') {
      event.sender.send('launch-progress', { status: 'Setting up Quilt loader...', percent: 10 });
      const quiltVersionId = await installQuilt(version, rootPath);
      opts.version.custom = quiltVersionId;
    }
    
    // Inject Forge/NeoForge specific JVM arguments (module paths, etc.)
    if (loaderNameLC === 'forge' || loaderNameLC === 'neoforge') {
      const forgeArgs = getForgeJvmArgs(rootPath, opts.version.custom);
      opts.customArgs.push(...forgeArgs);
    }
  } catch (err) {
    event.sender.send('launch-error', 'Failed to install mod loader: ' + err.message);
    return;
  }

  // Fresh Client per launch — avoids stale listener accumulation
  const launchClient = new Client();

  launchClient.on('debug', (e) => console.log(e));
  
  let outputBuffer = '';
  launchClient.on('data', (e) => {
    const str = e.toString();
    console.log(str);
    
    // Auto-Healing: Detect corrupted JAR files that cause Java to crash with a ZipException or IOException
    outputBuffer += str;
    if (outputBuffer.length > 5000) outputBuffer = outputBuffer.slice(-5000); // Keep last 5000 chars to avoid memory bloat
    
    const match = outputBuffer.match(/error reading (.*?\.jar)/i);
    if (match && match[1]) {
      const corruptedJar = match[1].trim();
      try {
        if (fs.existsSync(corruptedJar)) {
          console.log(`[Auto-Healer] Detected corrupted JAR, deleting: ${corruptedJar}`);
          fs.unlinkSync(corruptedJar);
          event.sender.send('launch-warning', `Corrupted file removed: ${path.basename(corruptedJar)}. Click PLAY again to redownload!`);
          outputBuffer = ''; // Clear buffer to avoid multi-deletes
        }
      } catch (err) {
        console.error('[Auto-Healer] Failed to delete corrupted jar', err);
      }
    }
    
    // Auto-Healing: Detect Java Version Compatibility Errors (e.g. JAVA_25 Mixin Error)
    if (outputBuffer.includes('Level is not supported by the active JRE') || 
        outputBuffer.includes('has been compiled by a more recent version') ||
        outputBuffer.includes('Error parsing or using Mixin config')) {
      event.sender.send('clear-java-path');
      outputBuffer = '';
    }
  });
  
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
    // Clean empty files to prevent ZipException corruption
    cleanEmptyFiles(path.join(rootPath, 'libraries'));
    cleanEmptyFiles(path.join(rootPath, 'versions'));
    await launchClient.launch(opts);
    // Game process is now running — tell renderer to hide the overlay
    event.sender.send('game-launched');
  } catch (err) {
    console.error('Failed to launch', err);
    event.sender.send('launch-error', err.message);
  }
});

// Helper Functions
async function ensureAuthlibInjector(rootPath) {
  const libPath = path.join(rootPath, 'authlib-injector.jar');
  if (fs.existsSync(libPath)) return libPath;
  
  return new Promise((resolve, reject) => {
    https.get('https://api.github.com/repos/yushijinhun/authlib-injector/releases/latest', { headers: { 'User-Agent': 'IDKLauncher/1.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const asset = json.assets.find(a => a.name.endsWith('.jar'));
          if (!asset) return reject(new Error('No authlib-injector jar found'));
          downloadFile(asset.browser_download_url, libPath, () => resolve(libPath), reject);
        } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function getRequiredJavaVersion(mcVersion, loader) {
  const isFabric = (loader || '').toLowerCase() === 'fabric';

  // Extract the minor version ONLY from legacy "1.x.x" format (e.g., 21 from "1.21.4").
  // The regex is anchored to ^ so "26.1.2" does NOT falsely match "1.2".
  // If the version doesn't start with "1." (modern format like 26.x.x, snapshots, etc),
  // default to 999 which forces the latest Java.
  const match = (mcVersion || '').match(/^1\.(\d+)/);
  const minor = match ? parseInt(match[1], 10) : 999;

  // Modern Minecraft (26.x+) and modern Fabric mods require Java 25
  if (minor >= 999) return 25; // Non-1.x versions (e.g. 26.1.2) → Java 25
  if (isFabric && minor >= 20) return 25; // Fabric 1.20+ mods now compile against Java 25
  if (isFabric && minor >= 16) return 21; // Older Fabric (1.16-1.19) → Java 21

  if (minor >= 20) return 21; // Vanilla 1.20+ → Java 21
  if (minor >= 17) return 17; // 1.17 to 1.19.x → Java 17
  return 8; // 1.16.5 and below → Java 8
}

async function ensureJava(mcVersion, rootPath, loader, progressCallback) {
  const javaVersion = getRequiredJavaVersion(mcVersion, loader);
  const runtimesPath = path.join(rootPath, 'runtimes');
  if (!fs.existsSync(runtimesPath)) fs.mkdirSync(runtimesPath, { recursive: true });
  
  const jreFolder = path.join(runtimesPath, `jre-${javaVersion}`);
  const javaExe = path.join(jreFolder, 'bin', 'java.exe');

  if (fs.existsSync(javaExe)) return javaExe; // Already downloaded!

  const zipPath = path.join(runtimesPath, `jre-${javaVersion}.zip`);
  const apiUrl = `https://api.adoptium.net/v3/binary/latest/${javaVersion}/ga/windows/x64/jre/hotspot/normal/eclipse`;

  progressCallback({ status: `Downloading Java ${javaVersion}...`, percent: 0 });

  await new Promise((resolve, reject) => {
    let downloaded = 0;
    function downloadJava(url, dest, depth = 0) {
      if (depth > 5) return reject(new Error('Too many redirects'));
      https.get(url, (r) => {
        if ([301, 302, 303, 307, 308].includes(r.statusCode)) {
          return downloadJava(r.headers.location, dest, depth + 1);
        }
        if (r.statusCode !== 200) return reject(new Error(`Download failed: ${r.statusCode}`));
        
        const total = parseInt(r.headers['content-length'] || '0', 10);
        const file = fs.createWriteStream(dest);
        
        r.on('data', (chunk) => {
          downloaded += chunk.length;
          if (total > 0) {
            const percent = Math.round((downloaded / total) * 100);
            progressCallback({ status: `Downloading Java ${javaVersion}...`, percent: Math.min(percent, 99) });
          }
        });
        
        r.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
        file.on('error', reject);
      }).on('error', reject);
    }
    downloadJava(apiUrl, zipPath);
  });

  progressCallback({ status: `Extracting Java ${javaVersion}... (This may take a minute)`, percent: 100 });
  
  const tempExt = path.join(runtimesPath, `temp-${javaVersion}`);
  if (fs.existsSync(tempExt)) fs.rmSync(tempExt, { recursive: true, force: true });
  fs.mkdirSync(tempExt, { recursive: true });
  
  try {
    execSync(`powershell.exe -NoProfile -NonInteractive -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tempExt}' -Force"`);
    
    const extractedDirs = fs.readdirSync(tempExt);
    if (extractedDirs.length > 0) {
      const innerDir = path.join(tempExt, extractedDirs[0]);
      fs.renameSync(innerDir, jreFolder);
    }
    
    fs.rmSync(tempExt, { recursive: true, force: true });
    fs.unlinkSync(zipPath);
    
    if (fs.existsSync(javaExe)) return javaExe;
    throw new Error('java.exe not found after extraction');
  } catch (err) {
    throw new Error(`Extraction failed: ${err.message}`);
  }
}

function cleanEmptyFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      cleanEmptyFiles(fullPath);
    } else if (stat.isFile() && stat.size === 0) {
      console.log(`[Cleaner] Deleting empty file: ${fullPath}`);
      try { fs.unlinkSync(fullPath); } catch (e) {}
    }
  }
}

// ============================================================
// === VANILLA CLIENT PRE-DOWNLOADER ===========================
// (Required by the Forge/NeoForge installer to patch against) =
// ============================================================
async function ensureVanillaClient(mcVersion, rootPath, progressCallback) {
  const versionDir  = path.join(rootPath, 'versions', mcVersion);
  const versionJsonPath = path.join(versionDir, `${mcVersion}.json`);
  const versionJarPath  = path.join(versionDir, `${mcVersion}.jar`);

  // Check both files exist and the JAR is non-empty
  if (fs.existsSync(versionJsonPath) && fs.existsSync(versionJarPath) && fs.statSync(versionJarPath).size > 0) {
    console.log(`[Vanilla] Already present: ${mcVersion}`);
    return;
  }

  progressCallback({ status: `Fetching Minecraft ${mcVersion} manifest...`, percent: 5 });

  // Step 1 — version manifest
  const manifest = await new Promise((resolve, reject) => {
    https.get('https://launchermeta.mojang.com/mc/game/version_manifest.json',
      { headers: { 'User-Agent': 'IDKLauncher/1.0' } }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });

  const versionEntry = manifest.versions.find(v => v.id === mcVersion);
  if (!versionEntry) throw new Error(`Minecraft version ${mcVersion} not found in Mojang manifest`);

  // Step 2 — version JSON
  let versionData;
  if (fs.existsSync(versionJsonPath)) {
    versionData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
  } else {
    versionData = await new Promise((resolve, reject) => {
      https.get(versionEntry.url, { headers: { 'User-Agent': 'IDKLauncher/1.0' } }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
      }).on('error', reject);
    });
    if (!fs.existsSync(versionDir)) fs.mkdirSync(versionDir, { recursive: true });
    fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2));
  }

  // Step 3 — client JAR (what Forge needs to patch)
  if (!fs.existsSync(versionJarPath) || fs.statSync(versionJarPath).size === 0) {
    progressCallback({ status: `Downloading Minecraft ${mcVersion} client (for Forge patching)...`, percent: 8 });
    const clientUrl = versionData.downloads?.client?.url;
    if (!clientUrl) throw new Error(`No client download URL for Minecraft ${mcVersion}`);
    await new Promise((resolve, reject) => downloadFile(clientUrl, versionJarPath, resolve, reject));
  }

  console.log(`[Vanilla] Client ready for Forge patching: ${mcVersion}`);
}

// ============================================================
// === FORGE INSTALLER =========================================
// ============================================================
async function installForge(mcVersion, rootPath, javaExe, progressCallback) {
  const { spawn } = require('child_process');

  // 1. Use promotions_slim.json — the authoritative source for recommended/latest Forge builds
  const promoData = await new Promise((resolve, reject) => {
    https.get('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json',
      { headers: { 'User-Agent': 'IDKLauncher/1.0' } }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });

  const promos = promoData.promos || {};
  const forgeVersion = promos[`${mcVersion}-recommended`] || promos[`${mcVersion}-latest`];
  if (!forgeVersion) throw new Error(`No Forge builds found for MC ${mcVersion}. This version may not have a Forge release.`);

  const forgeFullId = `${mcVersion}-${forgeVersion}`;
  const versionId   = `${mcVersion}-forge-${forgeVersion}`;

  // 2. Check if already installed
  const versionsDir = path.join(rootPath, 'versions', versionId);
  const versionJson = path.join(versionsDir, `${versionId}.json`);
  if (fs.existsSync(versionJson)) {
    console.log(`[Forge] Already installed: ${versionId}`);
    return versionId;
  }

  // 3. PRE-DOWNLOAD vanilla Minecraft so the Forge installer can patch it
  progressCallback({ status: `Preparing Minecraft ${mcVersion} for Forge...`, percent: 10 });
  await ensureVanillaClient(mcVersion, rootPath, progressCallback);

  // 3.5 Forge installer requires a launcher_profiles.json to exist, or it aborts.
  const profilesPath = path.join(rootPath, 'launcher_profiles.json');
  if (!fs.existsSync(profilesPath)) {
    fs.writeFileSync(profilesPath, JSON.stringify({ profiles: {} }));
  }

  // 4. Download the Forge installer JAR
  const installerFilename = `forge-${forgeFullId}-installer.jar`;
  const installerUrls = [
    `https://maven.minecraftforge.net/net/minecraftforge/forge/${forgeFullId}/${installerFilename}`,
    `https://files.minecraftforge.net/net/minecraftforge/forge/${forgeFullId}/${installerFilename}`
  ];
  const installerPath = path.join(rootPath, installerFilename);

  if (!fs.existsSync(installerPath)) {
    progressCallback({ status: `Downloading Forge ${forgeVersion} installer...`, percent: 25 });
    let downloaded = false;
    for (const url of installerUrls) {
      try {
        await new Promise((resolve, reject) => downloadFile(url, installerPath, resolve, reject));
        downloaded = true;
        console.log(`[Forge] Downloaded installer from: ${url}`);
        break;
      } catch (e) {
        console.warn(`[Forge] Download failed from ${url}:`, e.message);
        try { if (fs.existsSync(installerPath)) fs.unlinkSync(installerPath); } catch(_) {}
      }
    }
    if (!downloaded) throw new Error(`Could not download Forge ${forgeVersion} installer. Check your internet connection.`);
  }

  // 5. Run the Forge installer headlessly — use spawn for real-time stderr capture
  progressCallback({ status: `Installing Forge ${forgeVersion} (this takes ~1 minute)...`, percent: 40 });
  await new Promise((resolve, reject) => {
    let stderrBuf = '';
    const proc = spawn(javaExe, [
      '-jar', installerPath,
      '--installClient', rootPath
    ], { timeout: 600000 });

    proc.stdout.on('data', d => console.log('[Forge]', d.toString().trim()));
    proc.stderr.on('data', d => {
      const txt = d.toString();
      console.error('[Forge stderr]', txt.trim());
      stderrBuf += txt;
    });

    proc.on('close', (code) => {
      if (fs.existsSync(versionJson)) {
        // Version JSON present = success regardless of exit code
        resolve();
      } else if (code === 0) {
        resolve();
      } else {
        // Extract the most useful line from stderr
        const lines = stderrBuf.split('\n').filter(l => l.includes('ERROR') || l.includes('Exception') || l.includes('error'));
        const hint = lines[0] || stderrBuf.slice(-300);
        reject(new Error(`Forge installer exited with code ${code}.\n${hint}`));
      }
    });

    proc.on('error', (e) => reject(new Error('Failed to start Forge installer: ' + e.message)));
  });

  try { fs.unlinkSync(installerPath); } catch(e) {}

  if (!fs.existsSync(versionJson)) throw new Error('Forge installation failed — version JSON not found after install.');
  progressCallback({ status: `Forge ${forgeVersion} installed!`, percent: 65 });
  return versionId;
}

// ============================================================
// === NEOFORGE INSTALLER ======================================
// ============================================================

async function installNeoForge(mcVersion, rootPath, javaExe, progressCallback) {
  const { spawn } = require('child_process');

  // NeoForge uses a different Maven and a different version scheme starting 1.20.2+
  // For 1.20.1 and below NeoForge does not exist (use Forge instead)
  const match = (mcVersion || '').match(/^1\.(\d+)(?:\.(\d+))?/);
  const minor = match ? parseInt(match[1]) : 0;
  const patch = match && match[2] ? parseInt(match[2]) : 0;

  if (minor < 20 || (minor === 20 && patch <= 1)) {
    // NeoForge doesn't support 1.20.1 and below — fall back to Forge
    console.warn(`[NeoForge] ${mcVersion} not supported, falling back to Forge`);
    return installForge(mcVersion, rootPath, javaExe, progressCallback);
  }

  // NeoForge version format: mcMinor.mcPatch.neoVersion (e.g. 20.4.x for MC 1.20.4)
  const neoMcPrefix = `${minor}.${patch}`;
  const metaUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml`;

  const xmlData = await new Promise((resolve, reject) => {
    https.get(metaUrl, { headers: { 'User-Agent': 'IDKLauncher/1.0' } }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });

  // Parse all <version> tags and find the latest matching this MC minor.patch
  const allVersions = [...xmlData.matchAll(/<version>([^<]+)<\/version>/g)].map(m => m[1]);
  const matching = allVersions.filter(v => v.startsWith(neoMcPrefix + '.'));
  if (matching.length === 0) throw new Error(`No NeoForge builds found for MC ${mcVersion}`);
  const neoVersion = matching[matching.length - 1]; // Latest
  const versionId = `neoforge-${neoVersion}`;

  const versionsDir = path.join(rootPath, 'versions', versionId);
  const versionJson = path.join(versionsDir, `${versionId}.json`);
  if (fs.existsSync(versionJson)) {
    console.log(`[NeoForge] Already installed: ${versionId}`);
    return versionId;
  }

  // PRE-DOWNLOAD vanilla Minecraft so the NeoForge installer can patch it
  progressCallback({ status: `Preparing Minecraft ${mcVersion} for NeoForge...`, percent: 10 });
  await ensureVanillaClient(mcVersion, rootPath, progressCallback);

  // NeoForge installer requires a launcher_profiles.json to exist, or it aborts.
  const profilesPath = path.join(rootPath, 'launcher_profiles.json');
  if (!fs.existsSync(profilesPath)) {
    fs.writeFileSync(profilesPath, JSON.stringify({ profiles: {} }));
  }

  const installerUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${neoVersion}/neoforge-${neoVersion}-installer.jar`;
  const installerPath = path.join(rootPath, `neoforge-installer-${neoVersion}.jar`);

  if (!fs.existsSync(installerPath)) {
    progressCallback({ status: `Downloading NeoForge ${neoVersion} installer...`, percent: 25 });
    await new Promise((resolve, reject) => downloadFile(installerUrl, installerPath, resolve, reject));
  }

  progressCallback({ status: `Installing NeoForge ${neoVersion} (this takes ~1 minute)...`, percent: 40 });
  await new Promise((resolve, reject) => {
    let stderrBuf = '';
    const proc = spawn(javaExe, [
      '-jar', installerPath,
      '--installClient', rootPath
    ], { timeout: 600000 });

    proc.stdout.on('data', d => console.log('[NeoForge]', d.toString().trim()));
    proc.stderr.on('data', d => {
      const txt = d.toString();
      console.error('[NeoForge stderr]', txt.trim());
      stderrBuf += txt;
    });

    proc.on('close', (code) => {
      if (fs.existsSync(versionJson)) {
        resolve();
      } else if (code === 0) {
        resolve();
      } else {
        const lines = stderrBuf.split('\n').filter(l => l.includes('ERROR') || l.includes('Exception') || l.includes('error'));
        const hint = lines[0] || stderrBuf.slice(-300);
        reject(new Error(`NeoForge installer exited with code ${code}.\n${hint}`));
      }
    });

    proc.on('error', (e) => reject(new Error('Failed to start NeoForge installer: ' + e.message)));
  });

  try { fs.unlinkSync(installerPath); } catch(e) {}

  if (!fs.existsSync(versionJson)) throw new Error('NeoForge installation failed — version JSON not found after install.');
  progressCallback({ status: `NeoForge ${neoVersion} installed!`, percent: 65 });
  return versionId;
}

// ============================================================
// === FORGE JVM ARGUMENTS PARSER ==============================
// ============================================================
function getForgeJvmArgs(rootPath, versionId) {
  try {
    if (!versionId) return [];
    const jsonPath = path.join(rootPath, 'versions', versionId, `${versionId}.json`);
    if (!fs.existsSync(jsonPath)) return [];
    
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (!data.arguments || !data.arguments.jvm) return [];
    
    const sep = process.platform === 'win32' ? ';' : ':';
    const libDir = path.join(rootPath, 'libraries').replace(/\\/g, '/');

    return data.arguments.jvm
      .filter(arg => typeof arg === 'string') // Ignore rule-based object args (handled by core if needed)
      .map(arg => {
        return arg
          .replace(/\$\{library_directory\}/g, libDir)
          .replace(/\$\{classpath_separator\}/g, sep)
          .replace(/\$\{version_name\}/g, versionId);
      });
  } catch (e) {
    console.error('[Forge Parser] Failed to parse JVM args:', e);
    return [];
  }
}

// ============================================================
// === QUILT INSTALLER =========================================
// ============================================================
function installQuilt(version, rootPath) {
  return new Promise((resolve, reject) => {
    https.get(`https://meta.quiltmc.org/v3/versions/loader/${version}`,
      { headers: { 'User-Agent': 'IDKLauncher/1.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (!json.length) return reject(new Error('Quilt not available for this MC version.'));
          const loaderVersion = json[0].loader.version;
          const jarName = `quilt-loader-${loaderVersion}-${version}`;
          const versionsPath = path.join(rootPath, 'versions', jarName);
          if (!fs.existsSync(versionsPath)) fs.mkdirSync(versionsPath, { recursive: true });
          const jsonUrl = `https://meta.quiltmc.org/v3/versions/loader/${version}/${loaderVersion}/profile/json`;
          const file = fs.createWriteStream(path.join(versionsPath, `${jarName}.json`));
          https.get(jsonUrl, { headers: { 'User-Agent': 'IDKLauncher/1.0' } }, (r) => {
            r.pipe(file);
            file.on('finish', () => { file.close(); resolve(jarName); });
          }).on('error', reject);
        } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

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
