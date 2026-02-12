import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { App } from 'obsidian';
import { NvimHost } from '../src/nvim';
import { FileLogger } from '../src/logger';

// Mock neovim and child_process
jest.mock('neovim', () => require('./__mocks__/neovim'));
jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    on: jest.fn(),
    stdout: { on: jest.fn(), pipe: jest.fn() },
    stderr: { on: jest.fn() },
    stdin: { write: jest.fn() },
    kill: jest.fn(),
  })),
}));

describe('Neovim Integration', () => {
  let app: App;
  let logger: FileLogger;

  beforeEach(() => {
    app = new App();
    logger = new FileLogger(app, '[test]', '/tmp/test');
    logger.init = jest.fn().mockResolvedValue(undefined);
    logger.info = jest.fn();
    logger.debug = jest.fn();
    logger.warn = jest.fn();
    logger.error = jest.fn();
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  test('should create NvimHost instance', () => {
    const nvim = new NvimHost(app, {}, logger);
    expect(nvim).toBeDefined();
  });

  test('should start Neovim process', async () => {
    const nvim = new NvimHost(app, { nvimPath: 'nvim' }, logger);
    await nvim.start();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('start'), expect.anything());
  });

  test('should attach to Neovim via RPC', async () => {
    const nvim = new NvimHost(app, {}, logger);
    await nvim.start();
    expect(nvim.nvim).toBeDefined();
  });

  test('should get API info after connection', async () => {
    const nvim = new NvimHost(app, {}, logger);
    await nvim.start();

    const apiInfo = await nvim.nvim.request('nvim_get_api_info', []);
    expect(apiInfo).toBeDefined();
    expect(apiInfo[1].version).toBeDefined();
  });

  test('should attach UI', async () => {
    const nvim = new NvimHost(app, {}, logger);
    await nvim.start();

    // UI attach should have been called during start
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('ui_attach'), expect.anything());
  });

  test('should create and attach buffer', async () => {
    const nvim = new NvimHost(app, {}, logger);
    await nvim.start();

    const buf = await nvim.createOrLoadBuffer(undefined, 'Hello, Neovim!');
    expect(buf).toBeGreaterThan(0);
  });

  test('should get current buffer', async () => {
    const nvim = new NvimHost(app, {}, logger);
    await nvim.start();

    const buf = await nvim.getCurrentBuf();
    expect(typeof buf).toBe('number');
  });

  test('should set and get buffer text', async () => {
    const nvim = new NvimHost(app, {}, logger);
    await nvim.start();

    const testText = 'Line 1\nLine 2\nLine 3';
    const buf = await nvim.createOrLoadBuffer(undefined, testText);

    const retrievedText = await nvim.getBufferText(buf);
    expect(retrievedText).toBe(testText);
  });

  test('should handle buffer attach and detach', async () => {
    const nvim = new NvimHost(app, {}, logger);
    await nvim.start();

    const buf = await nvim.createOrLoadBuffer(undefined, 'test');
    await nvim.bufAttach(buf);
    await nvim.bufDetach(buf);

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('buf_attach'), expect.anything());
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('buf_detach'), expect.anything());
  });

  test('should get and set cursor position', async () => {
    const nvim = new NvimHost(app, {}, logger);
    await nvim.start();

    const cursor = await nvim.getCursor();
    expect(cursor).toHaveProperty('line');
    expect(cursor).toHaveProperty('col');
    expect(typeof cursor.line).toBe('number');
    expect(typeof cursor.col).toBe('number');
  });

  test('should send input to Neovim', async () => {
    const nvim = new NvimHost(app, {}, logger);
    await nvim.start();

    const result = await nvim.input('i');
    expect(result).toBeDefined();
  });

  test('should execute commands', async () => {
    const nvim = new NvimHost(app, {}, logger);
    await nvim.start();

    await nvim.command('enew');
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('command'), expect.anything());
  });

  test('should get mode', async () => {
    const nvim = new NvimHost(app, {}, logger);
    await nvim.start();

    const mode = await nvim.getMode();
    expect(mode).toHaveProperty('mode');
    expect(mode).toHaveProperty('blocking');
  });

  test('should handle mode changes', async () => {
    const nvim = new NvimHost(app, {}, logger);
    await nvim.start();

    let modeChanged = false;
    let capturedMode = '';

    nvim.onModeChange = (mode: string) => {
      modeChanged = true;
      capturedMode = mode;
    };

    await nvim.input('i'); // Enter insert mode
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(modeChanged).toBe(true);
    expect(capturedMode).toBe('insert');
  });

  test('should emit onLines events', async () => {
    const nvim = new NvimHost(app, {}, logger);
    await nvim.start();

    let eventReceived = false;
    let eventData: any;

    nvim.onLines = (ev) => {
      eventReceived = true;
      eventData = ev;
    };

    const buf = await nvim.createOrLoadBuffer(undefined, '');
    await nvim.bufAttach(buf);

    // Simulate buffer change
    const mockClient = nvim.nvim as any;
    mockClient.simulateBufferChange(buf, 0, 1, ['New line']);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(eventReceived).toBe(true);
    expect(eventData).toBeDefined();
    expect(eventData.buf).toBe(buf);
  });

  test('should emit onCursor events', async () => {
    const nvim = new NvimHost(app, {}, logger);
    await nvim.start();

    let cursorMoved = false;
    let cursorPos: any;

    nvim.onCursor = (pos) => {
      cursorMoved = true;
      cursorPos = pos;
    };

    const mockClient = nvim.nvim as any;
    mockClient.simulateCursorMove(5, 10);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(cursorMoved).toBe(true);
    expect(cursorPos).toBeDefined();
  });

  test('should handle cmdline events', async () => {
    const nvim = new NvimHost(app, {}, logger);
    await nvim.start();

    let cmdlineEvent: any;

    nvim.onCmdline = (ev) => {
      cmdlineEvent = ev;
    };

    const mockClient = nvim.nvim as any;
    mockClient.simulateCmdlineEvent('show', 'test', 0);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(cmdlineEvent).toBeDefined();
    expect(cmdlineEvent.type).toBe('show');
  });

  test('should get cmdline state', async () => {
    const nvim = new NvimHost(app, {}, logger);
    await nvim.start();

    const state = await nvim.getCmdlineState();
    expect(state).toHaveProperty('type');
    expect(state).toHaveProperty('content');
    expect(state).toHaveProperty('pos');
  });

  test('should handle external socket connection', async () => {
    const nvim = new NvimHost(app, {
      externalSocketPath: '/tmp/nvim.sock'
    }, logger);

    await nvim.start();
    expect(nvim.nvim).toBeDefined();
  });

  test('should handle external TCP connection', async () => {
    const nvim = new NvimHost(app, {
      externalHost: '127.0.0.1',
      externalPort: 8000
    }, logger);

    await nvim.start();
    expect(nvim.nvim).toBeDefined();
  });

  test('should stop Neovim cleanly', async () => {
    const nvim = new NvimHost(app, {}, logger);
    await nvim.start();
    await nvim.stop();

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('stop'), expect.anything());
  });

  test('should handle visual selection', async () => {
    const nvim = new NvimHost(app, {}, logger);
    await nvim.start();

    const selection = await nvim.getVisualSelection();
    // May be null if no selection
    expect(selection === null || typeof selection === 'object').toBe(true);
  });

  test('should handle redraw events', async () => {
    const nvim = new NvimHost(app, {}, logger);
    await nvim.start();

    let redrawCalled = false;

    nvim.onRedraw = (method, args) => {
      redrawCalled = true;
    };

    const mockClient = nvim.nvim as any;
    mockClient.emit('notification', 'redraw', [[['grid_cursor_goto', [[0, 1, 1]]]]]);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(redrawCalled).toBe(true);
  });
});
