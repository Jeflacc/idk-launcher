import type { ElybyClient } from '@/infrastructure/net/api/elyby-client';
import type { SecretStore } from '@/infrastructure/crypto/secret-store';
import { AccountEntity } from '@/domain/entities/account';
import { createServer, type Server } from 'node:http';
import { shell } from 'electron';

/**
 * Authenticate against Ely.by. Replaces v1's inline auth flow inside the
 * 5,402-line electron-main.cjs. Tokens are persisted ONLY to the encrypted
 * SecretStore (never to settings.json).
 */
export class AuthenticateElyby {
  constructor(
    private readonly elyby: ElybyClient,
    private readonly secrets: SecretStore,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectPort: number,
  ) {}

  async execute(username: string, password: string): Promise<AccountEntity> {
    const res = await this.elyby.authenticate(username, password);
    const account = new AccountEntity('elyby', res.username, res.uuid);
    const current = await this.secrets.load();
    await this.secrets.save({
      ...current,
      elyby: {
        accessToken: res.access_token,
        username: res.username,
        uuid: res.uuid,
        expiresAt: Date.now() + res.expires_in * 1000,
      },
    });
    return account;
  }

  async executeOAuth(): Promise<AccountEntity> {
    const redirectUri = `http://127.0.0.1:${this.redirectPort}/callback`;
    const authUrl =
      `https://account.ely.by/oauth2/v1` +
      `?client_id=${encodeURIComponent(this.clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('account_info offline_access')}`;

    const code = await this.waitForOAuthCode(authUrl);

    const tokenRes = await this.elyby.exchangeOAuthCode(
      code,
      this.clientId,
      this.clientSecret,
      redirectUri,
    );

    const userInfo = await this.elyby.fetchOAuthUserInfo(tokenRes.access_token);

    const account = new AccountEntity('elyby', userInfo.username, userInfo.uuid);
    const current = await this.secrets.load();
    await this.secrets.save({
      ...current,
      elyby: {
        accessToken: tokenRes.access_token,
        refreshToken: tokenRes.refresh_token,
        username: userInfo.username,
        uuid: userInfo.uuid,
        expiresAt: Date.now() + tokenRes.expires_in * 1000,
      },
    });

    return account;
  }

  private waitForOAuthCode(authUrl: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        server.close();
        reject(new Error('OAuth login timed out after 5 minutes'));
      }, 5 * 60 * 1000);

      const server: Server = createServer((req, res) => {
        const url = new URL(req.url!, `http://localhost:${this.redirectPort}`);

        if (url.pathname === '/callback') {
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            clearTimeout(timeout);
            server.close();
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<html><body><h2>Login failed</h2><p>You can close this tab.</p></body></html>');
            reject(new Error(`OAuth error: ${error}`));
            return;
          }

          if (code) {
            clearTimeout(timeout);
            server.close();
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<html><body><h2>Login successful!</h2><p>You can close this tab and return to the launcher.</p></body></html>');
            resolve(code);
            return;
          }
        }

        res.writeHead(404);
        res.end();
      });

      server.listen(this.redirectPort, '127.0.0.1', () => {
        shell.openExternal(authUrl);
      });

      server.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start local OAuth server on port ${this.redirectPort}: ${err.message}`));
      });
    });
  }
}
