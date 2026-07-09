import { create } from 'zustand';
import { api } from '../lib/preload-bridge';
import type { AuthSession } from '@shared/types';

interface SessionState {
  session: AuthSession | null;
  status: 'anonymous' | 'authenticating' | 'authenticated' | 'error';
  error: string | null;
  init: () => Promise<void>;
  signInMicrosoft: () => Promise<void>;
  signInElyby: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useSession = create<SessionState>((set) => ({
  session: null,
  status: 'anonymous',
  error: null,
  init: async () => {
    try {
      const ms = await api.auth.getMicrosoftAuthData();
      if (ms) {
        set({ session: ms, status: 'authenticated' });
        return;
      }
      const elyby = await api.auth.getElybyAuthData();
      if (elyby) {
        set({ session: elyby, status: 'authenticated' });
      }
    } catch {
      // anonymous
    }
  },
  signInMicrosoft: async () => {
    set({ status: 'authenticating', error: null });
    try {
      const session = await api.auth.microsoftAuthenticate(true);
      set({ session, status: 'authenticated' });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  },
  signInElyby: async (username, password) => {
    set({ status: 'authenticating', error: null });
    try {
      const session = await api.auth.elybyAuthenticate(username, password);
      set({ session, status: 'authenticated' });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  },
  signOut: async () => {
    await api.auth.signOut();
    set({ session: null, status: 'anonymous' });
  },
}));
