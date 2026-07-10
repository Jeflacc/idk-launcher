import { registerInvoke } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { IdkConnectSchema } from '@shared/schemas/idk-connect.schema';
import type { WindowManager } from '../../windows/window-manager';
import type { IdkConnectClient } from '@/infrastructure/net/api/idk-connect-client';
import type { SecretStore } from '@/infrastructure/crypto/secret-store';

/**
 * IDK Connect IPC handlers.
 *
 * Every handler:
 *   1. Reads the token from SecretStore (never from the renderer).
 *   2. Calls the corresponding IdkConnectClient method.
 *   3. Returns the result; never leaks the token to the renderer.
 *
 * Auth handlers (Login, Register, Verify2fa, LoginWithMinecraft, CompleteOAuth)
 * store the token in SecretStore immediately and return only { success, user }.
 */
export function registerIdkConnectHandlers(
  windows: WindowManager,
  client: IdkConnectClient,
  secrets: SecretStore,
): void {
  const senderOk = (event: Electron.IpcMainInvokeEvent) => windows.assertSender(event, 'main');

  // Helper: read the IDK Connect token from SecretStore
  async function getToken(): Promise<string | null> {
    const s = await secrets.load();
    return s.idkConnect?.token ?? null;
  }

  // Helper: store the token + username in SecretStore
  async function storeToken(token: string, username: string): Promise<void> {
    const s = await secrets.load();
    await secrets.save({ ...s, idkConnect: { token, username } });
  }

  // ── Auth ────────────────────────────────────────────────────────────────

  registerInvoke(
    IpcChannel.IdkConnect.RequestOtp,
    IdkConnectSchema.requestOtp,
    async (_e, args) => {
      await client.requestOtp(args.email, args.username);
      return { success: true };
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.IdkConnect.Register,
    IdkConnectSchema.register,
    async (_e, args) => {
      const result = await client.register(args.username, args.email, args.password, args.otp);
      await storeToken(result.token, result.user.username);
      return { success: true, user: result.user };
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.IdkConnect.Login,
    IdkConnectSchema.login,
    async (_e, args) => {
      const result = await client.login(args.username, args.password);
      if (result.requires2fa) {
        return { requires2fa: true };
      }
      if (result.token && result.user) {
        await storeToken(result.token, result.user.username);
        return { success: true, user: result.user };
      }
      throw new Error('Login failed: no token returned');
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.IdkConnect.Verify2fa,
    IdkConnectSchema.verify2fa,
    async (_e, args) => {
      const result = await client.verify2fa(args.username, args.password, args.otp);
      await storeToken(result.token, result.user.username);
      return { success: true, user: result.user };
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.IdkConnect.GetMe,
    IdkConnectSchema.getMe,
    async () => {
      const token = await getToken();
      if (!token) return null;
      return client.getMe(token);
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.IdkConnect.LoginWithMinecraft,
    IdkConnectSchema.loginWithMinecraft,
    async (_e, args) => {
      const result = await client.loginWithMinecraft(args.minecraftUsername, args.authMode);
      await storeToken(result.token, result.user.username);
      return { success: true, user: result.user };
    },
    { senderCheck: senderOk },
  );

  // ── OAuth ───────────────────────────────────────────────────────────────

  registerInvoke(
    IpcChannel.IdkConnect.GetDiscordOAuthUrl,
    IdkConnectSchema.getDiscordOAuthUrl,
    async (_e, args) => {
      const linkToken = (args as { linkToken?: string } | undefined)?.linkToken;
      return { url: client.getDiscordOAuthUrl(linkToken) };
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.IdkConnect.GetGoogleOAuthUrl,
    IdkConnectSchema.getGoogleOAuthUrl,
    async (_e, args) => {
      const linkToken = (args as { linkToken?: string } | undefined)?.linkToken;
      return { url: client.getGoogleOAuthUrl(linkToken) };
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.IdkConnect.CompleteOAuth,
    IdkConnectSchema.completeOAuth,
    async (_e, args) => {
      const result = await client.completeOAuth(args.session, args.username);
      // Fetch the user object using the new token
      const user = await client.getMe(result.token);
      await storeToken(result.token, user.username);
      return { success: true, user };
    },
    { senderCheck: senderOk },
  );

  // ── Settings ────────────────────────────────────────────────────────────

  registerInvoke(
    IpcChannel.IdkConnect.UpdateProfile,
    IdkConnectSchema.updateProfile,
    async (_e, args) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      await client.updateProfile(token, args.bio);
      return { success: true };
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.IdkConnect.ChangeUsername,
    IdkConnectSchema.changeUsername,
    async (_e, args) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const result = await client.changeUsername(token, args.newUsername);
      await storeToken(result.token, result.user.username);
      return { success: true, user: result.user };
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.IdkConnect.ChangePassword,
    IdkConnectSchema.changePassword,
    async (_e, args) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      await client.changePassword(token, args.oldPassword, args.newPassword);
      return { success: true };
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.IdkConnect.DeleteAccount,
    IdkConnectSchema.deleteAccount,
    async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      await client.deleteAccount(token);
      // Clear the token after account deletion
      const s = await secrets.load();
      await secrets.save({ ...s, idkConnect: undefined });
      return { success: true };
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.IdkConnect.RequestSecurityOtp,
    IdkConnectSchema.requestSecurityOtp,
    async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      await client.requestSecurityOtp(token);
      return { success: true };
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.IdkConnect.UpdateSecurity,
    IdkConnectSchema.updateSecurity,
    async (_e, args) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      await client.updateSecurity(token, args.newPassword, args.twoFactorEnabled, args.otp);
      return { success: true };
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.IdkConnect.LinkMinecraft,
    IdkConnectSchema.linkMinecraft,
    async (_e, args) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      await client.linkMinecraft(token, args.minecraftUsername, args.authMode);
      return { success: true };
    },
    { senderCheck: senderOk },
  );

  // ── Users ───────────────────────────────────────────────────────────────

  registerInvoke(
    IpcChannel.IdkConnect.SearchUsers,
    IdkConnectSchema.searchUsers,
    async (_e, args) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return client.searchUsers(token, args.query);
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.IdkConnect.GetUserProfile,
    IdkConnectSchema.getUserProfile,
    async (_e, args) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return client.getUserProfile(token, args.username);
    },
    { senderCheck: senderOk },
  );

  // ── Friends ─────────────────────────────────────────────────────────────

  registerInvoke(
    IpcChannel.IdkConnect.GetFriends,
    IdkConnectSchema.getFriends,
    async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return client.getFriends(token);
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.IdkConnect.GetFriendRequests,
    IdkConnectSchema.getFriendRequests,
    async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return client.getFriendRequests(token);
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.IdkConnect.SendFriendRequest,
    IdkConnectSchema.sendFriendRequest,
    async (_e, args) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      await client.sendFriendRequest(token, args.username);
      return { success: true };
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.IdkConnect.HandleFriendRequest,
    IdkConnectSchema.handleFriendRequest,
    async (_e, args) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      await client.handleFriendRequest(token, args.requestId, args.accept);
      return { success: true };
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.IdkConnect.RemoveFriend,
    IdkConnectSchema.removeFriend,
    async (_e, args) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      await client.removeFriend(token, args.friendId);
      return { success: true };
    },
    { senderCheck: senderOk },
  );

  // ── Messages ────────────────────────────────────────────────────────────

  registerInvoke(
    IpcChannel.IdkConnect.GetMessages,
    IdkConnectSchema.getMessages,
    async (_e, args) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return client.getMessages(token, args.friendId, args.limit);
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.IdkConnect.SendMessage,
    IdkConnectSchema.sendMessage,
    async (_e, args) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return client.sendMessage(token, args.friendId, args.text);
    },
    { senderCheck: senderOk },
  );

  // ── Presence ────────────────────────────────────────────────────────────

  registerInvoke(
    IpcChannel.IdkConnect.SendPresence,
    IdkConnectSchema.sendPresence,
    async (_e, args) => {
      const token = await getToken();
      if (!token) return { success: false };
      await client.sendPresence(token, args.status, args.playingVersion, args.cloudflaredUrl);
      return { success: true };
    },
    { senderCheck: senderOk },
  );

  // ── Token management ────────────────────────────────────────────────────

  registerInvoke(
    IpcChannel.IdkConnect.GetStoredSession,
    IdkConnectSchema.getStoredSession,
    async () => {
      const s = await secrets.load();
      if (!s.idkConnect) return null;
      return { username: s.idkConnect.username };
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.IdkConnect.StoreToken,
    IdkConnectSchema.storeToken,
    async (_e, args) => {
      await storeToken(args.token, args.username);
      return { success: true };
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.IdkConnect.ClearToken,
    IdkConnectSchema.clearToken,
    async () => {
      const s = await secrets.load();
      await secrets.save({ ...s, idkConnect: undefined });
      return { success: true };
    },
    { senderCheck: senderOk },
  );
}
