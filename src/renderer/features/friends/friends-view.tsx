import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Users, ShieldOff } from 'lucide-react';

export function FriendsView() {
  return (
    <div className="max-w-4xl mx-auto py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-1">IDK Connect</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Friend presence and multiplayer tunneling.
        </p>
      </header>

      <Card className="border-[var(--color-warning)]/30 mb-4">
        <div className="flex items-start gap-3">
          <ShieldOff size={20} className="text-[var(--color-warning)] mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-sm mb-1">Connect backend not configured</h3>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              v1 talked to a plaintext HTTP backend at <code>api.somniac.me:6040</code> with
              bearer-token auth over cleartext. v2 requires HTTPS before any connect traffic is
              permitted. Add a secure backend URL in Settings → IDK Connect to enable this view.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col items-center text-center py-12">
          <Users size={40} className="text-[var(--color-text-subtle)] mb-3" />
          <h3 className="font-semibold mb-1">No friends online</h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Once a secure backend is configured, your friend list will appear here.
          </p>
          <Badge variant="warning">Disabled — HTTPS required</Badge>
        </div>
      </Card>
    </div>
  );
}
