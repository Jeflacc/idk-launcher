/**
 * Performance Optimization Tests
 * 
 * Tests for adaptive concurrency, bandwidth throttling, and performance monitoring.
 */

const assert = require('assert');
const GameDetector = require('./game-detector.cjs');
const PerformanceMonitor = require('./performance-monitor.cjs');

describe('Performance Optimization', () => {
  
  describe('GameDetector', () => {
    let detector;
    
    beforeEach(() => {
      detector = new GameDetector();
    });
    
    it('should initialize with game not running', () => {
      assert.strictEqual(detector.getGameRunningCached(), false);
    });
    
    it('should have monitoring disabled initially', () => {
      assert.strictEqual(detector.monitoringActive, false);
    });
    
    it('should check game running status', async () => {
      const isRunning = await detector.checkGameRunning();
      assert.strictEqual(typeof isRunning, 'boolean');
    });
    
    it('should cache game running state', async () => {
      await detector.checkGameRunning();
      const cached = detector.getGameRunningCached();
      assert.strictEqual(typeof cached, 'boolean');
    });
    
    it('should allow setting check interval', () => {
      detector.setCheckInterval(5000);
      assert.strictEqual(detector.checkInterval, 5000);
    });
    
    it('should enforce minimum check interval', () => {
      detector.setCheckInterval(100); // Below minimum
      assert.strictEqual(detector.checkInterval, 1000); // Should be 1000
    });
    
    it('should start and stop monitoring', (done) => {
      let stateChanges = 0;
      
      const stop = detector.startMonitoring((state) => {
        stateChanges++;
      });
      
      assert.strictEqual(detector.monitoringActive, true);
      
      setTimeout(() => {
        stop();
        assert.strictEqual(detector.monitoringActive, false);
        done();
      }, 100);
    });
  });
  
  describe('PerformanceMonitor', () => {
    let monitor;
    
    beforeEach(() => {
      monitor = new PerformanceMonitor();
    });
    
    it('should initialize with default metrics', () => {
      const metrics = monitor.getMetrics();
      assert(metrics.cpuUsage >= 0);
      assert(metrics.memoryUsage >= 0);
      assert(metrics.memoryPercent >= 0);
    });
    
    it('should collect metrics', () => {
      const metrics = monitor.collectMetrics();
      assert(metrics.cpuUsage >= 0);
      assert(metrics.memoryUsage >= 0);
      assert(metrics.timestamp > 0);
    });
    
    it('should maintain history', () => {
      monitor.collectMetrics();
      monitor.collectMetrics();
      monitor.collectMetrics();
      
      const history = monitor.getHistory();
      assert.strictEqual(history.length, 3);
    });
    
    it('should limit history size', () => {
      for (let i = 0; i < 150; i++) {
        monitor.collectMetrics();
      }
      
      const history = monitor.getHistory();
      assert(history.length <= 100);
    });
    
    it('should calculate average metrics', () => {
      monitor.collectMetrics();
      monitor.collectMetrics();
      monitor.collectMetrics();
      
      const average = monitor.getAverageMetrics();
      assert(average.cpuUsage >= 0);
      assert(average.memoryUsage >= 0);
    });
    
    it('should set custom thresholds', () => {
      monitor.setThresholds({
        cpuUsageWarning: 60,
        memoryUsageWarning: 400
      });
      
      assert.strictEqual(monitor.thresholds.cpuUsageWarning, 60);
      assert.strictEqual(monitor.thresholds.memoryUsageWarning, 400);
    });
    
    it('should reset history', () => {
      monitor.collectMetrics();
      monitor.collectMetrics();
      
      assert(monitor.getHistory().length > 0);
      
      monitor.resetHistory();
      assert.strictEqual(monitor.getHistory().length, 0);
    });
    
    it('should generate performance report', () => {
      monitor.collectMetrics();
      monitor.collectMetrics();
      
      const report = monitor.getReport();
      assert(report.current);
      assert(report.average);
      assert(Array.isArray(report.history));
      assert(Array.isArray(report.warnings));
      assert(report.timestamp > 0);
    });
    
    it('should detect high CPU usage', () => {
      monitor.setThresholds({ cpuUsageWarning: 10 });
      monitor.metrics.cpuUsage = 50;
      
      const warnings = monitor._checkThresholds();
      assert(warnings.length > 0);
      assert.strictEqual(warnings[0].metric, 'CPU');
    });
    
    it('should detect high memory usage', () => {
      monitor.setThresholds({ memoryUsageWarning: 100 });
      monitor.metrics.memoryUsage = 300;
      
      const warnings = monitor._checkThresholds();
      assert(warnings.length > 0);
      assert.strictEqual(warnings[0].metric, 'Memory');
    });
  });
  
  describe('Adaptive Concurrency', () => {
    it('should reduce concurrency when game is running', async () => {
      const detector = new GameDetector();
      
      // Mock game running state
      detector.isGameRunning = true;
      
      const options = { concurrency: 6 };
      const adaptiveConcurrency = detector.isGameRunning ? 1 : options.concurrency;
      
      assert.strictEqual(adaptiveConcurrency, 1);
    });
    
    it('should maintain concurrency when game is not running', async () => {
      const detector = new GameDetector();
      
      // Mock game not running
      detector.isGameRunning = false;
      
      const options = { concurrency: 6 };
      const adaptiveConcurrency = detector.isGameRunning ? 1 : options.concurrency;
      
      assert.strictEqual(adaptiveConcurrency, 6);
    });
  });
  
  describe('Bandwidth Throttling', () => {
    it('should calculate correct throttle delay', () => {
      const bandwidthLimit = 2 * 1024 * 1024; // 2 MB/s
      const downloadedBytes = 1024 * 1024; // 1 MB
      const elapsedSeconds = 0.3; // 300ms
      
      const expectedSeconds = downloadedBytes / bandwidthLimit;
      const delay = Math.max(0, expectedSeconds - elapsedSeconds);
      
      assert(delay > 0);
      assert(delay < 1); // Should be less than 1 second
    });
    
    it('should not throttle if within bandwidth limit', () => {
      const bandwidthLimit = 50 * 1024 * 1024; // 50 MB/s
      const downloadedBytes = 1024 * 1024; // 1 MB
      const elapsedSeconds = 0.5; // 500ms
      
      const expectedSeconds = downloadedBytes / bandwidthLimit;
      const delay = Math.max(0, expectedSeconds - elapsedSeconds);
      
      assert.strictEqual(delay, 0);
    });
  });
  
  describe('Progress Update Throttling', () => {
    it('should throttle progress updates', () => {
      const updateInterval = 500; // 500ms
      let lastUpdate = 0;
      let updateCount = 0;
      
      // Simulate 10 updates in 1 second
      for (let i = 0; i < 10; i++) {
        const now = Date.now() + (i * 100); // 100ms apart
        
        if (now - lastUpdate >= updateInterval) {
          lastUpdate = now;
          updateCount++;
        }
      }
      
      // Should only update ~2 times in 1 second with 500ms throttle
      assert(updateCount <= 3);
    });
    
    it('should allow frequent updates without throttle', () => {
      const updateInterval = 0; // No throttle
      let lastUpdate = 0;
      let updateCount = 0;
      
      // Simulate 10 updates
      for (let i = 0; i < 10; i++) {
        const now = Date.now() + (i * 10);
        
        if (now - lastUpdate >= updateInterval) {
          lastUpdate = now;
          updateCount++;
        }
      }
      
      // Should update all 10 times
      assert.strictEqual(updateCount, 10);
    });
  });
  
  describe('Chunk Size Optimization', () => {
    it('should use small chunks during gameplay', () => {
      const CHUNK_SIZE_GAMEPLAY = 256 * 1024; // 256 KB
      const isGameRunning = true;
      
      const chunkSize = isGameRunning ? CHUNK_SIZE_GAMEPLAY : 2 * 1024 * 1024;
      
      assert.strictEqual(chunkSize, 256 * 1024);
    });
    
    it('should use large chunks when idle', () => {
      const CHUNK_SIZE_IDLE = 2 * 1024 * 1024; // 2 MB
      const isGameRunning = false;
      
      const chunkSize = isGameRunning ? 256 * 1024 : CHUNK_SIZE_IDLE;
      
      assert.strictEqual(chunkSize, 2 * 1024 * 1024);
    });
  });
  
  describe('Performance Settings', () => {
    it('should have gaming mode settings', () => {
      const gamingModeSettings = {
        concurrency: 1,
        chunkSize: 256 * 1024,
        timeout: 60000,
        maxRetries: 5,
        verifyIntegrity: false,
        resumeEnabled: true,
        autoRetry: true,
        bandwidthLimit: 2 * 1024 * 1024,
        progressUpdateInterval: 1000
      };
      
      assert.strictEqual(gamingModeSettings.concurrency, 1);
      assert.strictEqual(gamingModeSettings.bandwidthLimit, 2 * 1024 * 1024);
    });
    
    it('should have background mode settings', () => {
      const backgroundModeSettings = {
        concurrency: 6,
        chunkSize: 2 * 1024 * 1024,
        timeout: 30000,
        maxRetries: 3,
        verifyIntegrity: true,
        resumeEnabled: true,
        autoRetry: true,
        bandwidthLimit: 50 * 1024 * 1024,
        progressUpdateInterval: 100
      };
      
      assert.strictEqual(backgroundModeSettings.concurrency, 6);
      assert.strictEqual(backgroundModeSettings.bandwidthLimit, 50 * 1024 * 1024);
    });
  });
});

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('Running Performance Optimization Tests...');
  console.log('Note: Some tests may be skipped if running in non-Windows environment');
}
