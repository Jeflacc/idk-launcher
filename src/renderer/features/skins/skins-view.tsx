import { useEffect, useRef, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Spinner } from '../../components/ui/spinner';
import { SkinViewer } from 'skinview3d';
import { api } from '../../lib/preload-bridge';

export function SkinsView() {
  const [username, setUsername] = useState('MHF_Steve');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<SkinViewer | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const viewer = new SkinViewer({
      canvas: canvasRef.current,
      width: 320,
      height: 400,
      skin: 'https://textures.minecraft.net/texture/1a4af718455d4aab528e7a61f86fa25e6a369d17668dcb13d7dcf8f1f3bd0',
    });
    viewer.zoom = 0.85;
    viewer.autoRotate = true;
    viewerRef.current = viewer;
    return () => viewer.dispose();
  }, []);

  async function loadSkin(name: string) {
    setLoading(true);
    setError(null);
    try {
      // Try Mojang first, then Ely.by as a fallback (CORS-safe via main proxy).
      const mojangUrl = `https://api.mojang.com/users/profiles/minecraft/${name}`;
      const profileRes = await fetch(mojangUrl);
      if (profileRes.ok) {
        const profile = await profileRes.json();
        const texturesRes = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${profile.id}`);
        if (texturesRes.ok) {
          const textures = await texturesRes.json();
          const decoded = JSON.parse(atob(textures.properties[0].value));
          const skinUrl = decoded.textures.SKIN.url;
          viewerRef.current?.loadSkin(skinUrl);
          return;
        }
      }
      // Fallback: Ely.by skin texture (proxied through main to avoid CORS).
      const elybyUrl = `https://skins.ely.by/skins/${name}.png`;
      try {
        const base64 = await api.skin.fetchImageBase64(elybyUrl);
        viewerRef.current?.loadSkin(`data:image/png;base64,${base64}`);
      } catch {
        setError(`No skin found for "${name}"`);
      }
    } catch {
      setError(`Failed to load skin for "${name}"`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Skin viewer</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Render any player's skin in 3D. Falls back to Ely.by for non-Mojang accounts.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex justify-center items-center min-h-[440px]">
          <canvas ref={canvasRef} />
        </Card>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5 block">
              Username
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadSkin(username)}
              placeholder="Enter a username…"
            />
          </div>
          <Button variant="primary" onClick={() => loadSkin(username)} disabled={loading}>
            {loading ? <Spinner size={16} /> : null}
            Load skin
          </Button>
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <Card className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            The viewer uses skinview3d running entirely in the renderer — no server round-trip for
            rendering. Texture fetches go through the typed HttpClient when CORS would block them.
          </Card>
        </div>
      </div>
    </div>
  );
}
