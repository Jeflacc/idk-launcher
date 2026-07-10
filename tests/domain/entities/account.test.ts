import { describe, it, expect } from 'vitest';
import { AccountEntity } from '@/domain/entities/account';

describe('AccountEntity', () => {
  it('stores provider, username, uuid', () => {
    const a = new AccountEntity('microsoft', 'Steve', 'uuid-1');
    expect(a.provider).toBe('microsoft');
    expect(a.username).toBe('Steve');
    expect(a.uuid).toBe('uuid-1');
  });

  it('isMicrosoft is true only for microsoft provider', () => {
    expect(new AccountEntity('microsoft', 'a', 'b').isMicrosoft).toBe(true);
    expect(new AccountEntity('elyby', 'a', 'b').isMicrosoft).toBe(false);
  });

  it('isElyby is true only for elyby provider', () => {
    expect(new AccountEntity('elyby', 'a', 'b').isElyby).toBe(true);
    expect(new AccountEntity('microsoft', 'a', 'b').isElyby).toBe(false);
  });

  it('defaults authenticatedAt to the current time', () => {
    const before = Date.now();
    const a = new AccountEntity('microsoft', 'a', 'b');
    const after = Date.now();
    expect(a.authenticatedAt).toBeGreaterThanOrEqual(before);
    expect(a.authenticatedAt).toBeLessThanOrEqual(after);
  });
});
