import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiscordRpcService } from '@/infrastructure/discord/discord-rpc-service';

function mockClient() {
  return {
    login: vi.fn().mockResolvedValue(undefined),
    setActivity: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
  };
}

describe('DiscordRpcService', () => {
  let service: InstanceType<typeof DiscordRpcService>;
  let client: ReturnType<typeof mockClient>;

  beforeEach(() => {
    client = mockClient();
    service = new DiscordRpcService('test-client-id', () => client);
  });

  it('connect logs in with the client id', async () => {
    await service.connect();
    expect(client.login).toHaveBeenCalledWith({ clientId: 'test-client-id' });
  });

  it('connect is idempotent (does not log in twice)', async () => {
    await service.connect();
    await service.connect();
    expect(client.login).toHaveBeenCalledTimes(1);
  });

  it('connect fails silently when Discord is not running', async () => {
    client.login.mockRejectedValueOnce(new Error('ENOENT'));
    await service.connect(); // should not throw
  });

  it('setActivity is a no-op when not connected', () => {
    service.setActivity({ details: 'Playing', state: 'In game' });
    expect(client.setActivity).not.toHaveBeenCalled();
  });

  it('setActivity calls the client when connected', async () => {
    await service.connect();
    service.setActivity({ details: 'Playing', state: 'In game' });
    expect(client.setActivity).toHaveBeenCalled();
  });

  it('disconnect destroys the client and resets state', async () => {
    await service.connect();
    await service.disconnect();
    expect(client.destroy).toHaveBeenCalled();
    service.setActivity({ details: 'x', state: 'y' });
    expect(client.setActivity).not.toHaveBeenCalled();
  });

  it('supports an async client factory', async () => {
    const asyncClient = mockClient();
    service = new DiscordRpcService('id', async () => asyncClient);
    await service.connect();
    expect(asyncClient.login).toHaveBeenCalledWith({ clientId: 'id' });
  });
});
