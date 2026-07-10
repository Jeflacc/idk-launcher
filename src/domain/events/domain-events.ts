import type { AuthProvider } from '@shared/types';

/**
 * Domain events flow through a typed bus (see infrastructure). These replace
 * v1's 8 ad-hoc `window.*` globals used as an event bus with no contract.
 */
export type DomainEvent =
  | { type: 'auth:session-started'; provider: AuthProvider; username: string }
  | { type: 'auth:session-ended' }
  | { type: 'launch:started'; modpackId?: string; versionId: string }
  | { type: 'launch:game-spawned'; pid: number }
  | { type: 'launch:closed'; playtimeSeconds: number; crashed: boolean }
  | { type: 'download:completed'; downloadId: string }
  | { type: 'modpack:installed'; modpackId: string }
  | { type: 'modpack:removed'; modpackId: string }
  | { type: 'settings:changed'; category: string };

export type DomainEventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void;
