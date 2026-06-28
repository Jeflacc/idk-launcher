import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useRouter } from '../../stores/router-store';
import { useSession } from '../../stores/session-store';
import { Compass, Package, Boxes, Shirt, Sparkles, ShieldCheck, Zap } from 'lucide-react';

export function HomeView() {
  const navigate = useRouter((s) => s.navigate);
  const session = useSession((s) => s.session);
  const signIn = useSession((s) => s.signInMicrosoft);

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="mb-10">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-accent)]">
          Welcome back
        </span>
        <h1 className="text-4xl font-bold mt-2 mb-3">
          {session ? `Hello, ${session.username}` : 'The next-generation Minecraft experience'}
        </h1>
        <p className="text-[var(--color-text-muted)] max-w-2xl">
          Sandbox-isolated modpacks, a live marketplace, native custom skins, and a glassmorphic
          interface — rebuilt from first principles on a typed, secure, layered architecture.
        </p>
        {!session && (
          <div className="mt-6 flex gap-3">
            <Button variant="primary" size="lg" onClick={() => signIn()}>
              Sign in with Microsoft
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate('discover')}>
              Browse modpacks
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {[
          { icon: Compass, title: 'Discover', desc: 'Search Modrinth & CurseForge', view: 'discover' as const },
          { icon: Package, title: 'Modpacks', desc: 'Sandboxed profiles', view: 'modpacks' as const },
          { icon: Boxes, title: 'Versions', desc: 'Minecraft versions', view: 'versions' as const },
          { icon: Shirt, title: 'Skins', desc: '3D skin viewer', view: 'skins' as const },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} interactive onClick={() => navigate(item.view)}>
              <Icon size={24} className="text-[var(--color-accent)] mb-3" />
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-[var(--color-text-muted)]">{item.desc}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Sparkles, title: 'Glassmorphic UI', desc: 'A unified design system replaces the 11,334-line stylesheet.' },
          { icon: ShieldCheck, title: 'Secure by default', desc: 'Encrypted token storage, sandboxed windows, allowlisted networking.' },
          { icon: Zap, title: 'Typed end-to-end', desc: 'Every IPC channel validated by zod. No more signature mismatches.' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <Icon size={20} className="text-[var(--color-success)] mb-2" />
              <h4 className="text-sm font-semibold mb-1">{item.title}</h4>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{item.desc}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
