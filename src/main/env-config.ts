import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = join(__dirname, '..', '..');

function loadDotEnv(): void {
  const envPath = join(PROJECT_ROOT, '.env');
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, 'utf-8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

export const env = {
  idkConnectBaseUrl: process.env['IDK_CONNECT_BASE_URL'] ?? 'https://api.somniac.me',
  curseforgeApiKey: process.env['CURSEFORGE_API_KEY'] ?? '',
  curseToolsBaseUrl: process.env['CURSE_TOOLS_BASE_URL'] ?? 'https://api.curse.tools/v1/cf',
  discordClientId: process.env['DISCORD_CLIENT_ID'] ?? '1505559083929964554',
  elybyClientId: process.env['ELYBY_CLIENT_ID'] ?? 'idk-launcher',
  elybyClientSecret: process.env['ELYBY_CLIENT_SECRET'] ?? '',
  elybyRedirectPort: Number(process.env['ELYBY_REDIRECT_PORT'] ?? 29487),
  mojangContentBaseUrl: process.env['MOJANG_CONTENT_BASE_URL'] ?? 'https://launchercontent.mojang.com',
  minotarBaseUrl: process.env['MINOTAR_BASE_URL'] ?? 'https://minotar.net',
  elyskinsBaseUrl: process.env['ELYSKINS_BASE_URL'] ?? 'https://skinsystem.ely.by',
  isDev: Boolean(process.env['VITE_DEV_SERVER_URL']),
};
