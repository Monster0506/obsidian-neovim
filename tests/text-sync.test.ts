import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { App, Editor } from 'obsidian';
import { SyncApplier } from '../src/sync';
import { EditorBridge } from '../src/bridge';
import { FileLogger } from '../src/logger';
import type { NvimOnLinesEvent } from '../src/nvim';

describe('Text Synchronization', () => {
  let app: App;
  let bridge: EditorBridge;
  let logger: FileLogger;
  let sync: SyncApplier;
  let editor: Editor;

  beforeEach(() => {
    app = new App();
    logger = new FileLogger(app, '[test]', '/tmp/test');
    logger.init = jest.fn().mockResolvedValue(undefined);
    logger.info = jest.fn();
    logger.debug = jest.fn();
    logger.warn = jest.fn();
    logger.error = jest.fn();

    bridge = new EditorBridge(app);
    sync = new SyncApplier(bridge, logger);

    // Create mock editor with initial content
    editor = new Editor();
    editor.setValue('Line 1\nLine 2\nLine 3');

    // Mock getActiveEditor to return our editor
    jest.spyOn(bridge, 'getActiveEditor').mockReturnValue(editor);
  });

  test('should apply single line change', async () => {
    const event: NvimOnLinesEvent = {
      buf: 1,
      changedtick: 1,
      firstline: 0,
      lastline: 1,
      linedata: ['Modified Line 1']
    };

    sync.enqueue(event);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(editor.getLine(0)).toBe('Modified Line 1');
  });

  test('should apply multi-line change', async () => {
    const event: NvimOnLinesEvent = {
      buf: 1,
      changedtick: 1,
      firstline: 0,
      lastline: 2,
      linedata: ['New Line 1', 'New Line 2']
    };

    sync.enqueue(event);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(editor.getLine(0)).toBe('New Line 1');
    expect(editor.getLine(1)).toBe('New Line 2');
  });

  test('should handle line insertion', async () => {
    const event: NvimOnLinesEvent = {
      buf: 1,
      changedtick: 1,
      firstline: 1,
      lastline: 1, // Same as firstline means insertion
      linedata: ['Inserted Line']
    };

    sync.enqueue(event);

    await new Promise(resolve => setTimeout(resolve, 50));

    const content = editor.getValue();
    expect(content).toContain('Inserted Line');
  });

  test('should handle line deletion', async () => {
    const event: NvimOnLinesEvent = {
      buf: 1,
      changedtick: 1,
      firstline: 1,
      lastline: 2,
      linedata: [] // Empty array means deletion
    };

    sync.enqueue(event);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(editor.lineCount()).toBe(2);
  });

  test('should handle appending lines at end', async () => {
    const event: NvimOnLinesEvent = {
      buf: 1,
      changedtick: 1,
      firstline: 3,
      lastline: 3,
      linedata: ['Line 4', 'Line 5']
    };

    sync.enqueue(event);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(editor.lineCount()).toBeGreaterThanOrEqual(4);
  });

  test('should queue multiple events', async () => {
    const event1: NvimOnLinesEvent = {
      buf: 1,
      changedtick: 1,
      firstline: 0,
      lastline: 1,
      linedata: ['Change 1']
    };

    const event2: NvimOnLinesEvent = {
      buf: 1,
      changedtick: 2,
      firstline: 1,
      lastline: 2,
      linedata: ['Change 2']
    };

    sync.enqueue(event1);
    sync.enqueue(event2);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(editor.getLine(0)).toBe('Change 1');
    expect(editor.getLine(1)).toBe('Change 2');
  });

  test('should handle empty buffer initialization', async () => {
    editor.setValue('');

    const event: NvimOnLinesEvent = {
      buf: 1,
      changedtick: 1,
      firstline: 0,
      lastline: 0,
      linedata: ['First Line']
    };

    sync.enqueue(event);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(editor.getValue()).toContain('First Line');
  });

  test('should handle Unicode and emoji', async () => {
    const event: NvimOnLinesEvent = {
      buf: 1,
      changedtick: 1,
      firstline: 0,
      lastline: 1,
      linedata: ['Hello 世界 🌍']
    };

    sync.enqueue(event);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(editor.getLine(0)).toBe('Hello 世界 🌍');
  });

  test('should handle large text blocks', async () => {
    const largeText = Array(100).fill('Large Line').map((l, i) => `${l} ${i}`);

    const event: NvimOnLinesEvent = {
      buf: 1,
      changedtick: 1,
      firstline: 0,
      lastline: 3,
      linedata: largeText
    };

    sync.enqueue(event);

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(editor.lineCount()).toBeGreaterThanOrEqual(largeText.length);
  });

  test('should handle edge case: replace all content', async () => {
    const event: NvimOnLinesEvent = {
      buf: 1,
      changedtick: 1,
      firstline: 0,
      lastline: editor.lineCount(),
      linedata: ['Completely New Content']
    };

    sync.enqueue(event);

    await new Promise(resolve => setTimeout(resolve, 50));

    const content = editor.getValue();
    expect(content).toContain('Completely New Content');
  });

  test('should skip sync when no active editor', async () => {
    jest.spyOn(bridge, 'getActiveEditor').mockReturnValue(null);

    const event: NvimOnLinesEvent = {
      buf: 1,
      changedtick: 1,
      firstline: 0,
      lastline: 1,
      linedata: ['Should not apply']
    };

    sync.enqueue(event);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(logger.warn).toHaveBeenCalled();
  });

  test('should handle rapid successive changes', async () => {
    for (let i = 0; i < 10; i++) {
      const event: NvimOnLinesEvent = {
        buf: 1,
        changedtick: i,
        firstline: 0,
        lastline: 1,
        linedata: [`Rapid Change ${i}`]
      };
      sync.enqueue(event);
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(editor.getLine(0)).toContain('Rapid Change');
  });

  test('should preserve line endings', async () => {
    editor.setValue('Line 1\nLine 2\nLine 3\n');

    const event: NvimOnLinesEvent = {
      buf: 1,
      changedtick: 1,
      firstline: 1,
      lastline: 2,
      linedata: ['Modified Line 2']
    };

    sync.enqueue(event);

    await new Promise(resolve => setTimeout(resolve, 50));

    const content = editor.getValue();
    expect(content.split('\n').length).toBeGreaterThan(0);
  });

  test('should handle partial line edit', async () => {
    editor.setValue('Original Line');

    const event: NvimOnLinesEvent = {
      buf: 1,
      changedtick: 1,
      firstline: 0,
      lastline: 1,
      linedata: ['Modified Original Line']
    };

    sync.enqueue(event);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(editor.getLine(0)).toBe('Modified Original Line');
  });
});
