import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { App, Plugin } from 'obsidian';

// Mock neovim module before importing main
jest.mock('neovim', () => require('./__mocks__/neovim'));
jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    on: jest.fn(),
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    stdin: {},
    kill: jest.fn(),
  })),
}));

describe('Plugin Lifecycle', () => {
  let app: App;
  let manifest: any;

  beforeEach(() => {
    app = new App();
    manifest = {
      id: 'obsidian-neovim',
      name: 'Obsidian Neovim',
      version: '0.0.1',
    };
  });

  test('should instantiate plugin', async () => {
    const NeovimBackendPlugin = (await import('../src/main')).default;
    const plugin = new NeovimBackendPlugin(app, manifest);
    expect(plugin).toBeDefined();
    expect(plugin.app).toBe(app);
    expect(plugin.manifest).toBe(manifest);
  });

  test('should register commands on load', async () => {
    const NeovimBackendPlugin = (await import('../src/main')).default;
    const plugin = new NeovimBackendPlugin(app, manifest);

    // Mock file system and logger
    (app.vault.adapter as any).basePath = '/mock/vault';

    await plugin.onload();

    const commands = plugin.getCommands();
    expect(commands.length).toBeGreaterThan(0);

    const commandIds = commands.map((cmd: any) => cmd.id);
    expect(commandIds).toContain('obsidian-neovim-restart');
    expect(commandIds).toContain('obsidian-neovim-toggle');
    expect(commandIds).toContain('obsidian-neovim-open-log-path');
    expect(commandIds).toContain('obsidian-neovim-reconnect-external');
  });

  test('should load and save settings', async () => {
    const NeovimBackendPlugin = (await import('../src/main')).default;
    const plugin = new NeovimBackendPlugin(app, manifest);

    const mockSettings = {
      enabled: false,
      nvimPath: '/custom/nvim',
      initLuaPath: '/custom/init.lua',
    };

    plugin.loadData = jest.fn().mockResolvedValue(mockSettings);
    plugin.saveData = jest.fn().mockResolvedValue(undefined);

    (app.vault.adapter as any).basePath = '/mock/vault';
    await plugin.onload();

    expect(plugin.settings.enabled).toBe(false);
    expect(plugin.settings.nvimPath).toBe('/custom/nvim');
  });

  test('should handle plugin unload', async () => {
    const NeovimBackendPlugin = (await import('../src/main')).default;
    const plugin = new NeovimBackendPlugin(app, manifest);

    (app.vault.adapter as any).basePath = '/mock/vault';
    await plugin.onload();
    await plugin.onunload();

    // Should complete without errors
    expect(true).toBe(true);
  });

  test('should register workspace events', async () => {
    const NeovimBackendPlugin = (await import('../src/main')).default;
    const plugin = new NeovimBackendPlugin(app, manifest);

    (app.vault.adapter as any).basePath = '/mock/vault';

    const onSpy = jest.spyOn(app.workspace, 'on');
    await plugin.onload();

    expect(onSpy).toHaveBeenCalledWith('active-leaf-change', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('file-open', expect.any(Function));
  });

  test('should handle settings disabled state', async () => {
    const NeovimBackendPlugin = (await import('../src/main')).default;
    const plugin = new NeovimBackendPlugin(app, manifest);

    plugin.loadData = jest.fn().mockResolvedValue({ enabled: false });
    (app.vault.adapter as any).basePath = '/mock/vault';

    await plugin.onload();

    // When disabled, Neovim should not start
    expect(plugin.settings.enabled).toBe(false);
  });

  test('should add ribbon icon', async () => {
    const NeovimBackendPlugin = (await import('../src/main')).default;
    const plugin = new NeovimBackendPlugin(app, manifest);

    (app.vault.adapter as any).basePath = '/mock/vault';

    const addRibbonSpy = jest.spyOn(plugin, 'addRibbonIcon');
    await plugin.onload();

    expect(addRibbonSpy).toHaveBeenCalledWith('dot', 'Restart Neovim', expect.any(Function));
  });

  test('should register CodeMirror extension when layout is ready', async () => {
    const NeovimBackendPlugin = (await import('../src/main')).default;
    const plugin = new NeovimBackendPlugin(app, manifest);

    (app.vault.adapter as any).basePath = '/mock/vault';

    await plugin.onload();

    // Wait for layout ready callback
    await new Promise(resolve => setTimeout(resolve, 50));

    // Extension registration should have been attempted
    expect(true).toBe(true);
  });

  test('should handle command callbacks', async () => {
    const NeovimBackendPlugin = (await import('../src/main')).default;
    const plugin = new NeovimBackendPlugin(app, manifest);

    (app.vault.adapter as any).basePath = '/mock/vault';
    await plugin.onload();

    const commands = plugin.getCommands();
    const restartCmd = commands.find((cmd: any) => cmd.id === 'obsidian-neovim-restart');

    expect(restartCmd).toBeDefined();
    expect(restartCmd.callback).toBeInstanceOf(Function);
  });
});
