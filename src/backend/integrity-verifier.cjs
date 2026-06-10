/**
 * Integrity Verification Engine
 * 
 * Validates downloaded files through checksum verification, file completeness checks,
 * and missing item detection. Generates detailed integrity reports with per-file results.
 * 
 * Responsibilities:
 * - Compute and validate file checksums (SHA-256, MD5)
 * - Verify file completeness (size, integrity)
 * - Detect missing or corrupted files
 * - Generate detailed integrity reports
 * - Trigger automatic retry for failed items
 * - Log verification results for debugging
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');

class IntegrityVerifier extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.defaultAlgorithm = options.defaultAlgorithm || 'sha256';
    this.supportedAlgorithms = ['sha256', 'md5'];
  }

  /**
   * Verify all downloaded files in a download session
   * 
   * @param {string} downloadId - Unique session identifier
   * @param {Array} items - Array of DownloadItem objects with expected hashes
   * @param {string} downloadPath - Base path where files were downloaded
   * @returns {Promise<Object>} IntegrityReport with verification results
   */
  async verifyDownload(downloadId, items, downloadPath) {

    
    if (!downloadId || !items || items.length === 0 || !downloadPath) {
      throw new Error('Invalid verification parameters: downloadId, items, and downloadPath required');
    }

    if (!fs.existsSync(downloadPath)) {
      throw new Error(`Download path does not exist: ${downloadPath}`);
    }

    // Initialize report
    const report = {
      downloadId: downloadId,
      totalItems: items.length,
      validItems: 0,
      failedItems: 0,
      missingItems: 0,
      details: [],
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    // Verify each item
    for (const item of items) {
      const detail = await this._verifyItem(item, downloadPath);
      report.details.push(detail);

      // Update report counters
      if (detail.status === 'valid') {
        report.validItems++;
      } else if (detail.status === 'missing') {
        report.missingItems++;
      } else if (detail.status === 'corrupted') {
        report.failedItems++;
      }
    }

    // Determine overall status
    if (report.failedItems === 0 && report.missingItems === 0) {
      report.status = 'passed';
    } else if (report.validItems > 0) {
      report.status = 'partial';
    } else {
      report.status = 'failed';
    }

    return report;
  }

  /**
   * Verify a single file's checksum
   * 
   * @param {string} filePath - Path to the file to verify
   * @param {string} expectedHash - Expected checksum value
   * @param {string} algorithm - Hash algorithm (sha256, md5)
   * @returns {Promise<boolean>} True if checksum matches, false otherwise
   */
  async verifyChecksum(filePath, expectedHash, algorithm = 'sha256') {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    if (!this.supportedAlgorithms.includes(algorithm)) {
      throw new Error(`Unsupported hash algorithm: ${algorithm}`);
    }

    try {
      const actualHash = await this._computeHash(filePath, algorithm);
      return actualHash.toLowerCase() === expectedHash.toLowerCase();
    } catch (error) {
      console.error(`[IntegrityVerifier] Error verifying checksum for ${filePath}: ${error.message}`);
      return false;
    }
  }

  /**
   * Detect missing items in a download
   * 
   * @param {Array} items - Array of DownloadItem objects
   * @param {string} downloadPath - Base path where files should be located
   * @returns {Array} Array of MissingItem objects
   */
  detectMissingItems(items, downloadPath) {
    const missingItems = [];

    for (const item of items) {
      const filePath = path.join(downloadPath, item.filename);
      
      if (!fs.existsSync(filePath)) {
        missingItems.push({
          itemId: item.id,
          filename: item.filename,
          reason: 'File not found'
        });
      }
    }

    return missingItems;
  }

  /**
   * Verify a single item
   * 
   * @private
   * @param {Object} item - DownloadItem to verify
   * @param {string} downloadPath - Base download path
   * @returns {Promise<Object>} VerificationDetail for this item
   */
  async _verifyItem(item, downloadPath) {
    const filePath = path.join(downloadPath, item.filename);
    const detail = {
      itemId: item.id,
      filename: item.filename,
      status: 'valid',
      expectedHash: item.expectedHash || '',
      actualHash: '',
      expectedSize: item.expectedSize || 0,
      actualSize: 0,
      errorMessage: ''
    };

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        detail.status = 'missing';
        detail.errorMessage = 'File not found on disk';
        console.warn(`[IntegrityVerifier] Missing file: ${item.filename}`);
        return detail;
      }

      // Get actual file size
      const stats = fs.statSync(filePath);
      detail.actualSize = stats.size;

      // Verify file size
      if (item.expectedSize && stats.size !== item.expectedSize) {
        detail.status = 'corrupted';
        detail.errorMessage = `Size mismatch: expected ${item.expectedSize} bytes, got ${stats.size} bytes`;
        console.warn(`[IntegrityVerifier] Size mismatch for ${item.filename}: expected ${item.expectedSize}, got ${stats.size}`);
        return detail;
      }

      // Verify checksum if provided
      if (item.expectedHash) {
        const algorithm = item.hashAlgorithm || this.defaultAlgorithm;
        
        if (!this.supportedAlgorithms.includes(algorithm)) {
          detail.status = 'corrupted';
          detail.errorMessage = `Unsupported hash algorithm: ${algorithm}`;
          console.error(`[IntegrityVerifier] Unsupported algorithm for ${item.filename}: ${algorithm}`);
          return detail;
        }

        const actualHash = await this._computeHash(filePath, algorithm);
        detail.actualHash = actualHash;

        if (actualHash.toLowerCase() !== item.expectedHash.toLowerCase()) {
          detail.status = 'corrupted';
          detail.errorMessage = `Checksum mismatch (${algorithm}): expected ${item.expectedHash}, got ${actualHash}`;
          console.warn(`[IntegrityVerifier] Checksum mismatch for ${item.filename}`);
          return detail;
        }
      }

      // All checks passed
      detail.status = 'valid';
      return detail;

    } catch (error) {
      detail.status = 'corrupted';
      detail.errorMessage = `Verification error: ${error.message}`;
      console.error(`[IntegrityVerifier] Error verifying ${item.filename}: ${error.message}`);
      return detail;
    }
  }

  /**
   * Compute hash of a file
   * 
   * @private
   * @param {string} filePath - Path to file
   * @param {string} algorithm - Hash algorithm (sha256, md5)
   * @returns {Promise<string>} Hex-encoded hash
   */
  _computeHash(filePath, algorithm = 'sha256') {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(algorithm);
      const stream = fs.createReadStream(filePath);

      stream.on('data', (chunk) => {
        hash.update(chunk);
      });

      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Generate a detailed integrity report
   * 
   * @param {Array} verificationResults - Array of VerificationDetail objects
   * @returns {Object} IntegrityReport
   */
  generateReport(verificationResults) {
    const report = {
      totalItems: verificationResults.length,
      validItems: 0,
      failedItems: 0,
      missingItems: 0,
      details: verificationResults,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    // Count results
    for (const result of verificationResults) {
      if (result.status === 'valid') {
        report.validItems++;
      } else if (result.status === 'missing') {
        report.missingItems++;
      } else if (result.status === 'corrupted') {
        report.failedItems++;
      }
    }

    // Determine overall status
    if (report.failedItems === 0 && report.missingItems === 0) {
      report.status = 'passed';
    } else if (report.validItems > 0) {
      report.status = 'partial';
    } else {
      report.status = 'failed';
    }

    return report;
  }
}

module.exports = IntegrityVerifier;
