import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useRouter } from '../../stores/router-store';
import { useSession } from '../../stores/session-store';
import { CompassRose, Package, Stack, TShirt, Sparkle, ShieldCheck, Lightning } from '@phosphor-icons/react';

export function HomeView() {
  const navigate = useRouter((s: { navigate: (v: 'discover' | 'modpacks' | 'versions' | 'skins') => void }) => s.navigate);
  const session = useSession((s: { session: { username: string } | null }) => s.session);
  const signIn = useSession((s: { signInMicrosoft: () => void }) => s.signInMicrosoft);

  return (
    <div className="max-w-5xl mx-auto py-10 animate-fade-in">
      {/* Hero */}
      <div className="mb-12">
        <span className="text-xs font-bold uppercase tracking-[0.2em] accent-text">
          Welcome back
        </span>
        <h1 className="text-4xl font-bold mt-3 mb-4 leading-tight">
          {session ? `Hello, ${session.username}` : 'The next-generation Minecraft experience'}
        </h1>
        <p className="text-[var(--color-text-secondary)] text-base max-w-2xl leading-relaxed">
          Sandbox-isolated modpacks, a live marketplace, native custom skins, and a glassmorphic
          interface — rebuilt from first principles on a typed, secure, layered architecture.
        </p>
        {!session && (
          <div className="mt-7 flex gap-3">
            <Button variant="primary" size="lg" onClick={() => signIn()}>
              Sign in with Microsoft
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate('discover')}>
              Browse modpacks
            </Button>
          </div>
        )}
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { icon: CompassRose, title: 'Discover', desc: 'Search Modrinth & CurseForge', view: 'discover' as const },
          { icon: Package, title: 'Modpacks', desc: 'Sandboxed profiles', view: 'modpacks' as const },
          { icon: Stack, title: 'Versions', desc: 'Minecraft versions', view: 'versions' as const },
          { icon: TShirt, title: 'Skins', desc: '3D skin viewer', view: 'skins' as const },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} interactive onClick={() => navigate(item.view)}>
              <div className="w-10 h-10 rounded-lg accent-gradient flex items-center justify-center mb-4 accent-glow">
                <Icon size={20} weight="fill" className="text-white" />
              </div>
              <h3 className="font-semibold text-base mb-1">{item.title}</h3>
              <p className="text-sm text-[var(--color-text-muted)]">{item.desc}</p>
            </Card>
          );
        })}
      </div>

      {/* Benefit cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Sparkle, title: 'Glassmorphic UI', desc: 'A unified design system replaces the 11,334-line stylesheet.' },
          { icon: ShieldCheck, title: 'Secure by default', desc: 'Encrypted token storage, sandboxed windows, allowlisted networking.' },
          { icon: Lightning, title: 'Typed end-to-end', desc: 'Every IPC channel validated by zod. No more signature mismatches.' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <Icon size={18} weight="fill" className="accent-text mb-3" />
              <h4 className="text-sm font-semibold mb-1.5">{item.title}</h4>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{item.desc}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
