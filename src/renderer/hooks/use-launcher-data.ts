import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/preload-bridge';

export function useInstalledModpacks() {
  return useQuery({
    queryKey: ['modpacks', 'installed'],
    queryFn: () => api.modpack.scanProfiles(),
    staleTime: 10_000,
  });
}
