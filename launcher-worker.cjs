const { parentPort, workerData } = require('worker_threads');
const { Client } = require('minecraft-launcher-core');

async function run() {
  const { opts } = workerData;
  const client = new Client();

  client.on('debug', () => {});
  client.on('progress', (e) => {
    parentPort.postMessage({ type: 'progress', data: e });
  });
  client.on('download-status', (e) => {
    parentPort.postMessage({ type: 'download-status', data: e });
  });
  client.on('data', (e) => {
    parentPort.postMessage({ type: 'data', data: e.toString() });
  });
  client.on('close', () => {
    parentPort.postMessage({ type: 'close' });
  });

  try {
    const mcProcess = await client.launch(opts);
    parentPort.postMessage({ type: 'launched', pid: mcProcess ? mcProcess.pid : null });

    if (mcProcess) {
      mcProcess.on('error', (err) => {
        parentPort.postMessage({ type: 'error', message: err.message });
      });
    }
  } catch (err) {
    parentPort.postMessage({ type: 'launch-error', message: err.message || String(err) });
  }
}

parentPort.on('message', (msg) => {
  if (msg.type === 'kill' && msg.pid) {
    try { process.kill(msg.pid); } catch (_) {}
  }
});

run();
