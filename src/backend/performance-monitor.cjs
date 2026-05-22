/**
 * Performance Monitor
 * 
 * Tracks and monitors performance metrics during downloads.
 * Collects CPU, memory, and network usage data.
 * 
 * Requirements: Performance optimization - monitor metrics
 */

const os = require('os');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      cpuUsage: 0,
      memoryUsage: 0,
      memoryPercent: 0,
      networkUsage: 0,
      fps: 60,
      timestamp: Date.now()
    };
    
    this.history = [];
    this.maxHistorySize = 100;
    this.thresholds = {
      cpuUsageWarning: 50,
      cpuUsageCritical: 80,
      memoryUsageWarning: 300, // MB
      memoryUsageCritical: 500 // MB
    };
  }

  /**
   * Collect current performance metrics
   * 
   * @returns {Object} Current metrics
   */
  collectMetrics() {
    const memUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    
    this.metrics = {
      cpuUsage: this._calculateCPUUsage(),
      memoryUsage: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      memoryPercent: Math.round((totalMemory - freeMemory) / totalMemory * 100),
      networkUsage: 0, // Would need network monitoring library
      fps: 60, // Would need frame rate monitoring
      timestamp: Date.now()
    };
    
    // Add to history
    this.history.push({ ...this.metrics });
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
    
    // Check thresholds
    this._checkThresholds();
    
    return this.metrics;
  }

  /**
   * Get current metrics
   * 
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Get metrics history
   * 
   * @returns {Array<Object>} Historical metrics
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Get average metrics over time
   * 
   * @returns {Object} Average metrics
   */
  getAverageMetrics() {
    if (this.history.length === 0) {
      return this.metrics;
    }
    
    const sum = this.history.reduce((acc, metric) => ({
      cpuUsage: acc.cpuUsage + metric.cpuUsage,
      memoryUsage: acc.memoryUsage + metric.memoryUsage,
      memoryPercent: acc.memoryPercent + metric.memoryPercent
    }), { cpuUsage: 0, memoryUsage: 0, memoryPercent: 0 });
    
    return {
      cpuUsage: Math.round(sum.cpuUsage / this.history.length),
      memoryUsage: Math.round(sum.memoryUsage / this.history.length),
      memoryPercent: Math.round(sum.memoryPercent / this.history.length)
    };
  }

  /**
   * Check if metrics exceed thresholds
   * 
   * @private
   * @returns {Object} Warnings and alerts
   */
  _checkThresholds() {
    const warnings = [];
    
    if (this.metrics.cpuUsage > this.thresholds.cpuUsageCritical) {
      warnings.push({
        level: 'critical',
        metric: 'CPU',
        value: this.metrics.cpuUsage,
        threshold: this.thresholds.cpuUsageCritical,
        message: `Critical CPU usage: ${this.metrics.cpuUsage}%`
      });
    } else if (this.metrics.cpuUsage > this.thresholds.cpuUsageWarning) {
      warnings.push({
        level: 'warning',
        metric: 'CPU',
        value: this.metrics.cpuUsage,
        threshold: this.thresholds.cpuUsageWarning,
        message: `High CPU usage: ${this.metrics.cpuUsage}%`
      });
    }
    
    if (this.metrics.memoryUsage > this.thresholds.memoryUsageCritical) {
      warnings.push({
        level: 'critical',
        metric: 'Memory',
        value: this.metrics.memoryUsage,
        threshold: this.thresholds.memoryUsageCritical,
        message: `Critical memory usage: ${this.metrics.memoryUsage}MB`
      });
    } else if (this.metrics.memoryUsage > this.thresholds.memoryUsageWarning) {
      warnings.push({
        level: 'warning',
        metric: 'Memory',
        value: this.metrics.memoryUsage,
        threshold: this.thresholds.memoryUsageWarning,
        message: `High memory usage: ${this.metrics.memoryUsage}MB`
      });
    }
    
    return warnings;
  }

  /**
   * Calculate CPU usage percentage
   * 
   * @private
   * @returns {number} CPU usage percentage (0-100)
   */
  _calculateCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);
    
    return Math.max(0, Math.min(100, usage));
  }

  /**
   * Set performance thresholds
   * 
   * @param {Object} thresholds - New thresholds
   */
  setThresholds(thresholds) {
    this.thresholds = {
      ...this.thresholds,
      ...thresholds
    };
  }

  /**
   * Reset history
   */
  resetHistory() {
    this.history = [];
  }

  /**
   * Get performance report
   * 
   * @returns {Object} Comprehensive performance report
   */
  getReport() {
    const current = this.getMetrics();
    const average = this.getAverageMetrics();
    
    return {
      current,
      average,
      history: this.getHistory(),
      warnings: this._checkThresholds(),
      timestamp: Date.now()
    };
  }
}

module.exports = PerformanceMonitor;
