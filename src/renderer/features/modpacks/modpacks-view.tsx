import { useInstalledModpacks } from '../../hooks/use-launcher-data';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Spinner } from '../../components/ui/spinner';
import { Play, Trash, Clock, Package as PackageIcon } from '@phosphor-icons/react';
import { api } from '../../lib/preload-bridge';
import { toast } from 'sonner';
import { useRouter } from '../../stores/router-store';

export function ModpacksView() {
  const { data, isLoading, refetch } = useInstalledModpacks();
  const navigate = useRouter((s) => s.navigate);

  return (
    <div className="max-w-6xl mx-auto py-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Your modpacks</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Each modpack is sandboxed in its own directory.
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('discover')}>
          Discover more
        </Button>
      </header>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Spinner size={32} />
        </div>
      )}

      {data && data.length === 0 && (
        <Card>
          <div className="flex flex-col items-center text-center py-12">
            <PackageIcon size={40} weight="duotone" className="text-[var(--color-text-subtle)] mb-3" />
            <h3 className="font-semibold mb-1">No modpacks yet</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Install one from the Discover tab to get started.
            </p>
            <Button variant="primary" onClick={() => navigate('discover')}>
              Browse marketplace
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map((mp) => (
          <Card key={mp.id} className="flex flex-col">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[var(--color-accent)]/40 to-purple-500/40 flex items-center justify-center text-lg font-bold">
                {mp.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm truncate">{mp.name}</h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  MC {mp.minecraftVersion}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <Badge>{mp.loader}</Badge>
              <Badge variant="success">{mp.modCount} mods</Badge>
              {mp.lastPlayedAt && (
                <Badge>
                  <Clock size={10} weight="fill" /> played
                </Badge>
              )}
            </div>
            <div className="flex gap-2 mt-auto">
              <Button
                size="sm"
                variant="primary"
                onClick={() =>
                  toast.promise(api.modpack.launch(mp.id), {
                    loading: 'Launching…',
                    success: 'Launched!',
                    error: 'Launch failed',
                  })
                }
              >
                <Play size={14} weight="fill" /> Play
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await api.modpack.deleteFolder(mp.id);
                  toast.success('Modpack deleted');
                  void refetch();
                }}
              >
                <Trash size={14} weight="bold" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
