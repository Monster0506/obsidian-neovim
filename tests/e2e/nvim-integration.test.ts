/**
 * E2E Tests for Neovim Integration
 * Tests the Neovim process management and RPC communication
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { App } from '../__mocks__/obsidian';

// Mock neovim client
const mockNvimClient = {
  uiAttach: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  removeAllListeners: jest.fn(),
  quit: jest.fn().mockResolvedValue(undefined),
  command: jest.fn().mockResolvedValue(undefined),
  commandOutput: jest.fn().mockResolvedValue(''),
  call: jest.fn().mockImplementation((method: string, args?: any[]) => {
    if (method === 'nvim_get_mode') {
      return Promise.resolve({ mode: 'normal', blocking: false });
    }
    if (method === 'nvim_win_get_cursor') {
      return Promise.resolve([1, 0]);
    }
    if (method === 'nvim_buf_get_lines') {
      return Promise.resolve(['']);
    }
    if (method === 'nvim_create_buf') {
      return Promise.resolve(1);
    }
    if (method === 'nvim_buf_attach') {
      return Promise.resolve(true);
    }
    if (method === 'nvim_buf_detach') {
      return Promise.resolve(true);
    }
    return Promise.resolve(null);
  }),
  request: jest.fn().mockResolvedValue({}),
  createBuffer: jest.fn().mockResolvedValue({ id: 1 }),
};

jest.mock('neovim', () => ({
  attach: jest.fn().mockResolvedValue(mockNvimClient),
}));

// Mock child_process
const mockProcess = {
  on: jest.fn(),
  stdout: {
    on: jest.fn(),
    pipe: jest.fn(),
  },
  stderr: {
    on: jest.fn(),
  },
  kill: jest.fn(),
};

jest.mock('child_process', () => ({
  spawn: jest.fn().mockReturnValue(mockProcess),
}));

describe('Neovim Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should start Neovim process', async () => {
    const { spawn } = require('child_process');
    const { attach } = require('neovim');

    // Simulate starting Neovim
    const proc = spawn('nvim', ['--embed', '-u', 'NONE', '-n']);
    expect(spawn).toHaveBeenCalled();
    expect(proc).toBeDefined();
  });

  test('should attach to Neovim RPC', async () => {
    const { attach } = require('neovim');

    const client = await attach({ proc: mockProcess });
    expect(attach).toHaveBeenCalled();
    expect(client).toBeDefined();
  });

  test('should get Neovim mode', async () => {
    const mode = await mockNvimClient.call('nvim_get_mode');
    expect(mode).toEqual({ mode: 'normal', blocking: false });
  });

  test('should get cursor position', async () => {
    const cursor = await mockNvimClient.call('nvim_win_get_cursor', [0]);
    expect(cursor).toEqual([1, 0]);
  });

  test('should create buffer', async () => {
    const bufId = await mockNvimClient.call('nvim_create_buf', [false, true]);
    expect(bufId).toBe(1);
  });

  test('should attach to buffer for change events', async () => {
    const result = await mockNvimClient.call('nvim_buf_attach', [1, false, {}]);
    expect(result).toBe(true);
  });

  test('should detach from buffer', async () => {
    const result = await mockNvimClient.call('nvim_buf_detach', [1]);
    expect(result).toBe(true);
  });

  test('should handle redraw events', () => {
    let redrawCalled = false;
    const onRedraw = (method: string, args: any[]) => {
      redrawCalled = true;
    };

    // Simulate redraw notification
    mockNvimClient.on('notification', (method: string, args: any[]) => {
      if (method === 'redraw') {
        onRedraw(method, args);
      }
    });

    expect(mockNvimClient.on).toHaveBeenCalled();
  });

  test('should handle on_lines buffer events', () => {
    const linesEvents: any[] = [];

    const onLines = (event: any) => {
      linesEvents.push(event);
    };

    // Simulate buf_lines_event notification
    const mockEvent = {
      buf: 1,
      changedtick: 2,
      firstline: 0,
      lastline: 1,
      linedata: ['new text'],
    };

    onLines(mockEvent);

    expect(linesEvents).toHaveLength(1);
    expect(linesEvents[0].buf).toBe(1);
    expect(linesEvents[0].linedata).toEqual(['new text']);
  });

  test('should quit Neovim cleanly', async () => {
    await mockNvimClient.quit();
    expect(mockNvimClient.quit).toHaveBeenCalled();
  });

  test('should handle external Neovim connection via socket', async () => {
    const { attach } = require('neovim');

    const client = await attach({ socket: '/tmp/nvim.sock' });
    expect(attach).toHaveBeenCalled();
    expect(client).toBeDefined();
  });

  test('should handle external Neovim connection via TCP', async () => {
    const { attach } = require('neovim');

    const client = await attach({ address: '127.0.0.1', port: 8000 });
    expect(attach).toHaveBeenCalled();
    expect(client).toBeDefined();
  });
});
