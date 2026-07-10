import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsView } from '@/renderer/features/settings/settings-view';

// Mock the preload bridge.
const mockLoadSettings = vi.fn();
const mockSaveSettings = vi.fn();
const mockResetSettings = vi.fn();
vi.mock('@/renderer/lib/preload-bridge', () => ({
  api: {
    settings: {
      load: () => mockLoadSettings(),
      save: (s: unknown) => mockSaveSettings(s),
      reset: () => mockResetSettings(),
    },
  },
}));

const defaultSettings = {
  general: { theme: 'glass', language: 'en', minecraftRoot: '', discordRpc: true, autoUpdate: true, backgroundEffect: 'particles' },
  java: { customPath: '', autoDetect: true, args: [] },
  memory: { maxMb: 4096, minMb: 1024, autoAllocate: true },
  appearance: { glassmorphism: true, accentColor: '#6366f1', compactMode: false, reducedMotion: false },
  launch: { closeOnLaunch: false, showOverlay: true, autoOptimize: true, windowWidth: 854, windowHeight: 480, fullscreen: false },
  network: { concurrentDownloads: 4, verifyIntegrity: true, proxyUrl: '' },
  connect: { enabled: false, serverUrl: '', tunnelToken: '', tunnelEnabled: false },
};

describe('SettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadSettings.mockResolvedValue(defaultSettings);
    mockSaveSettings.mockResolvedValue(defaultSettings);
    mockResetSettings.mockResolvedValue(defaultSettings);
  });

  it('renders the settings heading', async () => {
    render(<SettingsView />);
    await waitFor(() => expect(screen.getByText('Settings')).toBeInTheDocument());
  });

  it('loads settings on mount', async () => {
    render(<SettingsView />);
    await waitFor(() => expect(mockLoadSettings).toHaveBeenCalled());
  });

  it('renders the Memory section', async () => {
    render(<SettingsView />);
    await waitFor(() => expect(screen.getByText('Memory')).toBeInTheDocument());
  });

  it('renders the Java section', async () => {
    render(<SettingsView />);
    await waitFor(() => expect(screen.getByText('Java')).toBeInTheDocument());
  });

  it('renders the Network section with integrity toggle', async () => {
    render(<SettingsView />);
    await waitFor(() => expect(screen.getByText('Network')).toBeInTheDocument());
    expect(screen.getByText('Verify download integrity')).toBeInTheDocument();
  });

  it('shows the IDK Connect tunnel token field', async () => {
    render(<SettingsView />);
    await waitFor(() => expect(screen.getByText('IDK Connect (tunneling)')).toBeInTheDocument());
    expect(screen.getByPlaceholderText(/Paste your frps token/)).toBeInTheDocument();
  });

  it('saves settings when the Save button is clicked', async () => {
    render(<SettingsView />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    await waitFor(() => expect(mockSaveSettings).toHaveBeenCalled());
  });

  it('resets settings when the Reset button is clicked', async () => {
    render(<SettingsView />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Reset/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Reset/i }));
    await waitFor(() => expect(mockResetSettings).toHaveBeenCalled());
  });
});
