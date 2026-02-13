import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { App } from 'obsidian';

// Mock neovim module
jest.mock('neovim', () => ({
  attach: jest.fn().mockResolvedValue({
    command: jest.fn(),
    call: jest.fn(),
    setClientInfo: jest.fn(),
    uiAttach: jest.fn(),
    on: jest.fn(),
    createBuffer: jest.fn().mockResolvedValue({
      attach: jest.fn(),
      detach: jest.fn(),
      listen: jest.fn(),
    }),
  }),
  NeovimClient: jest.fn(),
}));

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn().mockReturnValue({
    on: jest.fn(),
    kill: jest.fn(),
    stdin: { write: jest.fn() },
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
  }),
}));

describe('Plugin Lifecycle', () => {
  let app: App;

  beforeEach(() => {
    app = new App();
  });

  it('should create app instance', () => {
    expect(app).toBeDefined();
    expect(app.workspace).toBeDefined();
    expect(app.vault).toBeDefined();
  });

  it('should have workspace with methods', () => {
    expect(typeof app.workspace.onLayoutReady).toBe('function');
    expect(typeof app.workspace.on).toBe('function');
    expect(typeof app.workspace.getActiveFile).toBe('function');
  });

  it('should trigger layout ready callback', (done) => {
    app.workspace.onLayoutReady(() => {
      expect(true).toBe(true);
      done();
    });
  });

  it('should handle workspace events', () => {
    const callback = jest.fn();
    app.workspace.on('active-leaf-change', callback);
    app.workspace.triggerEvent('active-leaf-change', {});
    expect(callback).toHaveBeenCalled();
  });

  it('should have vault with base path', () => {
    const basePath = app.vault.getBasePath();
    expect(basePath).toBeDefined();
    expect(typeof basePath).toBe('string');
  });
});
