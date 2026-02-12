import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { App, Editor } from 'obsidian';
import { EditorBridge } from '../src/bridge';

describe('Editor Bridge', () => {
  let app: App;
  let bridge: EditorBridge;
  let editor: Editor;

  beforeEach(() => {
    app = new App();
    bridge = new EditorBridge(app);
    editor = new Editor();
    editor.setValue('Line 1\nLine 2\nLine 3');
  });

  test('should create EditorBridge instance', () => {
    expect(bridge).toBeDefined();
  });

  test('should get active editor', () => {
    // By default, no active editor
    const activeEditor = bridge.getActiveEditor();
    expect(activeEditor === null || activeEditor instanceof Editor).toBe(true);
  });

  test('should replace range in editor', () => {
    // Mock getActiveEditor
    jest.spyOn(bridge, 'getActiveEditor').mockReturnValue(editor);

    const from = { line: 0, ch: 0 };
    const to = { line: 0, ch: 6 };
    const text = 'Modified';

    const result = bridge.replaceRange(from, to, text);

    expect(result).toBe(true);
    expect(editor.getLine(0)).toBe('Modified');
  });

  test('should handle replaceRange with no editor', () => {
    jest.spyOn(bridge, 'getActiveEditor').mockReturnValue(null);

    const from = { line: 0, ch: 0 };
    const to = { line: 0, ch: 6 };
    const text = 'Modified';

    const result = bridge.replaceRange(from, to, text);

    expect(result).toBe(false);
  });

  test('should set editor text', () => {
    jest.spyOn(bridge, 'getActiveEditor').mockReturnValue(editor);

    const newText = 'Completely new text';
    const result = bridge.setEditorText(newText);

    expect(result).toBe(true);
    expect(editor.getValue()).toBe(newText);
  });

  test('should handle setEditorText with no editor', () => {
    jest.spyOn(bridge, 'getActiveEditor').mockReturnValue(null);

    const result = bridge.setEditorText('text');

    expect(result).toBe(false);
  });

  test('should get editor value', () => {
    jest.spyOn(bridge, 'getActiveEditor').mockReturnValue(editor);

    const value = bridge.getValue();

    expect(value).toBe('Line 1\nLine 2\nLine 3');
  });

  test('should return null when getting value with no editor', () => {
    jest.spyOn(bridge, 'getActiveEditor').mockReturnValue(null);

    const value = bridge.getValue();

    expect(value).toBeNull();
  });

  test('should get line from editor', () => {
    jest.spyOn(bridge, 'getActiveEditor').mockReturnValue(editor);

    const line = bridge.getLine(1);

    expect(line).toBe('Line 2');
  });

  test('should return null when getting line with no editor', () => {
    jest.spyOn(bridge, 'getActiveEditor').mockReturnValue(null);

    const line = bridge.getLine(0);

    expect(line).toBeNull();
  });

  test('should get line count', () => {
    jest.spyOn(bridge, 'getActiveEditor').mockReturnValue(editor);

    const count = bridge.lineCount();

    expect(count).toBe(3);
  });

  test('should return 0 for line count with no editor', () => {
    jest.spyOn(bridge, 'getActiveEditor').mockReturnValue(null);

    const count = bridge.lineCount();

    expect(count).toBe(0);
  });

  test('should handle multi-line replacement', () => {
    jest.spyOn(bridge, 'getActiveEditor').mockReturnValue(editor);

    const from = { line: 0, ch: 0 };
    const to = { line: 2, ch: 6 };
    const text = 'Single line replacement';

    const result = bridge.replaceRange(from, to, text);

    expect(result).toBe(true);
    expect(editor.getValue()).toContain('Single line replacement');
  });

  test('should handle insertion at position', () => {
    jest.spyOn(bridge, 'getActiveEditor').mockReturnValue(editor);

    const from = { line: 1, ch: 4 };
    const to = { line: 1, ch: 4 };
    const text = ' INSERTED';

    const result = bridge.replaceRange(from, to, text);

    expect(result).toBe(true);
    expect(editor.getLine(1)).toContain('INSERTED');
  });

  test('should handle deletion', () => {
    jest.spyOn(bridge, 'getActiveEditor').mockReturnValue(editor);

    const from = { line: 1, ch: 0 };
    const to = { line: 1, ch: 6 };
    const text = '';

    const result = bridge.replaceRange(from, to, text);

    expect(result).toBe(true);
    expect(editor.getLine(1)).not.toBe('Line 2');
  });

  test('should handle empty document', () => {
    editor.setValue('');
    jest.spyOn(bridge, 'getActiveEditor').mockReturnValue(editor);

    expect(bridge.getValue()).toBe('');
    expect(bridge.lineCount()).toBe(1); // Empty doc has one line
  });

  test('should handle Unicode content', () => {
    editor.setValue('Hello 世界 🌍');
    jest.spyOn(bridge, 'getActiveEditor').mockReturnValue(editor);

    const value = bridge.getValue();
    expect(value).toBe('Hello 世界 🌍');
  });

  test('should handle large documents', () => {
    const largeDoc = Array(1000).fill('Line').map((l, i) => `${l} ${i}`).join('\n');
    editor.setValue(largeDoc);
    jest.spyOn(bridge, 'getActiveEditor').mockReturnValue(editor);

    const count = bridge.lineCount();
    expect(count).toBe(1000);
  });

  test('should handle line boundaries correctly', () => {
    jest.spyOn(bridge, 'getActiveEditor').mockReturnValue(editor);

    const line0 = bridge.getLine(0);
    const line1 = bridge.getLine(1);
    const line2 = bridge.getLine(2);

    expect(line0).toBe('Line 1');
    expect(line1).toBe('Line 2');
    expect(line2).toBe('Line 3');
  });

  test('should handle out-of-bounds line access', () => {
    jest.spyOn(bridge, 'getActiveEditor').mockReturnValue(editor);

    const line = bridge.getLine(100);

    expect(line).toBe('');
  });
});
