import { type ReactNode } from 'react';
import {
  Home,
  Compass,
  Package,
  Boxes,
  Shirt,
  Bug,
  Settings as SettingsIcon,
  Users,
  Minus,
  Square,
  X,
} from 'lucide-react';
import { useRouter, type ViewId } from '../../stores/router-store';
import { api } from '../../lib/preload-bridge';
import { useSession } from '../../stores/session-store';

interface NavItem {
  id: ViewId;
  label: string;
  icon: typeof Home;
}

const NAV: readonly NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'modpacks', label: 'Modpacks', icon: Package },
  { id: 'versions', label: 'Versions', icon: Boxes },
  { id: 'skins', label: 'Skins', icon: Shirt },
  { id: 'crash-analyzer', label: 'Crash Analyzer', icon: Bug },
  { id: 'friends', label: 'Friends', icon: Users },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export function AppShell({ children }: { children: ReactNode }) {
  const view = useRouter((s: { view: ViewId }) => s.view);
  const navigate = useRouter((s: { navigate: (v: ViewId) => void }) => s.navigate);
  const session = useSession((s: { session: { username: string; provider: string } | null }) => s.session);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="glass-strong w-60 flex flex-col drag-region shrink-0">
        <div className="px-5 py-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[#c084fc] flex items-center justify-center font-bold text-white no-drag">
            IDK
          </div>
          <div className="flex flex-col no-drag">
            <span className="text-sm font-semibold leading-tight">IDK Launcher</span>
            <span className="text-[11px] text-[var(--color-text-subtle)]">v2.0.0</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 flex flex-col gap-1 no-drag overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-[var(--color-surface-hover)] text-[var(--color-text)] border border-[var(--color-border-strong)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-3 no-drag border-t border-[var(--color-border)]">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg glass">
            <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/30 flex items-center justify-center text-xs font-bold">
              {session?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium truncate">
                {session?.username ?? 'Not signed in'}
              </span>
              <span className="text-[10px] text-[var(--color-text-subtle)]">
                {session?.provider ?? 'anonymous'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 drag-region flex items-center justify-end px-3 shrink-0">
          <div className="flex items-center gap-1 no-drag">
            <button
              onClick={() => api.window.minimize()}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--color-surface)] text-[var(--color-text-muted)]"
              aria-label="Minimize"
            >
              <Minus size={16} />
            </button>
            <button
              onClick={() => api.window.maximize()}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--color-surface)] text-[var(--color-text-muted)]"
              aria-label="Maximize"
            >
              <Square size={14} />
            </button>
            <button
              onClick={() => api.window.close()}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--color-danger)]/80 text-[var(--color-text-muted)] hover:text-white"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 pb-6">{children}</main>
      </div>
    </div>
  );
}
