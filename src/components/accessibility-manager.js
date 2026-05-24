/**
 * Accessibility Manager
 * 
 * Ensures full keyboard navigation, screen reader support, color contrast,
 * focus indicators, and scalable fonts for the download UI.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

class AccessibilityManager {
  constructor() {
    this.focusableElements = [];
    this.currentFocusIndex = -1;
    this.initialized = false;
    this.liveRegion = null;
    this.announceQueue = [];
    this.isAnnouncing = false;

    // Defer initialization until DOM is ready
    if (typeof document !== 'undefined' && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else if (typeof document !== 'undefined') {
      this.initialize();
    }
  }

  /**
   * Initialize the accessibility manager
   */
  initialize() {
    if (this.initialized) return;
    this.initialized = true;

    this.createLiveRegion();
    this.setupKeyboardNavigation();
    this.setupARIALabels();
    this.setupFocusIndicators();
  }

  /**
   * Create ARIA live region for announcements
   * Requirement 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
   */
  createLiveRegion() {
    if (!this.liveRegion && typeof document !== 'undefined') {
      this.liveRegion = document.createElement('div');
      this.liveRegion.id = 'a11y-live-region';
      this.liveRegion.setAttribute('role', 'status');
      this.liveRegion.setAttribute('aria-live', 'polite');
      this.liveRegion.setAttribute('aria-atomic', 'true');
      this.liveRegion.className = 'sr-only';
      document.body.appendChild(this.liveRegion);
    }
  }

  /**
   * Setup keyboard navigation for download UI
   * Requirement 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
   */
  setupKeyboardNavigation() {
    if (typeof document === 'undefined') return;

    // Listen for keyboard events on the document
    document.addEventListener('keydown', (event) => {
      this.handleKeyboardEvent(event);
    });
  }

  /**
   * Handle keyboard events
   * Requirement 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
   */
  handleKeyboardEvent(event) {
    const container = document.getElementById('download-progress-container');
    if (!container || container.classList.contains('hidden')) {
      return;
    }

    switch (event.key) {
      case 'Tab':
        this.handleTabNavigation(event);
        break;
      case 'Enter':
        this.handleEnterKey(event);
        break;
      case 'Escape':
        this.handleEscapeKey(event);
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        this.handleArrowKeys(event);
        break;
    }
  }

  /**
   * Handle Tab and Shift+Tab navigation
   * Requirement 8.1, 8.2, 8.3
   */
  handleTabNavigation(event) {
    const container = document.getElementById('download-progress-container');
    if (!container) return;

    // Get all focusable elements within the container
    const focusableSelectors = [
      'button:not(:disabled)',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      'input:not(:disabled)',
      '[role="button"]:not([aria-disabled="true"])'
    ];

    const focusableElements = Array.from(
      container.querySelectorAll(focusableSelectors.join(','))
    ).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    if (focusableElements.length === 0) return;

    const currentFocus = document.activeElement;
    const currentIndex = focusableElements.indexOf(currentFocus);

    let nextIndex;
    if (event.shiftKey) {
      // Shift+Tab: move to previous element
      nextIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
    } else {
      // Tab: move to next element
      nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
    }

    event.preventDefault();
    focusableElements[nextIndex].focus();
  }

  /**
   * Handle Enter key activation
   * Requirement 8.4
   */
  handleEnterKey(event) {
    const target = event.target;

    // Check if target is a button or has role="button"
    if (
      target.tagName === 'BUTTON' ||
      target.getAttribute('role') === 'button'
    ) {
      event.preventDefault();
      target.click();
    }
  }

  /**
   * Handle Escape key for cancel
   * Requirement 8.5
   */
  handleEscapeKey(event) {
    const container = document.getElementById('download-progress-container');
    if (!container || container.classList.contains('hidden')) return;

    const cancelBtn = container.querySelector('.download-cancel-btn');
    if (cancelBtn && !cancelBtn.disabled) {
      event.preventDefault();
      cancelBtn.click();
    }
  }

  /**
   * Handle arrow keys for additional navigation
   */
  handleArrowKeys(event) {
    // Arrow keys can be used for additional navigation if needed
    // For now, we'll just prevent default behavior to avoid page scrolling
    const target = event.target;
    if (target.getAttribute('role') === 'progressbar') {
      event.preventDefault();
    }
  }

  /**
   * Setup ARIA labels for all interactive elements
   * Requirement 8.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
   */
  setupARIALabels() {
    if (typeof document === 'undefined') return;

    // Wait for download progress container to be created
    const checkAndSetupLabels = () => {
      const container = document.getElementById('download-progress-container');
      if (!container) {
        setTimeout(checkAndSetupLabels, 100);
        return;
      }

      // Setup ARIA labels for buttons
      const pauseBtn = container.querySelector('.download-pause-btn');
      if (pauseBtn && !pauseBtn.getAttribute('aria-label')) {
        pauseBtn.setAttribute('aria-label', 'Pause download');
      }

      const resumeBtn = container.querySelector('.download-resume-btn');
      if (resumeBtn && !resumeBtn.getAttribute('aria-label')) {
        resumeBtn.setAttribute('aria-label', 'Resume download');
      }

      const cancelBtn = container.querySelector('.download-cancel-btn');
      if (cancelBtn && !cancelBtn.getAttribute('aria-label')) {
        cancelBtn.setAttribute('aria-label', 'Cancel download');
      }

      // Setup ARIA labels for progress bar
      const progressBar = container.querySelector('.progress-bar-fill');
      if (progressBar) {
        progressBar.setAttribute('role', 'progressbar');
        progressBar.setAttribute('aria-valuenow', '0');
        progressBar.setAttribute('aria-valuemin', '0');
        progressBar.setAttribute('aria-valuemax', '100');
        progressBar.setAttribute('aria-label', 'Download progress');
      }

      // Setup ARIA labels for status text
      const statusText = container.querySelector('.download-status-text');
      if (statusText) {
        statusText.setAttribute('role', 'status');
        statusText.setAttribute('aria-live', 'polite');
        statusText.setAttribute('aria-atomic', 'true');
      }

      // Setup ARIA labels for error display
      const errorDisplay = container.querySelector('.download-error-display');
      if (errorDisplay) {
        errorDisplay.setAttribute('role', 'alert');
        errorDisplay.setAttribute('aria-live', 'assertive');
      }

      // Setup ARIA labels for metrics
      const itemsText = container.querySelector('.download-items-text');
      if (itemsText) {
        itemsText.setAttribute('aria-label', 'Items downloaded');
      }

      const percentText = container.querySelector('.download-percent-text');
      if (percentText) {
        percentText.setAttribute('aria-label', 'Download percentage');
      }

      const speedText = container.querySelector('.download-speed-text');
      if (speedText) {
        speedText.setAttribute('aria-label', 'Download speed');
      }

      const etaText = container.querySelector('.download-eta-text');
      if (etaText) {
        etaText.setAttribute('aria-label', 'Estimated time remaining');
      }

      const currentItemText = container.querySelector('.download-current-item-text');
      if (currentItemText) {
        currentItemText.setAttribute('aria-label', 'Currently downloading');
      }
    };

    checkAndSetupLabels();
  }

  /**
   * Setup focus indicators via CSS
   * Requirement 8.6
   */
  setupFocusIndicators() {
    if (typeof document === 'undefined') return;

    // Add focus indicator styles if not already present
    const styleId = 'a11y-focus-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Accessibility: Focus indicators */
        button:focus-visible,
        a:focus-visible,
        input:focus-visible,
        [role="button"]:focus-visible,
        [tabindex]:focus-visible {
          outline: 3px solid var(--theme-accent);
          outline-offset: 2px;
          border-radius: 2px;
        }

        /* Download UI specific focus indicators */
        .download-control-btn:focus-visible {
          outline: 3px solid var(--theme-accent);
          outline-offset: 2px;
          box-shadow: 0 0 0 4px rgba(var(--theme-accent-rgb), 0.2);
        }

        .progress-bar-fill:focus-visible {
          outline: 3px solid var(--theme-accent);
          outline-offset: 2px;
        }

        /* Screen reader only text */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }

        /* High contrast mode support */
        @media (prefers-contrast: more) {
          button:focus-visible,
          a:focus-visible,
          input:focus-visible,
          [role="button"]:focus-visible,
          [tabindex]:focus-visible {
            outline-width: 4px;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Announce message to screen readers
   * Requirement 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
   */
  announceToScreenReader(message, priority = 'polite') {
    if (!this.liveRegion) {
      this.createLiveRegion();
    }

    // Queue announcements to avoid overlapping
    this.announceQueue.push({ message, priority });
    this.processAnnounceQueue();
  }

  /**
   * Process announcement queue
   */
  processAnnounceQueue() {
    if (this.isAnnouncing || this.announceQueue.length === 0) {
      return;
    }

    this.isAnnouncing = true;
    const { message, priority } = this.announceQueue.shift();

    if (this.liveRegion) {
      this.liveRegion.setAttribute('aria-live', priority);
      this.liveRegion.textContent = message;

      // Allow time for screen reader to announce
      setTimeout(() => {
        this.isAnnouncing = false;
        this.processAnnounceQueue();
      }, 1000);
    }
  }

  /**
   * Announce download start
   * Requirement 9.1
   */
  announceDownloadStart(totalItems) {
    this.announceToScreenReader(
      `Download started. ${totalItems} items to download.`,
      'polite'
    );
  }

  /**
   * Announce progress update
   * Requirement 9.2
   */
  announceProgressUpdate(itemsCompleted, totalItems, percentComplete) {
    this.announceToScreenReader(
      `Download progress: ${itemsCompleted} of ${totalItems} items, ${Math.round(percentComplete)}% complete.`,
      'polite'
    );
  }

  /**
   * Announce download completion
   * Requirement 9.3
   */
  announceDownloadComplete() {
    this.announceToScreenReader(
      'Download completed successfully.',
      'polite'
    );
  }

  /**
   * Announce download error
   * Requirement 9.4
   */
  announceDownloadError(errorMessage) {
    this.announceToScreenReader(
      `Download failed: ${errorMessage}`,
      'assertive'
    );
  }

  /**
   * Announce download pause
   * Requirement 9.5
   */
  announceDownloadPause() {
    this.announceToScreenReader(
      'Download paused.',
      'polite'
    );
  }

  /**
   * Announce download resume
   * Requirement 9.6
   */
  announceDownloadResume() {
    this.announceToScreenReader(
      'Download resumed.',
      'polite'
    );
  }

  /**
   * Set font scale for accessibility
   */
  setFontScale(scale) {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.style.fontSize = (16 * scale) + 'px';
  }

  /**
   * Enable high contrast mode
   */
  enableHighContrast(enabled) {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    if (enabled) {
      root.style.setProperty('--text-main', '#ffffff');
      root.style.setProperty('--bg-main', '#000000');
      root.style.setProperty('--accent-green', '#00ff00');
    } else {
      root.style.removeProperty('--text-main');
      root.style.removeProperty('--bg-main');
      root.style.removeProperty('--accent-green');
    }
  }

  /**
   * Check if user prefers reduced motion
   */
  prefersReducedMotion() {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Check if user prefers high contrast
   */
  prefersHighContrast() {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: more)').matches;
  }

  /**
   * Get current accessibility settings
   */
  getAccessibilitySettings() {
    return {
      reducedMotion: this.prefersReducedMotion(),
      highContrast: this.prefersHighContrast(),
      keyboardNavigationEnabled: true,
      screenReaderSupport: true
    };
  }
}

// Export for use in main.js
export const accessibilityManager = new AccessibilityManager();
