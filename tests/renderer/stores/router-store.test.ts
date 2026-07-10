import { describe, it, expect, beforeEach } from 'vitest';
import { useRouter } from '@/renderer/stores/router-store';

describe('useRouter store', () => {
  beforeEach(() => {
    // Reset the store to its initial state before each test.
    useRouter.setState({ view: 'home', params: {}, history: ['home'] });
  });

  it('starts at home view', () => {
    expect(useRouter.getState().view).toBe('home');
  });

  it('navigate changes the current view', () => {
    useRouter.getState().navigate('discover');
    expect(useRouter.getState().view).toBe('discover');
  });

  it('navigate stores params', () => {
    useRouter.getState().navigate('modpacks', { filter: 'installed' });
    expect(useRouter.getState().view).toBe('modpacks');
    expect(useRouter.getState().params).toEqual({ filter: 'installed' });
  });

  it('navigate appends to history', () => {
    useRouter.getState().navigate('discover');
    useRouter.getState().navigate('modpacks');
    expect(useRouter.getState().history).toEqual(['home', 'discover', 'modpacks']);
  });

  it('back navigates to the previous view', () => {
    useRouter.getState().navigate('discover');
    useRouter.getState().navigate('modpacks');
    useRouter.getState().back();
    expect(useRouter.getState().view).toBe('discover');
    expect(useRouter.getState().history).toEqual(['home', 'discover']);
  });

  it('back is a no-op when history has only one entry', () => {
    useRouter.getState().back();
    expect(useRouter.getState().view).toBe('home');
    expect(useRouter.getState().history).toEqual(['home']);
  });

  it('back clears params', () => {
    useRouter.getState().navigate('discover', { q: 'test' });
    useRouter.getState().back();
    expect(useRouter.getState().params).toEqual({});
  });

  it('navigate to the same view still appends to history', () => {
    useRouter.getState().navigate('home');
    expect(useRouter.getState().history).toHaveLength(2);
  });
});
