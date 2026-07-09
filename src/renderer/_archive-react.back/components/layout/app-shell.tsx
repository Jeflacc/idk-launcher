import { type ReactNode } from 'react';
import {
  House,
  CompassRose,
  Package,
  Stack,
  TShirt,
  Bug,
  Gear,
  Users,
  Minus,
  Square,
  X,
} from '@phosphor-icons/react';
import { useRouter, type ViewId } from '../../stores/router-store';
import { api } from '../../lib/preload-bridge';
import { useSession } from '../../stores/session-store';

interface NavItem {
  id: ViewId;
  label: string;
  icon: typeof House;
}

const NAV: readonly NavItem[] = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'discover', label: 'Discover', icon: CompassRose },
  { id: 'modpacks', label: 'Modpacks', icon: Package },
  { id: 'versions', label: 'Versions', icon: Stack },
  { id: 'skins', label: 'Skins', icon: TShirt },
  { id: 'crash-analyzer', label: 'Crash Analyzer', icon: Bug },
  { id: 'friends', label: 'Friends', icon: Users },
  { id: 'settings', label: 'Settings', icon: Gear },
];

export function AppShell({ children }: { children: ReactNode }) {
  const view = useRouter((s: { view: ViewId }) => s.view);
  const navigate = useRouter((s: { navigate: (v: ViewId) => void }) => s.navigate);
  const session = useSession((s: { session: { username: string; provider: string } | null }) => s.session);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar — Layer 1 glass (heavy frost) */}
      <aside className="glass-strong w-[var(--sidebar-width)] flex flex-col drag-region shrink-0">
        {/* Logo / brand */}
        <div className="px-5 h-[var(--topbar-height)] flex items-center gap-3 border-b border-[var(--color-border-subtle)]">
          <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center font-bold text-sm text-white no-drag accent-glow">
            IDK
          </div>
          <div className="flex flex-col no-drag leading-tight">
            <span className="text-sm font-bold">IDK Launcher</span>
            <span className="text-[10px] text-[var(--color-text-dim)] font-medium">v2.0.0</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 no-drag overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`flex items-center gap-3 px-3 h-9 rounded-[var(--radius-md)] text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-[var(--color-surface-active)] text-[var(--color-accent-bright)] border border-[var(--color-border-accent)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] border border-transparent'
                }`}
              >
                <Icon size={18} weight={active ? 'fill' : 'regular'} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User profile */}
        <div className="px-3 py-3 no-drag border-t border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-md)] glass">
            <div className="w-8 h-8 rounded-full accent-gradient flex items-center justify-center text-xs font-bold text-white shrink-0">
              {session?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold truncate">
                {session?.username ?? 'Not signed in'}
              </span>
              <span className="text-[10px] text-[var(--color-text-dim)] capitalize">
                {session?.provider ?? 'anonymous'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar with window controls */}
        <header className="h-[var(--topbar-height)] drag-region flex items-center justify-end px-3 shrink-0 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-1 no-drag">
            <button onClick={() => api.window.minimize()} className="win-btn" aria-label="Minimize">
              <Minus size={14} weight="bold" />
            </button>
            <button onClick={() => api.window.maximize()} className="win-btn" aria-label="Maximize">
              <Square size={12} weight="bold" />
            </button>
            <button onClick={() => api.window.close()} className="win-btn win-btn-close" aria-label="Close">
              <X size={14} weight="bold" />
            </button>
          </div>
        </header>

        {/* Main content — Layer 2 glass (transparent, lets ambient bg show) */}
        <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
