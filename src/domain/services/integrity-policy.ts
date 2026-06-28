import type { LauncherSettings } from '@shared/types';

/**
 * Integrity policy. The v1 launcher monkey-patched minecraft-launcher-core's
 * checksum verifier to always return true — a critical security regression
 * that allowed tampered downloads. This service centralizes the policy so it
 * can be audited and never silently disabled.
 */
export class IntegrityPolicyService {
  constructor(private readonly settings: LauncherSettings) {}

  /** Whether downloaded files must be verified against their declared sha1. */
  get shouldVerify(): boolean {
    // Hard rule: integrity verification is ALWAYS on when the user has not
    // explicitly disabled it AND the file declares a sha1. There is no global
    // bypass.
    return this.settings.network.verifyIntegrity !== false;
  }

  shouldVerifyItem(itemSha1: string | undefined): boolean {
    if (!itemSha1) return false; // cannot verify what has no checksum
    return this.shouldVerify;
  }

  /** Throws if verification is required but the hash mismatches. */
  assertHash(content: Buffer, expectedSha1: string | undefined): void {
    if (!this.shouldVerifyItem(expectedSha1)) return;
    const actual = this.sha1hex(content);
    if (actual !== expectedSha1) {
      throw new IntegrityError(
        `Integrity check failed: expected ${expectedSha1}, got ${actual}`,
      );
    }
  }

  private sha1hex(buf: Buffer): string {
    // crypto is a node builtin; imported lazily to keep the domain layer
    // importable from pure unit-test contexts.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createHash } = require('node:crypto') as typeof import('node:crypto');
    return createHash('sha1').update(buf).digest('hex');
  }
}

export class IntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IntegrityError';
  }
}
