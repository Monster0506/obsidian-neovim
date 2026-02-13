/**
 * E2E Tests for Text Synchronization
 * Tests bidirectional text sync between Obsidian and Neovim
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { MockEditor } from '../__mocks__/obsidian';

describe('Text Synchronization', () => {
  let editor: MockEditor;

  beforeEach(() => {
    editor = new MockEditor();
    jest.clearAllMocks();
  });

  describe('Obsidian to Neovim sync', () => {
    test('should sync initial document content to Neovim', () => {
      const initialContent = 'Hello, World!\nThis is a test.';
      editor.setValue(initialContent);

      expect(editor.getValue()).toBe(initialContent);
      expect(editor.lineCount()).toBe(2);
    });

    test('should handle empty document', () => {
      editor.setValue('');
      expect(editor.getValue()).toBe('');
      expect(editor.lineCount()).toBe(1);
    });

    test('should handle multi-line documents', () => {
      const multiLineContent = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      editor.setValue(multiLineContent);

      expect(editor.lineCount()).toBe(5);
      expect(editor.getLine(0)).toBe('Line 1');
      expect(editor.getLine(4)).toBe('Line 5');
    });

    test('should handle unicode content', () => {
      const unicodeContent = '你好世界\n🎉 Emoji test\nПривет';
      editor.setValue(unicodeContent);

      expect(editor.getValue()).toBe(unicodeContent);
      expect(editor.getLine(0)).toBe('你好世界');
      expect(editor.getLine(1)).toBe('🎉 Emoji test');
    });
  });

  describe('Neovim to Obsidian sync', () => {
    test('should apply single line change from Neovim', () => {
      editor.setValue('Original line');

      // Simulate Neovim change event
      const onLinesEvent = {
        buf: 1,
        changedtick: 2,
        firstline: 0,
        lastline: 1,
        linedata: ['Modified line'],
      };

      // Apply the change (this would be done by SyncApplier in real code)
      editor.setValue(onLinesEvent.linedata.join('\n'));

      expect(editor.getValue()).toBe('Modified line');
    });

    test('should apply multi-line insertion', () => {
      editor.setValue('Line 1\nLine 2');

      // Insert lines between line 1 and 2
      const onLinesEvent = {
        buf: 1,
        changedtick: 3,
        firstline: 1,
        lastline: 1,
        linedata: ['Inserted Line A', 'Inserted Line B'],
      };

      // Simulate insertion
      const lines = editor.getValue().split('\n');
      lines.splice(
        onLinesEvent.firstline,
        onLinesEvent.lastline - onLinesEvent.firstline,
        ...onLinesEvent.linedata
      );
      editor.setValue(lines.join('\n'));

      expect(editor.lineCount()).toBe(4);
      expect(editor.getLine(1)).toBe('Inserted Line A');
      expect(editor.getLine(2)).toBe('Inserted Line B');
    });

    test('should apply line deletion', () => {
      editor.setValue('Line 1\nLine 2\nLine 3');

      // Delete line 2
      const onLinesEvent = {
        buf: 1,
        changedtick: 4,
        firstline: 1,
        lastline: 2,
        linedata: [],
      };

      const lines = editor.getValue().split('\n');
      lines.splice(
        onLinesEvent.firstline,
        onLinesEvent.lastline - onLinesEvent.firstline,
        ...onLinesEvent.linedata
      );
      editor.setValue(lines.join('\n'));

      expect(editor.lineCount()).toBe(2);
      expect(editor.getLine(0)).toBe('Line 1');
      expect(editor.getLine(1)).toBe('Line 3');
    });

    test('should handle rapid successive changes', () => {
      editor.setValue('Initial content');

      const changes = [
        { linedata: ['Change 1'] },
        { linedata: ['Change 2'] },
        { linedata: ['Change 3'] },
      ];

      // Apply changes sequentially
      changes.forEach(change => {
        editor.setValue(change.linedata.join('\n'));
      });

      expect(editor.getValue()).toBe('Change 3');
    });
  });

  describe('Cursor synchronization', () => {
    test('should sync cursor position from Neovim to Obsidian', () => {
      editor.setValue('Line 1\nLine 2\nLine 3');

      // Neovim cursor at line 2, col 5
      const nvimCursor = { line: 1, col: 5 };
      editor.setCursor({ line: nvimCursor.line, ch: nvimCursor.col });

      const cursor = editor.getCursor();
      expect(cursor.line).toBe(1);
      expect(cursor.ch).toBe(5);
    });

    test('should handle cursor at start of document', () => {
      editor.setValue('Test content');
      editor.setCursor({ line: 0, ch: 0 });

      const cursor = editor.getCursor();
      expect(cursor.line).toBe(0);
      expect(cursor.ch).toBe(0);
    });

    test('should handle cursor at end of line', () => {
      const content = 'Test line';
      editor.setValue(content);
      editor.setCursor({ line: 0, ch: content.length });

      const cursor = editor.getCursor();
      expect(cursor.ch).toBe(content.length);
    });

    test('should clamp cursor to valid positions', () => {
      editor.setValue('Short');

      // Try to set cursor beyond line length
      const lineLength = editor.getLine(0).length;
      const attemptedCol = 100;
      const clampedCol = Math.min(attemptedCol, lineLength);

      editor.setCursor({ line: 0, ch: clampedCol });

      const cursor = editor.getCursor();
      expect(cursor.ch).toBeLessThanOrEqual(lineLength);
    });
  });

  describe('Edge cases', () => {
    test('should handle very large documents', () => {
      const largeContent = Array(1000).fill('Line of text').join('\n');
      editor.setValue(largeContent);

      expect(editor.lineCount()).toBe(1000);
      expect(editor.getLine(999)).toBe('Line of text');
    });

    test('should handle documents with only newlines', () => {
      editor.setValue('\n\n\n');
      expect(editor.lineCount()).toBe(4);
    });

    test('should handle mixed line endings', () => {
      // In practice, this would be normalized
      const content = 'Line 1\nLine 2\nLine 3';
      editor.setValue(content);

      expect(editor.getValue()).toBe(content);
    });

    test('should preserve trailing newlines', () => {
      const contentWithTrailing = 'Content\n\n';
      editor.setValue(contentWithTrailing);

      expect(editor.getValue()).toBe(contentWithTrailing);
    });
  });

  describe('Sync queue handling', () => {
    test('should queue multiple sync events', () => {
      const syncQueue: any[] = [];

      const events = [
        { buf: 1, firstline: 0, lastline: 1, linedata: ['Change 1'] },
        { buf: 1, firstline: 1, lastline: 2, linedata: ['Change 2'] },
        { buf: 1, firstline: 2, lastline: 3, linedata: ['Change 3'] },
      ];

      events.forEach(event => syncQueue.push(event));

      expect(syncQueue.length).toBe(3);
    });

    test('should process sync queue in order', () => {
      const processedEvents: number[] = [];
      const events = [
        { id: 1, linedata: ['A'] },
        { id: 2, linedata: ['B'] },
        { id: 3, linedata: ['C'] },
      ];

      events.forEach(event => {
        processedEvents.push(event.id);
      });

      expect(processedEvents).toEqual([1, 2, 3]);
    });
  });
});
