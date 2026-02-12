import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { App } from 'obsidian';

// Mock neovim
const mockNvimClient = {
  command: jest.fn().mockResolvedValue(undefined),
  call: jest.fn().mockResolvedValue(undefined),
  setClientInfo: jest.fn().mockResolvedValue(undefined),
  uiAttach: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  createBuffer: jest.fn().mockResolvedValue({
    attach: jest.fn().mockResolvedValue(true),
    detach: jest.fn().mockResolvedValue(true),
    listen: jest.fn(),
    number: 1,
  }),
  quit: jest.fn().mockResolvedValue(undefined),
};

jest.mock('neovim', () => ({
  attach: jest.fn().mockResolvedValue(mockNvimClient),
  NeovimClient: jest.fn(),
}));

// Mock child_process
const mockProcess = {
  on: jest.fn(),
  kill: jest.fn(),
  stdin: { write: jest.fn() },
  stdout: { on: jest.fn() },
  stderr: { on: jest.fn() },
};

jest.mock('child_process', () => ({
  spawn: jest.fn().mockReturnValue(mockProcess),
}));

import { NvimHost } from '../src/nvim';

describe('Neovim Integration', () => {
  let app: App;
  let nvimHost: NvimHost;

  beforeEach(() => {
    app = new App();
    jest.clearAllMocks();
  });

  it('should create NvimHost instance', () => {
    nvimHost = new NvimHost(app, { nvimPath: 'nvim' });
    expect(nvimHost).toBeDefined();
  });

  it('should start Neovim process', async () => {
    const { spawn } = require('child_process');
    nvimHost = new NvimHost(app, { nvimPath: 'nvim' });

    await nvimHost.start();

    expect(spawn).toHaveBeenCalled();
    expect(nvimHost.nvim).toBeDefined();
  });

  it('should handle external socket connection', async () => {
    const { attach } = require('neovim');
    nvimHost = new NvimHost(app, {
      externalSocketPath: '/tmp/nvim.sock',
    });

    await nvimHost.start();

    expect(attach).toHaveBeenCalledWith({ socket: '/tmp/nvim.sock' });
  });

  it('should handle external TCP connection', async () => {
    const { attach } = require('neovim');
    nvimHost = new NvimHost(app, {
      externalHost: '127.0.0.1',
      externalPort: 8000,
    });

    await nvimHost.start();

    expect(attach).toHaveBeenCalledWith({
      address: '127.0.0.1',
      port: 8000,
    });
  });

  it('should register redraw handler', async () => {
    nvimHost = new NvimHost(app, { nvimPath: 'nvim' });
    await nvimHost.start();

    const handler = jest.fn();
    nvimHost.onRedraw = handler;

    expect(nvimHost.onRedraw).toBe(handler);
  });

  it('should register onLines handler', async () => {
    nvimHost = new NvimHost(app, { nvimPath: 'nvim' });
    await nvimHost.start();

    const handler = jest.fn();
    nvimHost.onLines = handler;

    expect(nvimHost.onLines).toBe(handler);
  });

  it('should register cursor handler', async () => {
    nvimHost = new NvimHost(app, { nvimPath: 'nvim' });
    await nvimHost.start();

    const handler = jest.fn();
    nvimHost.onCursor = handler;

    expect(nvimHost.onCursor).toBe(handler);
  });

  it('should stop Neovim process', async () => {
    nvimHost = new NvimHost(app, { nvimPath: 'nvim' });
    await nvimHost.start();

    await nvimHost.stop();

    expect(mockProcess.kill).toHaveBeenCalled();
  });
});
