/**
 * Shared Minecraft skin rendering helpers.
 *
 * v2 architecture: All skin texture fetching goes through IPC
 * (window.electronAPI.resolveSkinTextureBase64). The renderer NEVER
 * constructs skin URLs or decodes base64 JWT payloads — that's all
 * done server-side in the v2 backend.
 *
 * The renderer only receives a base64-encoded PNG and draws it on a canvas.
 */

/**
 * Resolve a skin texture as base64 via IPC.
 * This is the v2 replacement for the old getSkinTextureUrl + resolveSkinTextureBase64 two-step.
 * The backend handles URL resolution, CORS proxying, and base64 encoding.
 *
 * @param {string} username
 * @param {'offline'|'microsoft'|'elyby'} authMode
 * @returns {Promise<{base64: string, source: string}>}
 */
export async function resolveSkinTextureBase64(username, authMode = 'offline') {
  if (window.electronAPI?.resolveSkinTextureBase64) {
    return window.electronAPI.resolveSkinTextureBase64(username, authMode);
  }
  return { base64: '', source: 'steve' };
}

/**
 * Legacy compatibility: returns a skin texture URL.
 * In v2, URL construction is done server-side. This function is kept
 * for callers that haven't been migrated yet — it returns a data: URL
 * by fetching via IPC, or an empty string on failure.
 *
 * @deprecated Use resolveSkinTextureBase64() directly.
 */
export async function getSkinTextureUrl(name, mode) {
  // In v2, we don't construct URLs in the renderer. Return a sentinel
  // that callers can pass to resolveSkinTextureBase64().
  // Callers should migrate to resolveSkinTextureBase64() directly.
  return `ipcskin://${name}/${mode}`;
}

/**
 * Legacy compatibility: resolve a skin texture URL to base64.
 * Delegates to the IPC skin resolver.
 *
 * @deprecated Use resolveSkinTextureBase64() directly.
 */
export async function resolveSkinTextureBase64FromUrl(skinUrl) {
  // Parse the ipcskin:// sentinel, or just return empty for real URLs
  if (skinUrl?.startsWith('ipcskin://')) {
    const parts = skinUrl.replace('ipcskin://', '').split('/');
    const name = parts[0];
    const mode = parts[1] || 'offline';
    const result = await resolveSkinTextureBase64(name, mode);
    return result?.base64 || '';
  }
  // For real URLs, use the generic image base64 fetcher
  if (window.electronAPI?.fetchImageBase) {
    try {
      return await window.electronAPI.fetchImageBase(skinUrl);
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * Legacy compatibility: returns a cape texture URL.
 * In v2, cape resolution is done server-side. Returns null (no cape) for now.
 *
 * @deprecated
 */
export async function getCapeTextureUrl(name, mode) {
  return null;
}

/**
 * Resolve a skin texture as base64 via IPC, then draw the face on a canvas.
 * Tries Ely.by (for microsoft/elyby auth) → Minotar (for offline) → Steve fallback.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string} username
 * @param {'offline'|'microsoft'|'elyby'} authMode
 */
export async function loadAvatarForUser(canvas, name, authMode) {
  if (!canvas || !name) return;
  const ctx = canvas.getContext('2d');

  // Fill background while loading
  ctx.fillStyle = '#2d2d2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  try {
    const result = await resolveSkinTextureBase64(name, authMode || 'offline');
    if (result?.base64) {
      drawSkinFaceFromBase64(canvas, result.base64);
      return;
    }
  } catch (err) {
    console.warn('[Skin] Failed to resolve skin texture:', err);
  }

  // Fallback: draw initials
  drawFallbackAvatar(ctx, canvas, name);
}

/**
 * Draw a Minecraft face from a base64-encoded skin PNG onto a canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {string} base64 - base64-encoded PNG data
 */
export function drawSkinFaceFromBase64(canvas, base64) {
  if (!canvas || !base64) return;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    const size = canvas.width;
    const scale = img.naturalWidth / 64;
    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;
    // Face base (8x8 at offset 8,8)
    ctx.drawImage(img, 8 * scale, 8 * scale, 8 * scale, 8 * scale, 0, 0, size, size);
    // Hat/accessory layer (8x8 at offset 40,8)
    ctx.drawImage(img, 40 * scale, 8 * scale, 8 * scale, 8 * scale, 0, 0, size, size);
  };
  img.src = `data:image/png;base64,${base64}`;
}

/**
 * Draw a fallback avatar with the user's initials.
 */
function drawFallbackAvatar(ctx, canvas, name) {
  ctx.fillStyle = '#3c3c3d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.floor(canvas.width / 2)}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.substring(0, 2).toUpperCase(), canvas.width / 2, canvas.height / 2);
}

/**
 * Legacy compatibility: render skin face from a URL.
 * Kept for any callers that still pass URLs (will be removed in a future phase).
 * @deprecated Use loadAvatarForUser() which uses IPC.
 */
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
    } else {
      drawFallbackAvatar(ctx, canvas, '??');
    }
  };
  img.src = skinUrl;
}
