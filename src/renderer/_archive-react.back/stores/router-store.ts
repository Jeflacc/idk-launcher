import { create } from 'zustand';

export type ViewId =
  | 'home'
  | 'discover'
  | 'modpacks'
  | 'versions'
  | 'skins'
  | 'crash-analyzer'
  | 'settings'
  | 'friends';

interface RouterState {
  view: ViewId;
  params: Record<string, string>;
  navigate: (view: ViewId, params?: Record<string, string>) => void;
  back: () => void;
  history: ViewId[];
}

export const useRouter = create<RouterState>((set) => ({
  view: 'home',
  params: {},
  history: ['home'],
  navigate: (view, params = {}) =>
    set((state) => ({ view, params, history: [...state.history, view] })),
  back: () =>
    set((state) => {
      if (state.history.length <= 1) return state;
      const history = [...state.history];
      history.pop();
      return { view: history[history.length - 1]!, params: {}, history };
    }),
}));
