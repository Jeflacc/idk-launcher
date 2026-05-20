/**
 * Game Detector
 * 
 * Detects if Minecraft is currently running by checking for javaw.exe process.
 * Used for adaptive performance optimization during gameplay.
 * 
 * Requirements: Performance optimization - detect game running state
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class GameDetector {
  constructor() {
    this.isGameRunning = false;
    this.lastCheckTime = 0;
    this.checkInterval = 2000; // Check every 2 seconds
    this.monitoringActive = false;
  }

  /**
   * Check if Minecraft (javaw.exe) is currently running
   * 
   * @returns {Promise<boolean>} True if game is running
   */
  async checkGameRunning() {
    try {
      // Use tasklist to check for javaw.exe process
      const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq javaw.exe"');
      
      // If javaw.exe is in the output, the game is running
      const isRunning = stdout.includes('javaw.exe');
      
      // Update cached state
      this.isGameRunning = isRunning;
      this.lastCheckTime = Date.now();
      
      return isRunning;
    } catch (error) {
      // If command fails, assume game is not running
      console.warn('[GameDetector] Error checking game process:', error.message);
      this.isGameRunning = false;
      return false;
    }
  }

  /**
   * Get cached game running state (may be slightly stale)
   * 
   * @returns {boolean} Last known game running state
   */
  getGameRunningCached() {
    return this.isGameRunning;
  }

  /**
   * Start monitoring game state with periodic checks
   * 
   * @param {Function} onStateChange - Callback when game state changes
   * @returns {Function} Stop function to halt monitoring
   */
  startMonitoring(onStateChange) {
    if (this.monitoringActive) {
      return () => this.stopMonitoring();
    }

    this.monitoringActive = true;
    let previousState = this.isGameRunning;

    const monitor = setInterval(async () => {
      try {
        const currentState = await this.checkGameRunning();
        
        // Notify if state changed
        if (currentState !== previousState) {
          console.log(`[GameDetector] Game state changed: ${previousState} -> ${currentState}`);
          previousState = currentState;
          onStateChange?.(currentState);
        }
      } catch (error) {
        console.error('[GameDetector] Monitoring error:', error.message);
      }
    }, this.checkInterval);

    return () => {
      clearInterval(monitor);
      this.monitoringActive = false;
    };
  }

  /**
   * Stop monitoring game state
   */
  stopMonitoring() {
    this.monitoringActive = false;
  }

  /**
   * Set the check interval for monitoring
   * 
   * @param {number} intervalMs - Interval in milliseconds
   */
  setCheckInterval(intervalMs) {
    this.checkInterval = Math.max(1000, intervalMs); // Minimum 1 second
  }
}

module.exports = GameDetector;
