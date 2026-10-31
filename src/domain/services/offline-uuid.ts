import { createHash } from 'node:crypto';

/**
 * Derive a deterministic offline (cracked) UUID from a username using the
 * standard Minecraft "OfflinePlayer:<name>" scheme — the same algorithm as
 * Java's `UUID.nameUUIDFromBytes` (MD5, version 3 + IETF variant bits set).
 *
 * Every offline account gets a stable, unique identity that servers and skin
 * resolvers can key off, instead of a hardcoded all-zeros UUID.
 */
export function offlineUuid(username: string): string {
  const hash = createHash('md5').update(`OfflinePlayer:${username}`).digest();
  // Version 3 (name-based MD5) + IETF variant, matching nameUUIDFromBytes.
  hash.writeUInt8((hash.readUInt8(6) & 0x0f) | 0x30, 6);
  hash.writeUInt8((hash.readUInt8(8) & 0x3f) | 0x80, 8);
  const hex = hash.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}
