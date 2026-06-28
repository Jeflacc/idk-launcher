import { describe, it, expect } from 'vitest';
import { IntegrityPolicyService, IntegrityError } from '@/domain/services/integrity-policy';
import type { LauncherSettings } from '@shared/types';

function settings(verify: boolean): LauncherSettings {
  return {
    general: { theme: 'glass', language: 'en', minecraftRoot: '', discordRpc: true, autoUpdate: true, backgroundEffect: 'particles' },
    java: { customPath: '', autoDetect: true, args: [] },
    memory: { maxMb: 4096, minMb: 1024, autoAllocate: true },
    appearance: { glassmorphism: true, accentColor: '#6366f1', compactMode: false, reducedMotion: false },
    launch: { closeOnLaunch: false, showOverlay: true, autoOptimize: true, windowWidth: 854, windowHeight: 480, fullscreen: false },
    network: { concurrentDownloads: 4, verifyIntegrity: verify, proxyUrl: '' },
    connect: { enabled: false, serverUrl: '', tunnelToken: '', tunnelEnabled: false },
  };
}

describe('IntegrityPolicyService', () => {
  it('shouldVerify is true when settings.network.verifyIntegrity is true', () => {
    expect(new IntegrityPolicyService(settings(true)).shouldVerify).toBe(true);
  });

  it('shouldVerify is false when settings.network.verifyIntegrity is false', () => {
    expect(new IntegrityPolicyService(settings(false)).shouldVerify).toBe(false);
  });

  describe('shouldVerifyItem', () => {
    it('returns false when no sha1 is provided', () => {
      const svc = new IntegrityPolicyService(settings(true));
      expect(svc.shouldVerifyItem(undefined)).toBe(false);
    });

    it('returns true when sha1 provided and verification enabled', () => {
      const svc = new IntegrityPolicyService(settings(true));
      expect(svc.shouldVerifyItem('abc123')).toBe(true);
    });

    it('returns false when sha1 provided but verification disabled', () => {
      const svc = new IntegrityPolicyService(settings(false));
      expect(svc.shouldVerifyItem('abc123')).toBe(false);
    });
  });

  describe('assertHash', () => {
    it('is a no-op when no sha1 is expected', () => {
      const svc = new IntegrityPolicyService(settings(true));
      expect(() => svc.assertHash(Buffer.from('x'), undefined)).not.toThrow();
    });

    it('throws IntegrityError on mismatch', () => {
      const svc = new IntegrityPolicyService(settings(true));
      const correct = 'a9993e364706816aba3e25717850c26c9cd0d89d'; // sha1('abc')
      const wrong = '0000000000000000000000000000000000000000';
      expect(() => svc.assertHash(Buffer.from('abc'), wrong)).toThrow(IntegrityError);
      expect(() => svc.assertHash(Buffer.from('abc'), wrong)).toThrow(/Integrity check failed/);
    });

    it('passes when hash matches', () => {
      const svc = new IntegrityPolicyService(settings(true));
      const correct = 'a9993e364706816aba3e25717850c26c9cd0d89d'; // sha1('abc')
      expect(() => svc.assertHash(Buffer.from('abc'), correct)).not.toThrow();
    });

    it('does not throw when verification is disabled even with a hash', () => {
      const svc = new IntegrityPolicyService(settings(false));
      expect(() => svc.assertHash(Buffer.from('abc'), 'wrong')).not.toThrow();
    });
  });
});
