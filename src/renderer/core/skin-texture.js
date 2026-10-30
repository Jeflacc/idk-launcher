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
 * Draw the full front-facing Minecraft character (head + torso + arms +
 * legs, including overlay layers) from a base64 skin PNG onto a canvas.
 * Used as a pixel-perfect 2D fallback when the WebGL 3D viewer is
 * unavailable. Left limbs are horizontally mirrored because the skin
 * atlas stores their front faces flipped.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string} base64 - base64-encoded PNG data
 */
export function drawSkinBodyFromBase64(canvas, base64) {
  if (!canvas || !base64) return;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    const w = canvas.width;
    const h = canvas.height;
    const scale = img.naturalWidth / 64;

    // Legacy pre-1.8 skins are 64x32: they have no separate left-limb or
    // overlay layers (the atlas rows at y>=32 don't exist), so the left arm
    // and left leg must be mirrored from the right side and all overlay
    // layers must be skipped. Modern skins are 64x64 with everything.
    const legacy = img.naturalHeight < 64;

    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    // Figure layout in 1-unit blocks: 12 wide (arms 2 + body 8 + arms 2)
    // x 32 tall (head 8 + torso 12 + legs 12). Unit snaps to a quarter
    // pixel so scaled pixels stay crisp.
    const unit = Math.floor((Math.min(w / 12, h / 32)) * 4) / 4;
    if (unit < 1) return;
    const ox = Math.round((w - 12 * unit) / 2);
    const oy = Math.round((h - 32 * unit) / 2) - unit;

    const draw = (sx, sy, sw, sh, dx, dy, mirror) => {
      // Never sample outside the texture atlas (legacy 64x32 skins only
      // contain the top half — out-of-range sources render as blank limbs).
      if (sy + sh > img.naturalHeight || sx + sw > img.naturalWidth) return;
      const tx = ox + dx * unit;
      const ty = oy + dy * unit;
      const tw = sw * unit;
      const th = sh * unit;
      ctx.save();
      if (mirror) {
        ctx.translate(tx + tw, ty);
        ctx.scale(-1, 1);
        ctx.drawImage(img, sx * scale, sy * scale, sw * scale, sh * scale, 0, 0, tw, th);
      } else {
        ctx.drawImage(img, sx * scale, sy * scale, sw * scale, sh * scale, tx, ty, tw, th);
      }
      ctx.restore();
    };

    // Subtle ground shadow under the feet (keeps the figure readable on any
    // background without a big dark rectangle behind the whole body).
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(ox + unit * 1.5, oy + unit * 29.5, 9 * unit, 2.5 * unit);

    // Head + hat overlay (8x8 at 8,8 / 40,8)
    draw(8, 8, 8, 8, 2, 0, false);
    draw(40, 8, 8, 8, 2, 0, false);

    // Body + jacket overlay (8x12 at 20,20 / 20,36 — overlay is 64x64 only)
    draw(20, 20, 8, 12, 2, 8, false);
    draw(20, 36, 8, 12, 2, 8, false);

    // Right arm + sleeve (4x12 at 44,20 / 44,36) — player's right side
    draw(44, 20, 4, 12, 10, 8, false);
    draw(44, 36, 4, 12, 10, 8, false);

    // Left arm + sleeve (4x12 at 36,52 / 52,52) — mirrored; legacy skins
    // fall back to mirroring the right arm (the atlas only has one arm).
    if (!legacy) {
      draw(36, 52, 4, 12, 0, 8, true);
      draw(52, 52, 4, 12, 0, 8, true);
    } else {
      draw(44, 20, 4, 12, 0, 8, true);
      draw(44, 36, 4, 12, 0, 8, true);
    }

    // Right leg + pants (4x12 at 4,20 / 4,36 — pants are 64x64 only)
    draw(4, 20, 4, 12, 2, 20, false);
    draw(4, 36, 4, 12, 2, 20, false);

    // Left leg + pants (4x12 at 20,52 / 4,52) — mirrored; legacy skins
    // mirror the right leg instead.
    if (!legacy) {
      draw(20, 52, 4, 12, 6, 20, true);
      draw(4, 52, 4, 12, 6, 20, true);
    } else {
      draw(4, 20, 4, 12, 6, 20, true);
      draw(4, 36, 4, 12, 6, 20, true);
    }
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
