/**
 * Settings Manager
 * 
 * Manages download and integrity settings with persistence, validation,
 * import/export, and category organization.
 * 
 * Responsibilities:
 * - Load and save settings from userData/settings.json
 * - Validate setting values against defined ranges and types
 * - Organize settings by category (Download, Integrity, Performance, Accessibility)
 * - Support search/filter functionality
 * - Reset to defaults
 * - Export/import settings as JSON files
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

class SettingsManager extends EventEmitter {
  constructor(userDataPath) {
    super();
    
    this.userDataPath = userDataPath;
    this.settingsPath = path.join(userDataPath, 'settings.json');
    
    // Define default settings with metadata
    this.defaultSettings = {
      // Download settings
      concurrency: {
        value: 4,
        min: 1,
        max: 10,
        type: 'number',
        category: 'Download',
        label: 'Concurrent Downloads',
        description: 'Number of simultaneous downloads (1-10)',
        tooltip: 'Higher values download faster but use more bandwidth and system resources'
      },
      chunkSize: {
        value: 1048576, // 1MB in bytes
        min: 262144, // 256KB
        max: 10485760, // 10MB
        type: 'number',
        category: 'Download',
        label: 'Chunk Size',
        description: 'Size of each download chunk in bytes (256KB-10MB)',
        tooltip: 'Larger chunks are faster but use more memory. Smaller chunks are more reliable on unstable connections'
      },
      timeout: {
        value: 30000, // 30 seconds in milliseconds
        min: 5000, // 5 seconds
        max: 120000, // 120 seconds
        type: 'number',
        category: 'Download',
        label: 'Request Timeout',
        description: 'HTTP request timeout in milliseconds (5-120 seconds)',
        tooltip: 'Time to wait for a response before timing out. Increase for slow connections'
      },
      maxRetries: {
        value: 3,
        min: 0,
        max: 10,
        type: 'number',
        category: 'Download',
        label: 'Max Retries',
        description: 'Maximum retry attempts per failed item (0-10)',
        tooltip: 'Number of times to retry a failed download before giving up'
      },
      
      // Integrity settings
      verifyIntegrity: {
        value: true,
        type: 'boolean',
        category: 'Integrity',
        label: 'Verify Integrity',
        description: 'Automatically verify downloaded files after completion',
        tooltip: 'Checks file checksums and sizes to ensure downloads are not corrupted'
      },
      resumeEnabled: {
        value: true,
        type: 'boolean',
        category: 'Download',
        label: 'Resume Enabled',
        description: 'Allow resuming interrupted downloads',
        tooltip: 'Saves download progress so you can resume from where you left off'
      },
      autoRetry: {
        value: true,
        type: 'boolean',
        category: 'Download',
        label: 'Auto-Retry',
        description: 'Automatically retry failed downloads',
        tooltip: 'Automatically retries failed downloads up to the max retry limit'
      },
      
      // Performance settings
      enableCompression: {
        value: true,
        type: 'boolean',
        category: 'Performance',
        label: 'Enable Compression',
        description: 'Use gzip compression for downloads',
        tooltip: 'Reduces bandwidth usage but increases CPU usage'
      },
      performanceMode: {
        value: 'adaptive',
        type: 'string',
        category: 'Performance',
        label: 'Performance Mode',
        description: 'How to balance download speed vs game performance',
        tooltip: 'Adaptive mode automatically reduces download speed when game is running',
        options: [
          { value: 'adaptive', label: 'Adaptive (Auto-detect game)' },
          { value: 'gaming', label: 'Gaming Mode (Minimal impact)' },
          { value: 'background', label: 'Background Mode (Maximum speed)' }
        ]
      },
      bandwidthLimitGaming: {
        value: 2097152, // 2 MB/s in bytes
        min: 262144, // 256 KB/s
        max: 10485760, // 10 MB/s
        type: 'number',
        category: 'Performance',
        label: 'Bandwidth Limit (Gaming)',
        description: 'Max download speed during gameplay (bytes/sec)',
        tooltip: 'Lower values reduce game lag. 2 MB/s is recommended'
      },
      bandwidthLimitIdle: {
        value: 52428800, // 50 MB/s in bytes
        min: 1048576, // 1 MB/s
        max: 104857600, // 100 MB/s
        type: 'number',
        category: 'Performance',
        label: 'Bandwidth Limit (Idle)',
        description: 'Max download speed when game is not running (bytes/sec)',
        tooltip: 'Higher values download faster when game is not running'
      },
      progressUpdateInterval: {
        value: 500,
        min: 100,
        max: 2000,
        type: 'number',
        category: 'Performance',
        label: 'Progress Update Interval',
        description: 'UI update frequency in milliseconds',
        tooltip: 'Lower values = more frequent updates but higher CPU usage'
      },
      
      // Accessibility settings
      highContrast: {
        value: false,
        type: 'boolean',
        category: 'Accessibility',
        label: 'High Contrast Mode',
        description: 'Enable high contrast colors for better visibility',
        tooltip: 'Increases color contrast for better readability'
      },
      fontScale: {
        value: 1.0,
        min: 0.8,
        max: 2.0,
        step: 0.1,
        type: 'number',
        category: 'Accessibility',
        label: 'Font Scale',
        description: 'Scale factor for fonts (0.8-2.0)',
        tooltip: 'Adjust font size for better readability'
      },
      
      // Launcher settings
      javaPath: {
        value: '',
        type: 'string',
        category: 'Launcher',
        label: 'Java Executable Path',
        description: 'Provide the absolute path to your javaw.exe file',
        tooltip: 'Leave blank to use system default Java'
      },
      globalJavaArgs: {
        value: '',
        type: 'string',
        category: 'Launcher',
        label: 'Global Java Arguments',
        description: 'Advanced JVM arguments applied to all modpacks',
        tooltip: 'Leave empty for defaults'
      },
      defaultWindowWidth: {
        value: 1024,
        type: 'number',
        category: 'Launcher',
        label: 'Default Window Width',
        description: 'Set the default window width when launching Minecraft',
        tooltip: 'Default width in pixels'
      },
      defaultWindowHeight: {
        value: 768,
        type: 'number',
        category: 'Launcher',
        label: 'Default Window Height',
        description: 'Set the default window height when launching Minecraft',
        tooltip: 'Default height in pixels'
      },
      defaultFullscreen: {
        value: false,
        type: 'boolean',
        category: 'Launcher',
        label: 'Fullscreen',
        description: 'Launch the game in fullscreen mode',
        tooltip: 'Launches Minecraft in fullscreen'
      },
      enableOverlay: {
        value: false,
        type: 'boolean',
        category: 'Launcher',
        label: 'In-Game Overlay',
        description: 'Enable the interactive in-game overlay',
        tooltip: 'Shift+Tab to open in-game overlay'
      },
      maxMemoryGB: {
        value: 4,
        type: 'number',
        category: 'Launcher',
        label: 'Memory Allocation',
        description: 'Set how much RAM Minecraft is allowed to use',
        tooltip: 'More RAM = smoother gameplay'
      },
      launcherPerformanceMode: {
        value: 'balanced',
        type: 'string',
        category: 'Launcher',
        label: 'Launcher Performance',
        description: 'Choose how much animation and background rendering the launcher should use',
        tooltip: 'Quality, balanced, or eco'
      },
      autoOptimization: {
        value: false,
        type: 'boolean',
        category: 'Launcher',
        label: 'Performance Boost Pack',
        description: 'For Fabric launches, install compatible optimization pack when available',
        tooltip: 'Auto-installs Sodium, Lithium, etc.'
      },
      currentUser: {
        value: '',
        type: 'string',
        category: 'Launcher',
        label: 'Current User',
        description: 'Currently logged in username',
        tooltip: 'Offline username'
      },
      authMode: {
        value: 'offline',
        type: 'string',
        category: 'Launcher',
        label: 'Authentication Mode',
        description: 'Method used to log in',
        tooltip: 'offline or elyby'
      },
      elybyData: {
        value: null,
        type: 'object',
        category: 'Launcher',
        label: 'Ely.by Auth Data',
        description: 'Authentication data for Ely.by accounts',
        tooltip: 'Token and profile data for Ely.by'
      },
      lastPlayedVersion: {
        value: '',
        type: 'string',
        category: 'Launcher',
        label: 'Last Played Version',
        description: 'The last played Minecraft version',
        tooltip: 'Auto-selected on launch'
      },
      lastPlayedLoader: {
        value: 'Vanilla',
        type: 'string',
        category: 'Launcher',
        label: 'Last Played Loader',
        description: 'The last played mod loader',
        tooltip: 'Auto-selected on launch'
      },
      versionSettings: {
        value: {},
        type: 'object',
        category: 'Launcher',
        label: 'Version Settings',
        description: 'Loader and settings per version',
        tooltip: 'Stored as an object mapping version ID to config'
      },
      playtime: {
        value: 0,
        type: 'number',
        category: 'Launcher',
        label: 'Playtime',
        description: 'Total playtime in milliseconds',
        tooltip: 'Accumulated playtime'
      }
    };
    
    // Current settings (loaded from disk or defaults)
    this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
  }

  /**
   * Load settings from disk
   * 
   * @returns {Promise<Object>} Loaded settings object
   */
  async loadSettings() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf-8');
        const loaded = JSON.parse(data);
        
        // Merge loaded settings with defaults (in case new settings were added)
        this.settings = this._mergeSettings(loaded);
        console.log('[SettingsManager] Settings loaded from disk');
      } else {
        // Use defaults if file doesn't exist
        this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
        console.log('[SettingsManager] Using default settings');
      }
      
      return this._extractSettingsValues();
    } catch (error) {
      console.error('[SettingsManager] Error loading settings:', error);
      // Fall back to defaults on error
      this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
      return this._extractSettingsValues();
    }
  }

  /**
   * Save settings to disk
   * 
   * @param {Object} newSettings - Settings object with values to save
   * @returns {Promise<void>}
   */
  async saveSettings(newSettings) {
    try {
      // Validate all settings before saving
      for (const [key, value] of Object.entries(newSettings)) {
        const validation = this.validateSetting(key, value);
        if (!validation.valid) {
          throw new Error(`Invalid setting ${key}: ${validation.error}`);
        }
      }
      
      // Update settings
      for (const [key, value] of Object.entries(newSettings)) {
        if (this.settings[key]) {
          this.settings[key].value = value;
        }
      }
      
      // Ensure directory exists
      if (!fs.existsSync(this.userDataPath)) {
        fs.mkdirSync(this.userDataPath, { recursive: true });
      }
      
      // Write to disk
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf-8');
      console.log('[SettingsManager] Settings saved to disk');
      
      this.emit('settings-changed', this._extractSettingsValues());
    } catch (error) {
      console.error('[SettingsManager] Error saving settings:', error);
      throw error;
    }
  }

  /**
   * Reset all settings to defaults
   * 
   * @returns {Promise<void>}
   */
  async resetToDefaults() {
    try {
      this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
      
      // Ensure directory exists
      if (!fs.existsSync(this.userDataPath)) {
        fs.mkdirSync(this.userDataPath, { recursive: true });
      }
      
      // Write defaults to disk
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf-8');
      console.log('[SettingsManager] Settings reset to defaults');
      
      this.emit('settings-changed', this._extractSettingsValues());
    } catch (error) {
      console.error('[SettingsManager] Error resetting settings:', error);
      throw error;
    }
  }

  /**
   * Export settings to a JSON file
   * 
   * @param {string} exportPath - Path where to save the settings file
   * @returns {Promise<void>}
   */
  async exportSettings(exportPath) {
    try {
      const exportData = this._extractSettingsValues();
      fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), 'utf-8');
      console.log('[SettingsManager] Settings exported to:', exportPath);
    } catch (error) {
      console.error('[SettingsManager] Error exporting settings:', error);
      throw error;
    }
  }

  /**
   * Import settings from a JSON file
   * 
   * @param {string} importPath - Path to the settings file to import
   * @returns {Promise<Object>} Imported settings
   */
  async importSettings(importPath) {
    try {
      const data = fs.readFileSync(importPath, 'utf-8');
      const imported = JSON.parse(data);
      
      // Validate all imported settings
      for (const [key, value] of Object.entries(imported)) {
        const validation = this.validateSetting(key, value);
        if (!validation.valid) {
          throw new Error(`Invalid setting in import ${key}: ${validation.error}`);
        }
      }
      
      // Save imported settings
      await this.saveSettings(imported);
      console.log('[SettingsManager] Settings imported from:', importPath);
      
      return this._extractSettingsValues();
    } catch (error) {
      console.error('[SettingsManager] Error importing settings:', error);
      throw error;
    }
  }

  /**
   * Get settings by category
   * 
   * @param {string} category - Category name (Download, Integrity, Performance, Accessibility)
   * @returns {Array<Object>} Settings in the category
   */
  getSettingsByCategory(category) {
    return Object.entries(this.settings)
      .filter(([_, setting]) => setting.category === category)
      .map(([key, setting]) => ({
        key,
        ...setting
      }));
  }

  /**
   * Search settings by keyword
   * 
   * @param {string} query - Search query
   * @returns {Array<Object>} Matching settings
   */
  searchSettings(query) {
    const lowerQuery = query.toLowerCase();
    
    return Object.entries(this.settings)
      .filter(([key, setting]) => {
        const searchText = `${key} ${setting.label} ${setting.description} ${setting.tooltip}`.toLowerCase();
        return searchText.includes(lowerQuery);
      })
      .map(([key, setting]) => ({
        key,
        ...setting
      }));
  }

  /**
   * Validate a setting value
   * 
   * @param {string} key - Setting key
   * @param {*} value - Value to validate
   * @returns {Object} { valid: boolean, error?: string }
   */
  validateSetting(key, value) {
    if (!this.settings[key]) {
      return { valid: false, error: `Unknown setting: ${key}` };
    }
    
    const setting = this.settings[key];
    
    // Type validation
    if (typeof value !== setting.type) {
      return { valid: false, error: `Expected ${setting.type}, got ${typeof value}` };
    }
    
    // Range validation for numbers
    if (setting.type === 'number') {
      if (setting.min !== undefined && value < setting.min) {
        return { valid: false, error: `Value must be at least ${setting.min}` };
      }
      if (setting.max !== undefined && value > setting.max) {
        return { valid: false, error: `Value must be at most ${setting.max}` };
      }
    }
    
    return { valid: true };
  }

  /**
   * Get all settings with metadata
   * 
   * @returns {Object} All settings with metadata
   */
  getAllSettings() {
    return Object.entries(this.settings).map(([key, setting]) => ({
      key,
      ...setting
    }));
  }

  /**
   * Get all categories
   * 
   * @returns {Array<string>} List of unique categories
   */
  getCategories() {
    const categories = new Set();
    Object.values(this.settings).forEach(setting => {
      categories.add(setting.category);
    });
    return Array.from(categories).sort();
  }

  /**
   * Extract just the values from settings (for sending to renderer)
   * 
   * @private
   * @returns {Object} Settings with just key-value pairs
   */
  _extractSettingsValues() {
    const values = {};
    Object.entries(this.settings).forEach(([key, setting]) => {
      values[key] = setting.value;
    });
    return values;
  }

  /**
   * Merge loaded settings with defaults
   * 
   * @private
   * @param {Object} loaded - Loaded settings from disk
   * @returns {Object} Merged settings
   */
  _mergeSettings(loaded) {
    const merged = JSON.parse(JSON.stringify(this.defaultSettings));
    
    // Update values from loaded settings
    Object.entries(loaded).forEach(([key, value]) => {
      if (merged[key]) {
        if (value && typeof value === 'object' && 'value' in value) {
          let unwrapped = value.value;
          while (unwrapped && typeof unwrapped === 'object' && 'value' in unwrapped) {
            unwrapped = unwrapped.value;
          }
          merged[key].value = unwrapped;
        } else {
          merged[key].value = value;
        }
      }
    });
    
    return merged;
  }
}

module.exports = SettingsManager;
