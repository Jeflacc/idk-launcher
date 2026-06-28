import { useEffect } from 'react';
import { Providers } from './app/providers';
import { AppShell } from './components/layout/app-shell';
import { useRouter } from './stores/router-store';
import { useSession } from './stores/session-store';
import { HomeView } from './features/home/home-view';
import { DiscoverView } from './features/discover/discover-view';
import { ModpacksView } from './features/modpacks/modpacks-view';
import { VersionsView } from './features/versions/versions-view';
import { SkinsView } from './features/skins/skins-view';
import { CrashAnalyzerView } from './features/crash-analyzer/crash-analyzer-view';
import { SettingsView } from './features/settings/settings-view';
import { FriendsView } from './features/friends/friends-view';

export function App() {
  const view = useRouter((s) => s.view);
  const initSession = useSession((s) => s.init);

  useEffect(() => {
    void initSession();
  }, [initSession]);

  return (
    <Providers>
      <AppShell>
        {view === 'home' && <HomeView />}
        {view === 'discover' && <DiscoverView />}
        {view === 'modpacks' && <ModpacksView />}
        {view === 'versions' && <VersionsView />}
        {view === 'skins' && <SkinsView />}
        {view === 'crash-analyzer' && <CrashAnalyzerView />}
        {view === 'settings' && <SettingsView />}
        {view === 'friends' && <FriendsView />}
      </AppShell>
    </Providers>
  );
}
