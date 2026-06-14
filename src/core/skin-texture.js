/** Shared Minecraft skin URL + 2D face rendering helpers */

export async function getSkinTextureUrl(name, mode) {
  if (mode === 'elyby') {
    if (window.electronAPI?.fetchElybyProfile) {
      try {
        const res = await window.electronAPI.fetchElybyProfile(name);
        if (res.ok && res.data) {
          const textureProp = res.data?.properties?.find((p) => p.name === 'textures');
          if (textureProp) {
            const decoded = JSON.parse(atob(textureProp.value));
            const skinUrl = decoded?.textures?.SKIN?.url;
            if (skinUrl) return skinUrl;
          }
        }
      } catch {
        /* fallback below */
      }
    }
    return `https://skinsystem.ely.by/skins/${name}.png`;
  }
  return `https://minotar.net/skin/${name}`;
}

export async function resolveSkinTextureBase64(skinUrl) {
  let localTextureUrl = skinUrl;
  if (window.electronAPI?.fetchImageBase64) {
    try {
      const res = await window.electronAPI.fetchImageBase64(skinUrl);
      if (res?.ok && res.data) {
        return res.data;
      }
      const fallbackRes = await window.electronAPI.fetchImageBase64('https://minotar.net/skin/Steve');
      if (fallbackRes?.ok && fallbackRes.data) {
        return fallbackRes.data;
      }
    } catch (err) {
      console.error('[Skin] CORS proxy failed:', err);
    }
  }
  return localTextureUrl;
}

export function renderSkinFaceOnCanvas(canvas, skinUrl, fallbackUrl) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    const size = canvas.width;
    const scale = img.naturalWidth / 64;
    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 8 * scale, 8 * scale, 8 * scale, 8 * scale, 0, 0, size, size);
    ctx.drawImage(img, 40 * scale, 8 * scale, 8 * scale, 8 * scale, 0, 0, size, size);
  };
  img.onerror = () => {
    if (fallbackUrl && img.src !== fallbackUrl) {
      img.src = fallbackUrl;
    } else if (img.src !== 'https://minotar.net/skin/Steve') {
      img.src = 'https://minotar.net/skin/Steve';
    } else {
      ctx.fillStyle = '#3c3c3d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };
  img.src = skinUrl;
}

export async function loadAvatarForUser(canvas, name, authMode) {
  if (!canvas || !name) return;
  if (authMode === 'elyby') {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2d2d2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const url = await getSkinTextureUrl(name, 'elyby');
    renderSkinFaceOnCanvas(canvas, url, `https://skinsystem.ely.by/skins/${name}.png`);
  } else {
    renderSkinFaceOnCanvas(
      canvas,
      `https://minotar.net/skin/${name}`,
      'https://minotar.net/skin/Steve'
    );
  }
}
