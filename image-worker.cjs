const { parentPort } = require('worker_threads');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

parentPort.on('message', async (task) => {
  const { url, cacheDir } = task;
  
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  // Generate lightweight hash for filename
  const hash = crypto.createHash('md5').update(url).digest('hex');
  const cachePath = path.join(cacheDir, hash);

  if (fs.existsSync(cachePath)) {
    parentPort.postMessage({ url, cachePath, success: true, cached: true });
    return;
  }

  try {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(cachePath);
    
    client.get(url, { headers: { 'User-Agent': 'Indkingdom-Launcher' } }, (res) => {
      if (res.statusCode !== 200) {
        fs.unlink(cachePath, () => {});
        parentPort.postMessage({ url, error: `Status ${res.statusCode}`, success: false });
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        parentPort.postMessage({ url, cachePath, success: true, cached: false });
      });
    }).on('error', (err) => {
      fs.unlink(cachePath, () => {});
      parentPort.postMessage({ url, error: err.message, success: false });
    });
  } catch (err) {
    parentPort.postMessage({ url, error: err.message, success: false });
  }
});
