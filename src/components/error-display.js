/**
 * Error Display Component
 * 
 * Displays download and system errors with clear visual indicators,
 * actionable messages, and recovery options.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */

class ErrorDisplay {
  constructor() {
    this.container = null;
    this.initialized = false;
    this.errorQueue = [];
    this.currentError = null;

    // Defer initialization until DOM is ready
    if (typeof document !== 'undefined' && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else if (typeof document !== 'undefined') {
      this.initialize();
    }
  }

  /**
   * Initialize the error display component
   */
  initialize() {
    if (this.initialized) return;
    this.initialized = true;
    this.createErrorContainer();
    this.setupEventListeners();
  }

  /**
   * Create error display container
   */
  createErrorContainer() {
    if (!this.container && typeof document !== 'undefined') {
      this.container = document.createElement('div');
      this.container.id = 'error-display-container';
      this.container.className = 'error-display-container hidden';
      this.container.setAttribute('role', 'alert');
      this.container.setAttribute('aria-live', 'assertive');
      this.container.setAttribute('aria-atomic', 'true');

      this.container.innerHTML = `
        <div class="error-display-content">
          <div class="error-display-header">
            <div class="error-display-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div class="error-display-title">Error</div>
            <button class="error-display-close" aria-label="Close error message">&times;</button>
          </div>
          <div class="error-display-message"></div>
          <div class="error-display-details"></div>
          <div class="error-display-actions"></div>
        </div>
      `;

      document.body.appendChild(this.container);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    if (!this.container) return;

    const closeBtn = this.container.querySelector('.error-display-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.dismiss());
    }

    // Listen for download errors from IPC
    if (window.electronAPI) {
      window.electronAPI.onDownloadError?.((downloadId, error) => {
        this.showError({
          type: error.type || 'DOWNLOAD_ERROR',
          title: this._getErrorTitle(error.type),
          message: error.message,
          downloadId: downloadId,
          originalError: error.originalError,
          actions: this._getErrorActions(error.type, downloadId)
        });
      });
    }
  }

  /**
   * Show an error
   * 
   * @param {Object} errorInfo - Error information
   */
  showError(errorInfo) {
    if (!this.initialized) {
      this.initialize();
    }

    this.errorQueue.push(errorInfo);
    this._displayNextError();
  }

  /**
   * Display next error in queue
   * 
   * @private
   */
  _displayNextError() {
    if (this.errorQueue.length === 0 || this.currentError) {
      return;
    }

    this.currentError = this.errorQueue.shift();
    this._renderError(this.currentError);
  }

  /**
   * Render error in the container
   * 
   * @private
   */
  _renderError(errorInfo) {
    if (!this.container) return;

    // Update title
    const title = this.container.querySelector('.error-display-title');
    if (title) {
      title.textContent = errorInfo.title || 'Error';
    }

    // Update icon based on error type
    const icon = this.container.querySelector('.error-display-icon');
    if (icon) {
      icon.className = `error-display-icon error-type-${errorInfo.type.toLowerCase()}`;
      icon.innerHTML = this._getErrorIcon(errorInfo.type);
    }

    // Update message
    const message = this.container.querySelector('.error-display-message');
    if (message) {
      message.textContent = errorInfo.message;
    }

    // Update details if available
    const details = this.container.querySelector('.error-display-details');
    if (details) {
      if (errorInfo.details) {
        details.innerHTML = `<div class="error-display-detail-item">${errorInfo.details}</div>`;
        details.style.display = 'block';
      } else {
        details.style.display = 'none';
      }
    }

    // Update actions
    const actions = this.container.querySelector('.error-display-actions');
    if (actions) {
      actions.innerHTML = '';
      if (errorInfo.actions && errorInfo.actions.length > 0) {
        errorInfo.actions.forEach(action => {
          const btn = document.createElement('button');
          btn.className = `error-action-btn ${action.type || 'secondary'}`;
          btn.textContent = action.label;
          btn.addEventListener('click', () => {
            action.callback?.();
            this.dismiss();
          });
          actions.appendChild(btn);
        });
        actions.style.display = 'flex';
      } else {
        actions.style.display = 'none';
      }
    }

    // Show container
    this.container.classList.remove('hidden');

    // Auto-dismiss after 10 seconds if no actions
    if (!errorInfo.actions || errorInfo.actions.length === 0) {
      setTimeout(() => this.dismiss(), 10000);
    }
  }

  /**
   * Dismiss current error
   */
  dismiss() {
    if (this.container) {
      this.container.classList.add('hidden');
    }
    this.currentError = null;
    this._displayNextError();
  }

  /**
   * Get error title based on type
   * 
   * @private
   */
  _getErrorTitle(errorType) {
    const titles = {
      'NETWORK_ERROR': 'Network Error',
      'CHECKSUM_MISMATCH': 'Integrity Verification Failed',
      'DISK_SPACE': 'Insufficient Disk Space',
      'INVALID_URL': 'Invalid Download URL',
      'PERMISSION_DENIED': 'Permission Denied',
      'TIMEOUT': 'Download Timeout',
      'DOWNLOAD_ERROR': 'Download Failed'
    };
    return titles[errorType] || 'Error';
  }

  /**
   * Get error icon SVG based on type
   * 
   * @private
   */
  _getErrorIcon(errorType) {
    const icons = {
      'NETWORK_ERROR': `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2M3 11l2 2c3.9-3.9 10.2-3.9 14.2 0l2-2M9 5l2 2c1.96-1.96 5.04-1.96 7 0l2-2"></path>
          <line x1="12" y1="20" x2="12" y2="20"></line>
        </svg>
      `,
      'CHECKSUM_MISMATCH': `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>
        </svg>
      `,
      'DISK_SPACE': `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <line x1="3.27" y1="6.96" x2="12" y2="12.01"></line>
          <line x1="12" y1="12.01" x2="20.73" y2="6.96"></line>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
      `,
      'INVALID_URL': `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      `,
      'PERMISSION_DENIED': `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
        </svg>
      `,
      'TIMEOUT': `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      `
    };
    return icons[errorType] || icons['DOWNLOAD_ERROR'];
  }

  /**
   * Get error actions based on type
   * 
   * @private
   */
  _getErrorActions(errorType, downloadId) {
    const actions = {
      'NETWORK_ERROR': [
        {
          label: 'Retry Download',
          type: 'primary',
          callback: () => {
            if (window.electronAPI) {
              window.electronAPI.resumeDownload?.(downloadId);
            }
          }
        },
        {
          label: 'Dismiss',
          type: 'secondary',
          callback: () => {}
        }
      ],
      'CHECKSUM_MISMATCH': [
        {
          label: 'Re-download',
          type: 'primary',
          callback: () => {
            if (window.electronAPI) {
              window.electronAPI.resumeDownload?.(downloadId);
            }
          }
        },
        {
          label: 'Cancel',
          type: 'secondary',
          callback: () => {
            if (window.electronAPI) {
              window.electronAPI.cancelDownload?.(downloadId);
            }
          }
        }
      ],
      'DISK_SPACE': [
        {
          label: 'Free Up Space',
          type: 'primary',
          callback: () => {
            if (window.electronAPI) {
              window.electronAPI.openMinecraftFolder?.();
            }
          }
        },
        {
          label: 'Cancel Download',
          type: 'secondary',
          callback: () => {
            if (window.electronAPI) {
              window.electronAPI.cancelDownload?.(downloadId);
            }
          }
        }
      ],
      'INVALID_URL': [
        {
          label: 'Dismiss',
          type: 'secondary',
          callback: () => {}
        }
      ],
      'PERMISSION_DENIED': [
        {
          label: 'Retry',
          type: 'primary',
          callback: () => {
            if (window.electronAPI) {
              window.electronAPI.resumeDownload?.(downloadId);
            }
          }
        },
        {
          label: 'Cancel',
          type: 'secondary',
          callback: () => {
            if (window.electronAPI) {
              window.electronAPI.cancelDownload?.(downloadId);
            }
          }
        }
      ]
    };
    return actions[errorType] || [];
  }

  /**
   * Show network error
   */
  showNetworkError(message, downloadId) {
    this.showError({
      type: 'NETWORK_ERROR',
      title: 'Network Error',
      message: message || 'Network connection failed. Please check your internet connection.',
      downloadId: downloadId,
      actions: this._getErrorActions('NETWORK_ERROR', downloadId)
    });
  }

  /**
   * Show checksum mismatch error
   */
  showChecksumError(message, downloadId) {
    this.showError({
      type: 'CHECKSUM_MISMATCH',
      title: 'Integrity Verification Failed',
      message: message || 'Downloaded files failed integrity verification.',
      downloadId: downloadId,
      actions: this._getErrorActions('CHECKSUM_MISMATCH', downloadId)
    });
  }

  /**
   * Show disk space error
   */
  showDiskSpaceError(requiredSpace, downloadId) {
    this.showError({
      type: 'DISK_SPACE',
      title: 'Insufficient Disk Space',
      message: `Not enough disk space. Required: ${requiredSpace}`,
      downloadId: downloadId,
      actions: this._getErrorActions('DISK_SPACE', downloadId)
    });
  }

  /**
   * Show invalid URL error
   */
  showInvalidUrlError(url, downloadId) {
    this.showError({
      type: 'INVALID_URL',
      title: 'Invalid Download URL',
      message: `The download URL is invalid or inaccessible: ${url}`,
      downloadId: downloadId,
      actions: this._getErrorActions('INVALID_URL', downloadId)
    });
  }

  /**
   * Show permission error
   */
  showPermissionError(message, downloadId) {
    this.showError({
      type: 'PERMISSION_DENIED',
      title: 'Permission Denied',
      message: message || 'Permission denied. Check file permissions and try again.',
      downloadId: downloadId,
      actions: this._getErrorActions('PERMISSION_DENIED', downloadId)
    });
  }
}

// Export for use in main.js
export const errorDisplay = new ErrorDisplay();
