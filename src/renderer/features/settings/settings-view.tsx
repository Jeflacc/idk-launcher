import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/preload-bridge';
import { toast } from 'sonner';
import type { LauncherSettings } from '@shared/types';

export function SettingsView() {
  const [settings, setSettings] = useState<LauncherSettings | null>(null);

  useEffect(() => {
    void api.settings.load().then(setSettings);
  }, []);

  if (!settings) return null;

  async function save(patch: Partial<LauncherSettings>) {
    const updated = await api.settings.save(patch);
    setSettings(updated);
    toast.success('Settings saved');
  }

  return (
    <div className="max-w-3xl mx-auto py-6 flex flex-col gap-4">
      <header className="mb-2">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Preferences only. Auth tokens live in the encrypted secret store.
        </p>
      </header>

      <Card>
        <h3 className="font-semibold text-sm mb-3">Memory</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-[var(--color-text-muted)] flex flex-col gap-1.5">
            Max memory (MB)
            <Input
              type="number"
              value={settings.memory.maxMb}
              onChange={(e) =>
                setSettings({ ...settings, memory: { ...settings.memory, maxMb: Number(e.target.value) } })
              }
            />
          </label>
          <label className="text-xs text-[var(--color-text-muted)] flex flex-col gap-1.5">
            Min memory (MB)
            <Input
              type="number"
              value={settings.memory.minMb}
              onChange={(e) =>
                setSettings({ ...settings, memory: { ...settings.memory, minMb: Number(e.target.value) } })
              }
            />
          </label>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-sm mb-3">Java</h3>
        <label className="text-xs text-[var(--color-text-muted)] flex flex-col gap-1.5">
          Custom Java path (leave empty for auto-detect)
          <Input
            value={settings.java.customPath}
            onChange={(e) =>
              setSettings({ ...settings, java: { ...settings.java, customPath: e.target.value } })
            }
            placeholder="/usr/lib/jvm/…"
          />
        </label>
      </Card>

      <Card>
        <h3 className="font-semibold text-sm mb-3">Network</h3>
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm">Verify download integrity</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Required for Mojang assets. Disabling is strongly discouraged.
            </p>
          </div>
          <Badge variant={settings.network.verifyIntegrity ? 'success' : 'danger'}>
            {settings.network.verifyIntegrity ? 'ON' : 'OFF'}
          </Badge>
        </div>
        <label className="text-xs text-[var(--color-text-muted)] flex flex-col gap-1.5 mt-3">
          Concurrent downloads
          <Input
            type="number"
            min={1}
            max={16}
            value={settings.network.concurrentDownloads}
            onChange={(e) =>
              setSettings({
                ...settings,
                network: { ...settings.network, concurrentDownloads: Number(e.target.value) },
              })
            }
          />
        </label>
      </Card>

      <Card>
        <h3 className="font-semibold text-sm mb-3">IDK Connect (tunneling)</h3>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          The tunnel requires a <strong>user-provided token</strong>. There is no default token —
          v1 hardcoded a public shared token that exposed every user's local server.
        </p>
        <label className="text-xs text-[var(--color-text-muted)] flex flex-col gap-1.5">
          Tunnel token
          <Input
            type="password"
            value={settings.connect.tunnelToken}
            onChange={(e) =>
              setSettings({
                ...settings,
                connect: { ...settings.connect, tunnelToken: e.target.value },
              })
            }
            placeholder="Paste your frps token…"
          />
        </label>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => api.settings.reset().then(setSettings)}>
          Reset to defaults
        </Button>
        <Button variant="primary" onClick={() => save(settings)}>
          Save
        </Button>
      </div>
    </div>
  );
}
