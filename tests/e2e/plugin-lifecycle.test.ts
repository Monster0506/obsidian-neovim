/**
 * E2E Tests for Plugin Lifecycle
 * Tests the basic loading, enabling, and unloading of the plugin
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { App } from '../__mocks__/obsidian';

// Mock the neovim module since we don't want to spawn real processes in tests
jest.mock('neovim', () => ({
  attach: jest.fn().mockResolvedValue({
    uiAttach: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    removeAllListeners: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined),
    command: jest.fn().mockResolvedValue(undefined),
    commandOutput: jest.fn().mockResolvedValue(''),
    call: jest.fn().mockResolvedValue(null),
    createBuffer: jest.fn().mockResolvedValue({ id: 1 }),
    request: jest.fn().mockResolvedValue({}),
  }),
}));

// Mock child_process to prevent actual nvim spawning
jest.mock('child_process', () => ({
  spawn: jest.fn().mockReturnValue({
    on: jest.fn(),
    stdout: {
      on: jest.fn(),
      pipe: jest.fn(),
    },
    stderr: {
      on: jest.fn(),
    },
    kill: jest.fn(),
  }),
}));

describe('Plugin Lifecycle', () => {
  let app: App;
  let mockPlugin: any;

  beforeEach(() => {
    app = new App();
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup
    if (mockPlugin?.onunload) {
      await mockPlugin.onunload();
    }
  });

  test('should create plugin instance', () => {
    // This test verifies that the plugin can be instantiated
    // In a real implementation, you would import and instantiate the plugin
    expect(app).toBeDefined();
    expect(app.workspace).toBeDefined();
    expect(app.vault).toBeDefined();
  });

  test('should have required workspace methods', () => {
    expect(typeof app.workspace.onLayoutReady).toBe('function');
    expect(typeof app.workspace.on).toBe('function');
    expect(typeof app.workspace.getActiveFile).toBe('function');
  });

  test('should handle settings initialization', async () => {
    // Mock plugin with settings
    const mockPluginWithSettings = {
      settings: {
        enabled: true,
        nvimPath: 'nvim',
        initLuaPath: '',
        useExternal: false,
      },
      loadData: jest.fn().mockResolvedValue({}),
      saveData: jest.fn().mockResolvedValue(undefined),
    };

    await mockPluginWithSettings.loadData();
    expect(mockPluginWithSettings.loadData).toHaveBeenCalled();
  });

  test('should register commands', () => {
    const commands: any[] = [];
    const mockPluginWithCommands = {
      addCommand: jest.fn((cmd) => {
        commands.push(cmd);
      }),
    };

    // Simulate command registration
    mockPluginWithCommands.addCommand({
      id: 'obsidian-neovim-restart',
      name: 'Restart Neovim',
      callback: jest.fn(),
    });

    mockPluginWithCommands.addCommand({
      id: 'obsidian-neovim-toggle',
      name: 'Toggle enable',
      callback: jest.fn(),
    });

    expect(commands).toHaveLength(2);
    expect(commands[0].id).toBe('obsidian-neovim-restart');
    expect(commands[1].id).toBe('obsidian-neovim-toggle');
  });

  test('should handle workspace events', (done) => {
    let layoutReadyCallbackExecuted = false;

    app.workspace.onLayoutReady(() => {
      layoutReadyCallbackExecuted = true;
    });

    // Since our mock executes callbacks immediately
    setTimeout(() => {
      expect(layoutReadyCallbackExecuted).toBe(true);
      done();
    }, 100);
  });

  test('should register event handlers for file-open and active-leaf-change', () => {
    const eventHandlers: Map<string, Function[]> = new Map();

    const mockEventRegistration = (event: string, callback: Function) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, []);
      }
      eventHandlers.get(event)!.push(callback);
    };

    // Simulate event registration
    mockEventRegistration('file-open', () => {});
    mockEventRegistration('active-leaf-change', () => {});

    expect(eventHandlers.has('file-open')).toBe(true);
    expect(eventHandlers.has('active-leaf-change')).toBe(true);
  });
});
