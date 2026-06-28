import { useState } from 'react';
import { useModrinthSearch } from '../../hooks/use-modrinth-search';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Spinner } from '../../components/ui/spinner';
import { Button } from '../../components/ui/button';
import { MagnifyingGlass, DownloadSimple, ArrowUpRight } from '@phosphor-icons/react';
import { api } from '../../lib/preload-bridge';
import { toast } from 'sonner';

export function DiscoverView() {
  const [query, setQuery] = useState('skyblock');
  const { data, isLoading, error } = useModrinthSearch(query);

  return (
    <div className="max-w-6xl mx-auto py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Discover modpacks</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Search the Modrinth marketplace. Installs are sandboxed per profile.
        </p>
      </header>

      <div className="relative mb-6">
        <MagnifyingGlass
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search modpacks…"
          className="pl-10"
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Spinner size={32} />
        </div>
      )}

      {error && (
        <Card className="border-[var(--color-danger)]/30">
          <p className="text-sm text-[var(--color-danger)]">
            Failed to search: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </Card>
      )}

      {data && data.hits.length === 0 && (
        <Card>
          <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
            No modpacks match “{query}”.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.hits.map((hit) => (
          <Card key={hit.project_id} className="flex flex-col">
            <div className="flex gap-3 mb-3">
              {hit.icon_url ? (
                <img
                  src={hit.icon_url}
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg glass flex items-center justify-center text-[var(--color-text-subtle)]">
                  <PackagePlaceholder />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm truncate">{hit.title}</h3>
                <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">
                  {hit.description}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {hit.categories.slice(0, 4).map((c) => (
                <Badge key={c}>{c}</Badge>
              ))}
              <Badge variant="success">
                <DownloadSimple size={10} weight="fill" /> {(hit.downloads / 1000).toFixed(1)}k
              </Badge>
            </div>
            <div className="flex gap-2 mt-auto">
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  toast.promise(
                    api.modpack.install(hit.project_id, '1.20.1', 'fabric', hit.title),
                    { loading: 'Installing…', success: 'Installed!', error: 'Install failed' },
                  );
                }}
              >
                Install
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => api.system.openExternal(`https://modrinth.com/modpack/${hit.slug}`)}
              >
                <ArrowUpRight size={14} weight="bold" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PackagePlaceholder() {
  return <div className="w-6 h-6 rounded glass" />;
}
