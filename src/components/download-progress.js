/**
 * Download Progress UI Component
 * 
 * Manages the download progress display with a state machine approach.
 * Handles real-time progress updates, pause/resume/cancel actions,
 * and displays comprehensive download metrics.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4
 */

import { accessibilityManager } from './accessibility-manager.js';

class DownloadProgressTracker {
  constructor() {
    this.state = 'idle'; // idle, downloading, paused, completed, failed
    this.currentDownloadId = null;
    this.progress = {
      itemsCompleted: 0,
      totalItems: 0,
      bytesCompleted: 0,
      totalBytes: 0,
      currentItem: '',
      percentComplete: 0,
      estimatedTimeRemaining: 0,
      downloadSpeed: 0,
      startTime: null
    };
    
    this.elements = {};
    this.initialized = false;
    
    // Defer initialization until DOM is ready
    if (typeof document !== 'undefined' && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else if (typeof document !== 'undefined') {
      this.initialize();
    }
  }

  /**
   * Initialize the component (called when DOM is ready)
   */
  initialize() {
    if (this.initialized) return;
    this.initialized = true;
    this.initializeElements();
    this.setupEventListeners();
  }

  /**
   * Initialize DOM element references
   * Requirement 2.1, 2.2, 2.3, 2.4, 2.5
   */
  initializeElements() {
    if (!this.initialized || typeof document === 'undefined') return;
    
    // Create or get download progress container
    let container = document.getElementById('download-progress-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'download-progress-container';
      container.className = 'download-progress-container hidden';
      
      // Build the complete HTML structure
      container.innerHTML = `
        <div class="download-status-text" role="status" aria-live="polite" aria-atomic="true">Ready to download</div>
        
        <div class="download-progress-bar-wrapper">
          <div class="progress-bar-background">
            <div class="progress-bar-fill" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" aria-label="Download progress"></div>
          </div>
        </div>
        
        <div class="download-metrics">
          <div class="download-metric">
            <span class="download-metric-label">Items</span>
            <span class="download-metric-value download-items-text">0 of 0</span>
          </div>
          <div class="download-metric">
            <span class="download-metric-label">Progress</span>
            <span class="download-metric-value download-percent-text">0%</span>
          </div>
          <div class="download-metric">
            <span class="download-metric-label">Speed</span>
            <span class="download-metric-value download-speed-text">0 B/s</span>
          </div>
          <div class="download-metric">
            <span class="download-metric-label">ETA</span>
            <span class="download-metric-value download-eta-text">Calculating...</span>
          </div>
        </div>
        
        <div class="download-current-item-text">Waiting to start...</div>
        
        <div class="download-error-display" role="alert" aria-live="assertive"></div>
        
        <div class="download-control-buttons">
          <button class="download-control-btn download-pause-btn" aria-label="Pause download">Pause</button>
          <button class="download-control-btn download-resume-btn" aria-label="Resume download" style="display: none;">Resume</button>
          <button class="download-control-btn download-cancel-btn" aria-label="Cancel download">Cancel</button>
        </div>
      `;
      
      document.body.appendChild(container);
    }

    // Get references to all elements
    this.elements.container = container;
    this.elements.statusText = container.querySelector('.download-status-text');
    this.elements.progressBar = container.querySelector('.progress-bar-fill');
    this.elements.itemsText = container.querySelector('.download-items-text');
    this.elements.percentText = container.querySelector('.download-percent-text');
    this.elements.currentItemText = container.querySelector('.download-current-item-text');
    this.elements.speedText = container.querySelector('.download-speed-text');
    this.elements.etaText = container.querySelector('.download-eta-text');
    this.elements.pauseBtn = container.querySelector('.download-pause-btn');
    this.elements.resumeBtn = container.querySelector('.download-resume-btn');
    this.elements.cancelBtn = container.querySelector('.download-cancel-btn');
    this.elements.errorDisplay = container.querySelector('.download-error-display');

    // Add event listeners to buttons
    this.elements.pauseBtn.addEventListener('click', () => this.pauseDownload());
    this.elements.resumeBtn.addEventListener('click', () => this.resumeDownload());
    this.elements.cancelBtn.addEventListener('click', () => this.cancelDownload());
  }

  /**
   * Setup IPC event listeners
   * Requirement 2.1, 2.2, 2.3, 2.4, 2.5
   */
  setupEventListeners() {
    if (!window.electronAPI) {
      console.warn('electronAPI not available - download progress tracking disabled');
      return;
    }

    const normalizeDownloadEvent = (downloadId, progress) => {
      if (downloadId && typeof downloadId === 'object' && !Array.isArray(downloadId)) {
        return downloadId;
      }
      if (progress && typeof progress === 'object') {
        return { downloadId, ...progress };
      }
      return { downloadId };
    };

    const shouldIgnoreDownload = (downloadId) => {
      const id = typeof downloadId === 'object' && downloadId
        ? downloadId.downloadId
        : downloadId;
      return typeof id === 'string' && id.startsWith('version:');
    };

    // Listen for download progress updates
    window.electronAPI.onDownloadProgress?.((downloadId, progress) => {
      const payload = normalizeDownloadEvent(downloadId, progress);
      if (shouldIgnoreDownload(payload)) return;
      this.updateProgress(payload.downloadId, payload);
    });

    // Listen for download completion
    window.electronAPI.onDownloadComplete?.((downloadId, result) => {
      const payload = normalizeDownloadEvent(downloadId, result);
      if (shouldIgnoreDownload(payload)) return;
      this.completeDownload(payload.downloadId, payload);
    });

    // Listen for download errors
    window.electronAPI.onDownloadError?.((downloadId, error) => {
      const payload = normalizeDownloadEvent(downloadId, error);
      if (shouldIgnoreDownload(payload)) return;
      this.handleDownloadError(payload.downloadId, payload);
    });

    // Listen for pause/resume/cancel events
    window.electronAPI.onDownloadPaused?.((downloadId) => {
      const payload = normalizeDownloadEvent(downloadId);
      if (shouldIgnoreDownload(payload)) return;
      if (payload.downloadId === this.currentDownloadId) {
        this.state = 'paused';
        this.updateUI();
      }
    });

    window.electronAPI.onDownloadResumed?.((downloadId) => {
      const payload = normalizeDownloadEvent(downloadId);
      if (shouldIgnoreDownload(payload)) return;
      if (payload.downloadId === this.currentDownloadId) {
        this.state = 'downloading';
        this.updateUI();
      }
    });

    window.electronAPI.onDownloadCancelled?.((downloadId) => {
      const payload = normalizeDownloadEvent(downloadId);
      if (shouldIgnoreDownload(payload)) return;
      if (payload.downloadId === this.currentDownloadId) {
        this.state = 'cancelled';
        this.reset();
      }
    });
  }

  /**
   * Initialize download session
   * Requirement 2.1, 2.2, 2.3, 2.4, 2.5
   */
  initializeDownload(downloadId, totalItems, totalBytes, updateInterval = 500) {
    // Ensure DOM is initialized
    if (!this.initialized) {
      this.initialize();
    }

    this.currentDownloadId = downloadId;
    this.state = 'downloading';
    this.progress = {
      itemsCompleted: 0,
      totalItems,
      bytesCompleted: 0,
      totalBytes,
      currentItem: '',
      percentComplete: 0,
      estimatedTimeRemaining: 0,
      downloadSpeed: 0,
      startTime: Date.now(),
      lastProgressUpdate: 0,
      updateInterval: updateInterval // Throttle interval in ms
    };

    this.elements.container.classList.remove('hidden');
    this.updateUI();
    
    // Announce to screen readers via accessibility manager
    accessibilityManager.announceDownloadStart(totalItems);
  }

  /**
   * Update progress with new data (throttled)
   * Requirement 2.1, 2.2, 2.3, 2.4, 2.5
   */
  updateProgress(downloadId, progressData) {
    if (downloadId !== this.currentDownloadId) return;

    // Throttle progress updates to reduce UI re-renders
    const now = Date.now();
    const updateInterval = this.progress.updateInterval || 500; // Default 500ms
    
    if (now - this.progress.lastProgressUpdate < updateInterval) {
      // Store pending update but don't render yet
      this.progress.pendingUpdate = progressData;
      return;
    }

    this.progress = {
      ...this.progress,
      ...progressData,
      lastProgressUpdate: now
    };

    this.updateUI();
  }

  /**
   * Update UI elements with current progress
   * Requirement 2.1, 2.2, 2.3, 2.4, 2.5
   */
  updateUI() {
    // Update progress bar
    const percent = Math.min(100, Math.max(0, this.progress.percentComplete));
    this.elements.progressBar.style.width = percent + '%';
    this.elements.progressBar.setAttribute('aria-valuenow', Math.round(percent));

    // Update items text (Requirement 2.1)
    this.elements.itemsText.textContent = 
      `${this.progress.itemsCompleted} of ${this.progress.totalItems}`;

    // Update percentage text (Requirement 2.2)
    this.elements.percentText.textContent = `${Math.round(percent)}%`;

    // Update current item text (Requirement 2.3)
    this.elements.currentItemText.textContent = 
      this.progress.currentItem || 'Preparing...';

    // Update speed text (Requirement 2.4)
    this.elements.speedText.textContent = this.formatSpeed(this.progress.downloadSpeed);

    // Update ETA text (Requirement 2.5)
    this.elements.etaText.textContent = this.formatETA(this.progress.estimatedTimeRemaining);

    // Update status text
    const statusMap = {
      downloading: 'Downloading...',
      paused: 'Download paused',
      completed: 'Download completed',
      failed: 'Download failed'
    };
    this.elements.statusText.textContent = statusMap[this.state] || 'Downloading...';
  }

  /**
   * Format download speed for display
   * Requirement 2.4
   */
  formatSpeed(bytesPerSecond) {
    if (bytesPerSecond === 0) return '0 B/s';
    
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let size = bytesPerSecond;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Format ETA for display
   * Requirement 2.5
   */
  formatETA(milliseconds) {
    if (milliseconds <= 0 || !isFinite(milliseconds)) {
      return 'Calculating...';
    }

    const seconds = Math.floor(milliseconds / 1000);
    
    if (seconds < 60) {
      return `${seconds}s remaining`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ${seconds % 60}s remaining`;
    }

    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m remaining`;
  }

  /**
   * Pause download
   * Requirement 3.3
   */
  async pauseDownload() {
    if (this.state !== 'downloading') return;

    this.state = 'paused';
    this.elements.pauseBtn.style.display = 'none';
    this.elements.resumeBtn.style.display = 'inline-block';
    this.elements.statusText.textContent = 'Download paused';
    
    // Announce to screen readers via accessibility manager
    accessibilityManager.announceDownloadPause();

    try {
      await window.electronAPI.pauseDownload?.(this.currentDownloadId);
    } catch (error) {
      console.error('Failed to pause download:', error);
      this.showError('Failed to pause download');
    }
  }

  /**
   * Resume download
   * Requirement 3.4
   */
  async resumeDownload() {
    if (this.state !== 'paused') return;

    this.state = 'downloading';
    this.elements.pauseBtn.style.display = 'inline-block';
    this.elements.resumeBtn.style.display = 'none';
    this.elements.statusText.textContent = 'Downloading...';
    
    // Announce to screen readers via accessibility manager
    accessibilityManager.announceDownloadResume();

    try {
      await window.electronAPI.resumeDownload?.(this.currentDownloadId);
    } catch (error) {
      console.error('Failed to resume download:', error);
      this.showError('Failed to resume download');
    }
  }

  /**
   * Cancel download with confirmation
   * Requirement 3.5, 4.1
   */
  async cancelDownload() {
    const confirmed = confirm(
      'Are you sure you want to cancel this download? Partial files will be kept for resume.'
    );

    if (!confirmed) return;

    this.state = 'cancelled';
    this.elements.pauseBtn.disabled = true;
    this.elements.resumeBtn.disabled = true;
    this.elements.cancelBtn.disabled = true;
    
    // Announce to screen readers via accessibility manager
    accessibilityManager.announceToScreenReader('Download cancelled.', 'polite');

    try {
      await window.electronAPI.cancelDownload?.(this.currentDownloadId);
      this.reset();
    } catch (error) {
      console.error('Failed to cancel download:', error);
      this.showError('Failed to cancel download');
    }
  }

  /**
   * Complete download
   * Requirement 4.2
   */
  completeDownload(downloadId, result) {
    if (downloadId !== this.currentDownloadId) return;

    this.state = 'completed';
    this.elements.pauseBtn.disabled = true;
    this.elements.resumeBtn.disabled = true;
    this.elements.cancelBtn.disabled = true;
    this.elements.statusText.textContent = 'Download completed successfully';
    this.elements.progressBar.style.width = '100%';
    this.elements.progressBar.setAttribute('aria-valuenow', '100');

    // Announce to screen readers via accessibility manager
    accessibilityManager.announceDownloadComplete();

    // Auto-hide after 3 seconds
    setTimeout(() => this.reset(), 3000);
  }

  /**
   * Fail download
   * Requirement 4.3, 4.4
   */
  failDownload(downloadId, error) {
    if (downloadId !== this.currentDownloadId) return;

    this.state = 'failed';
    this.elements.pauseBtn.disabled = true;
    this.elements.resumeBtn.disabled = true;
    this.elements.cancelBtn.disabled = true;
    this.elements.statusText.textContent = 'Download failed';

    this.showError(error.message || 'An unknown error occurred');
    
    // Announce to screen readers via accessibility manager
    accessibilityManager.announceDownloadError(error.message || 'An unknown error occurred');
  }

  /**
   * Handle download errors with specific error types
   * Requirement 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
   */
  handleDownloadError(downloadId, error) {
    if (downloadId !== this.currentDownloadId) return;

    // Map error types to user-friendly messages
    const errorMessages = {
      'network-timeout': {
        title: 'Network Timeout',
        message: 'The download took too long. Check your internet connection and try again.',
        icon: '\u23F1\uFE0F'
      },
      'checksum-mismatch': {
        title: 'File Corrupted',
        message: 'The downloaded file is corrupted. The file will be re-downloaded automatically.',
        icon: '\u26A0\uFE0F'
      },
      'disk-space-error': {
        title: 'Insufficient Disk Space',
        message: 'Not enough disk space to complete the download. Free up space and try again.',
        icon: '\uD83D\uDCBE'
      },
      'invalid-url': {
        title: 'Invalid URL',
        message: 'The download URL is invalid or inaccessible. Please check the URL and try again.',
        icon: '\uD83D\uDD17'
      },
      'permission-denied': {
        title: 'Permission Denied',
        message: 'Cannot write to the download directory. Check folder permissions and try again.',
        icon: '\uD83D\uDD12'
      },
      'download-failed': {
        title: 'Download Failed',
        message: 'One or more items failed to download. Check your connection and try again.',
        icon: '\u274C'
      },
      'item-failed': {
        title: 'Item Download Failed',
        message: `Failed to download: ${error.itemName || 'unknown item'}. ${error.error || 'Unknown error'}`,
        icon: '\u274C'
      },
      'integrity-verification-failed': {
        title: 'Integrity Verification Failed',
        message: `${error.report?.failedItems || 0} files are corrupted and ${error.report?.missingItems || 0} files are missing. Attempting to re-download...`,
        icon: '\uD83D\uDD0D'
      },
      'verification-error': {
        title: 'Verification Error',
        message: 'An error occurred while verifying downloaded files. Please try again.',
        icon: '\u26A0\uFE0F'
      },
      'finalization-error': {
        title: 'Finalization Error',
        message: 'An error occurred while finalizing the download. Please try again.',
        icon: '\u26A0\uFE0F'
      }
    };

    const errorInfo = errorMessages[error.type] || {
      title: 'Download Error',
      message: error.message || 'An unknown error occurred',
      icon: '\u274C'
    };

    // Build detailed error message
    let detailedMessage = `${errorInfo.icon} ${errorInfo.title}\n${errorInfo.message}`;
    
    if (error.details) {
      detailedMessage += '\n\nDetails:';
      if (Array.isArray(error.details)) {
        error.details.forEach(detail => {
          detailedMessage += `\n\u2022 ${detail.itemName || detail.itemId}: ${detail.error}`;
        });
      }
    }

    this.showError(detailedMessage);
    
    // Announce to screen readers
    accessibilityManager.announceDownloadError(`${errorInfo.title}: ${errorInfo.message}`);

    // Don't mark as failed if it's a retryable error
    if (error.type !== 'integrity-verification-failed' && error.type !== 'item-failed') {
      this.state = 'failed';
      this.elements.pauseBtn.disabled = true;
      this.elements.resumeBtn.disabled = true;
      this.elements.cancelBtn.disabled = true;
      this.elements.statusText.textContent = 'Download failed';
    }
  }

  /**
   * Show error message with visual indicators
   * Requirement 12.6
   */
  showError(message) {
    this.elements.errorDisplay.innerHTML = `
      <div class="error-content">
        <div class="error-icon">\u26A0\uFE0F</div>
        <div class="error-text">${this._escapeHtml(message)}</div>
        <button class="error-close-btn" aria-label="Close error message">&times;</button>
      </div>
    `;
    this.elements.errorDisplay.classList.add('visible');

    // Add close button handler
    const closeBtn = this.elements.errorDisplay.querySelector('.error-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideError());
    }
  }

  /**
   * Escape HTML to prevent XSS
   * @private
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Hide error message
   */
  hideError() {
    this.elements.errorDisplay.classList.remove('visible');
    this.elements.errorDisplay.textContent = '';
  }

  /**
   * Reset download UI
   */
  reset() {
    this.state = 'idle';
    this.currentDownloadId = null;
    this.progress = {
      itemsCompleted: 0,
      totalItems: 0,
      bytesCompleted: 0,
      totalBytes: 0,
      currentItem: '',
      percentComplete: 0,
      estimatedTimeRemaining: 0,
      downloadSpeed: 0,
      startTime: null
    };

    this.elements.container.classList.add('hidden');
    this.elements.progressBar.style.width = '0%';
    this.elements.pauseBtn.disabled = false;
    this.elements.resumeBtn.disabled = false;
    this.elements.cancelBtn.disabled = false;
    this.elements.pauseBtn.style.display = 'inline-block';
    this.elements.resumeBtn.style.display = 'none';
    this.hideError();
  }

  /**
   * Get current progress state
   */
  getProgressState(downloadId) {
    if (downloadId !== this.currentDownloadId) {
      return null;
    }

    return {
      state: this.state,
      progress: { ...this.progress }
    };
  }

  /**
   * Format progress text
   */
  formatProgress(completed, total) {
    return `${completed} of ${total} items`;
  }
}

// Export for use in main.js
export const downloadProgressTracker = new DownloadProgressTracker();
