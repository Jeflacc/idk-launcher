import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Spinner } from '../../components/ui/spinner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useState } from 'react';
import { Download, Search } from 'lucide-react';
import { api } from '../../lib/preload-bridge';
import { toast } from 'sonner';

interface ManifestResponse {
  latest: { release: string; snapshot: string };
  versions: Array<{
    id: string;
    type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha';
    releaseTime: string;
  }>;
}

export function VersionsView() {
  const [filter, setFilter] = useState('');
  const [type, setType] = useState<'all' | 'release' | 'snapshot'>('release');

  const { data, isLoading } = useQuery<ManifestResponse>({
    queryKey: ['mojang', 'manifest'],
    queryFn: async () => {
      const res = await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json');
      if (!res.ok) throw new Error('Failed to load version manifest');
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  const filtered = (data?.versions ?? [])
    .filter((v) => (type === 'all' ? true : v.type === type))
    .filter((v) => v.id.toLowerCase().includes(filter.toLowerCase()))
    .slice(0, 60);

  return (
    <div className="max-w-4xl mx-auto py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Minecraft versions</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Browse and download official Minecraft versions.
        </p>
      </header>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]" />
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter versions…" className="pl-10" />
        </div>
        <div className="flex gap-1 glass rounded-lg p-1">
          {(['release', 'snapshot', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-3 h-8 rounded-md text-xs font-medium capitalize transition-colors ${
                type === t ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Spinner size={32} />
        </div>
      )}

      <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
        {filtered.map((v) => (
          <Card key={v.id} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm">{v.id}</span>
              <Badge variant={v.type === 'release' ? 'success' : v.type === 'snapshot' ? 'warning' : 'default'}>
                {v.type}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                toast.promise(api.version.download(v.id).then(() => true), {
                  loading: 'Downloading…',
                  success: 'Version downloaded',
                  error: 'Download failed',
                })
              }
            >
              <Download size={14} /> Download
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
