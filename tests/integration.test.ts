import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { App, Editor } from 'obsidian';
import { NvimHost } from '../src/nvim';
import { EditorBridge } from '../src/bridge';
import { SyncApplier } from '../src/sync';
import { FileLogger } from '../src/logger';

// Mock dependencies
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

describe('Integration Tests', () => {
  let app: App;
  let logger: FileLogger;
  let nvim: NvimHost;
  let bridge: EditorBridge;
  let sync: SyncApplier;
  let editor: Editor;

  beforeEach(async () => {
    app = new App();
    logger = new FileLogger(app, '[test]', '/tmp/test');
    logger.init = jest.fn().mockResolvedValue(undefined);
    logger.info = jest.fn();
    logger.debug = jest.fn();
    logger.warn = jest.fn();
    logger.error = jest.fn();

    nvim = new NvimHost(app, {}, logger);
    bridge = new EditorBridge(app);
    sync = new SyncApplier(bridge, logger);

    editor = new Editor();
    editor.setValue('Initial content');

    jest.spyOn(bridge, 'getActiveEditor').mockReturnValue(editor);

    await nvim.start();
  });

  afterEach(async () => {
    await nvim.stop();
    jest.clearAllMocks();
  });

  test('should sync buffer changes from Neovim to Editor', async () => {
    const buf = await nvim.createOrLoadBuffer(undefined, 'Line 1\nLine 2');

    // Set up sync handler
    nvim.onLines = (ev) => {
      sync.enqueue(ev);
    };

    await nvim.bufAttach(buf);

    // Simulate Neovim buffer change
    const mockClient = nvim.nvim as any;
    mockClient.simulateBufferChange(buf, 0, 1, ['Modified Line 1']);

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(editor.getValue()).toContain('Modified');
  });

  test('should sync cursor position from Neovim to Editor', async () => {
    nvim.onCursor = (pos) => {
      const lc = editor.lineCount();
      const line = Math.max(0, Math.min(pos.line, lc - 1));
      const lineText = editor.getLine(line) || '';
      const col = Math.max(0, Math.min(pos.col, lineText.length));
      editor.setCursor({ line, ch: col });
    };

    const mockClient = nvim.nvim as any;
    mockClient.simulateCursorMove(2, 5);

    await new Promise(resolve => setTimeout(resolve, 100));

    const cursor = editor.getCursor();
    expect(cursor.line).toBe(2);
    expect(cursor.ch).toBe(5);
  });

  test('should handle mode changes', async () => {
    let currentMode = 'normal';

    nvim.onModeChange = (mode) => {
      currentMode = mode;
    };

    await nvim.input('i');
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(currentMode).toBe('insert');

    await nvim.input('<Esc>');
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(currentMode).toBe('normal');
  });

  test('should handle full editing workflow', async () => {
    const buf = await nvim.createOrLoadBuffer(undefined, 'Start');

    nvim.onLines = (ev) => sync.enqueue(ev);
    await nvim.bufAttach(buf);

    // Enter insert mode
    await nvim.input('i');

    // Simulate typing
    const mockClient = nvim.nvim as any;
    mockClient.simulateBufferChange(buf, 0, 1, ['Start - typing']);

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(editor.getValue()).toContain('typing');

    // Exit insert mode
    await nvim.input('<Esc>');

    const mode = await nvim.getMode();
    expect(mode.mode).toBe('normal');
  });

  test('should handle command-line mode activation', async () => {
    let cmdlineVisible = false;

    nvim.onCmdline = (ev) => {
      if (ev.type === 'show') {
        cmdlineVisible = true;
      } else if (ev.type === 'hide') {
        cmdlineVisible = false;
      }
    };

    await nvim.input(':');
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(cmdlineVisible).toBe(true);
  });

  test('should handle buffer switching', async () => {
    const buf1 = await nvim.createOrLoadBuffer(undefined, 'Buffer 1');
    const buf2 = await nvim.createOrLoadBuffer(undefined, 'Buffer 2');

    expect(buf1).not.toBe(buf2);

    const text1 = await nvim.getBufferText(buf1);
    const text2 = await nvim.getBufferText(buf2);

    expect(text1).toBe('Buffer 1');
    expect(text2).toBe('Buffer 2');
  });

  test('should handle rapid key inputs', async () => {
    const keys = ['i', 'h', 'e', 'l', 'l', 'o', '<Esc>'];

    for (const key of keys) {
      await nvim.input(key);
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    const mode = await nvim.getMode();
    expect(mode.mode).toBe('normal');
  });

  test('should handle text sync with Unicode', async () => {
    const unicodeText = '你好世界 🌍 Hello World';
    const buf = await nvim.createOrLoadBuffer(undefined, unicodeText);

    const retrievedText = await nvim.getBufferText(buf);
    expect(retrievedText).toBe(unicodeText);
  });

  test('should handle large document sync', async () => {
    const largeText = Array(500).fill('Line').map((l, i) => `${l} ${i}`).join('\n');
    const buf = await nvim.createOrLoadBuffer(undefined, largeText);

    nvim.onLines = (ev) => sync.enqueue(ev);
    await nvim.bufAttach(buf);

    const mockClient = nvim.nvim as any;
    mockClient.simulateBufferChange(buf, 100, 101, ['Modified Line 100']);

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(editor.getValue()).toContain('Modified Line 100');
  });

  test('should handle concurrent buffer operations', async () => {
    const buf1 = await nvim.createOrLoadBuffer(undefined, 'Buffer A');
    const buf2 = await nvim.createOrLoadBuffer(undefined, 'Buffer B');

    await nvim.bufAttach(buf1);
    await nvim.bufAttach(buf2);

    const text1 = await nvim.getBufferText(buf1);
    const text2 = await nvim.getBufferText(buf2);

    expect(text1).toBe('Buffer A');
    expect(text2).toBe('Buffer B');

    await nvim.bufDetach(buf1);
    await nvim.bufDetach(buf2);
  });

  test('should handle Editor to Neovim sync', async () => {
    const buf = await nvim.createOrLoadBuffer(undefined, 'Initial');

    editor.setValue('Editor Modified Content');

    // In real plugin, this would trigger sync to Neovim
    const editorContent = editor.getValue();
    await nvim.setBufferText(buf, editorContent);

    const nvimContent = await nvim.getBufferText(buf);
    expect(nvimContent).toBe('Editor Modified Content');
  });

  test('should handle cursor sync boundaries', async () => {
    editor.setValue('Short\nMedium Line\nVery Long Line With More Text');

    nvim.onCursor = (pos) => {
      const lc = editor.lineCount();
      const line = Math.max(0, Math.min(pos.line, lc - 1));
      const lineText = editor.getLine(line) || '';
      const col = Math.max(0, Math.min(pos.col, lineText.length));
      editor.setCursor({ line, ch: col });
    };

    const mockClient = nvim.nvim as any;

    // Try to move cursor beyond line length (should clamp)
    mockClient.simulateCursorMove(0, 100);
    await new Promise(resolve => setTimeout(resolve, 50));

    const cursor1 = editor.getCursor();
    expect(cursor1.ch).toBeLessThanOrEqual(editor.getLine(0).length);

    // Try to move cursor beyond document (should clamp)
    mockClient.simulateCursorMove(100, 0);
    await new Promise(resolve => setTimeout(resolve, 50));

    const cursor2 = editor.getCursor();
    expect(cursor2.line).toBeLessThan(editor.lineCount());
  });

  test('should handle empty document operations', async () => {
    editor.setValue('');
    const buf = await nvim.createOrLoadBuffer(undefined, '');

    nvim.onLines = (ev) => sync.enqueue(ev);
    await nvim.bufAttach(buf);

    const mockClient = nvim.nvim as any;
    mockClient.simulateBufferChange(buf, 0, 0, ['First Line']);

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(editor.getValue()).toContain('First Line');
  });

  test('should handle reconnection scenario', async () => {
    await nvim.stop();
    await new Promise(resolve => setTimeout(resolve, 50));

    const nvim2 = new NvimHost(app, {}, logger);
    await nvim2.start();

    const buf = await nvim2.createOrLoadBuffer(undefined, 'Reconnected');
    const text = await nvim2.getBufferText(buf);

    expect(text).toBe('Reconnected');

    await nvim2.stop();
  });
});
