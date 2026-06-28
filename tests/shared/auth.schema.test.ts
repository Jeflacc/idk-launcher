import { describe, it, expect } from 'vitest';
import { AuthSchema } from '@shared/schemas/auth.schema';

describe('AuthSchema.microsoftAccount', () => {
  it('accepts a valid microsoft account', () => {
    const r = AuthSchema.microsoftAccount.safeParse({
      provider: 'microsoft',
      username: 'Steve',
      uuid: 'uuid-1',
      accessToken: 'tok',
      refreshToken: 'ref',
      expiresAt: 1_000,
    });
    expect(r.success).toBe(true);
  });

  it('rejects when provider is not microsoft', () => {
    const r = AuthSchema.microsoftAccount.safeParse({
      provider: 'elyby',
      username: 'x',
      uuid: 'x',
      accessToken: 'x',
      refreshToken: 'x',
      expiresAt: 1,
    });
    expect(r.success).toBe(false);
  });

  it('rejects when required fields are missing', () => {
    const r = AuthSchema.microsoftAccount.safeParse({ provider: 'microsoft' });
    expect(r.success).toBe(false);
  });
});

describe('AuthSchema.elybyAccount', () => {
  it('accepts a valid elyby account', () => {
    const r = AuthSchema.elybyAccount.safeParse({
      provider: 'elyby',
      username: 'Steve',
      uuid: 'uuid-1',
      accessToken: 'tok',
      expiresAt: 1_000,
    });
    expect(r.success).toBe(true);
  });

  it('accepts elyby account without optional refreshToken', () => {
    const r = AuthSchema.elybyAccount.safeParse({
      provider: 'elyby',
      username: 'Steve',
      uuid: 'uuid-1',
      accessToken: 'tok',
      expiresAt: 1_000,
    });
    expect(r.success).toBe(true);
  });
});

describe('AuthSchema.session (discriminated union)', () => {
  it('parses a microsoft session', () => {
    const r = AuthSchema.session.safeParse({ provider: 'microsoft', username: 'a', uuid: 'b' });
    expect(r.success).toBe(true);
  });

  it('parses an elyby session', () => {
    const r = AuthSchema.session.safeParse({ provider: 'elyby', username: 'a', uuid: 'b' });
    expect(r.success).toBe(true);
  });

  it('rejects an unknown provider', () => {
    const r = AuthSchema.session.safeParse({ provider: 'offline', username: 'a', uuid: 'b' });
    expect(r.success).toBe(false);
  });
});

describe('AuthSchema.microsoftAuthRequest', () => {
  it('defaults interactive to true when omitted', () => {
    const r = AuthSchema.microsoftAuthRequest.parse({});
    expect(r.interactive).toBe(true);
  });

  it('accepts explicit interactive=false', () => {
    const r = AuthSchema.microsoftAuthRequest.parse({ interactive: false });
    expect(r.interactive).toBe(false);
  });
});

describe('AuthSchema.elybyAuthRequest', () => {
  it('accepts valid credentials', () => {
    const r = AuthSchema.elybyAuthRequest.safeParse({ username: 'abc', password: 'secret' });
    expect(r.success).toBe(true);
  });

  it('rejects too-short username', () => {
    const r = AuthSchema.elybyAuthRequest.safeParse({ username: 'ab', password: 'secret' });
    expect(r.success).toBe(false);
  });

  it('rejects empty password', () => {
    const r = AuthSchema.elybyAuthRequest.safeParse({ username: 'abc', password: '' });
    expect(r.success).toBe(false);
  });
});
