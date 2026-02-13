import { describe, test, expect } from '@jest/globals';
import { translateKey } from '../src/cm6';

describe('Key Handling and Translation', () => {
  test('should translate Escape key', () => {
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    const result = translateKey(event);
    expect(result).toBe('<Esc>');
  });

  test('should translate Enter key', () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    const result = translateKey(event);
    expect(result).toBe('<CR>');
  });

  test('should translate Tab key', () => {
    const event = new KeyboardEvent('keydown', { key: 'Tab' });
    const result = translateKey(event);
    expect(result).toBe('<Tab>');
  });

  test('should translate Shift+Tab', () => {
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
    const result = translateKey(event);
    expect(result).toBe('<S-Tab>');
  });

  test('should translate Backspace', () => {
    const event = new KeyboardEvent('keydown', { key: 'Backspace' });
    const result = translateKey(event);
    expect(result).toBe('<BS>');
  });

  test('should translate arrow keys', () => {
    expect(translateKey(new KeyboardEvent('keydown', { key: 'ArrowUp' }))).toBe('<Up>');
    expect(translateKey(new KeyboardEvent('keydown', { key: 'ArrowDown' }))).toBe('<Down>');
    expect(translateKey(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))).toBe('<Left>');
    expect(translateKey(new KeyboardEvent('keydown', { key: 'ArrowRight' }))).toBe('<Right>');
  });

  test('should translate Home and End', () => {
    expect(translateKey(new KeyboardEvent('keydown', { key: 'Home' }))).toBe('<Home>');
    expect(translateKey(new KeyboardEvent('keydown', { key: 'End' }))).toBe('<End>');
  });

  test('should translate Page Up and Page Down', () => {
    expect(translateKey(new KeyboardEvent('keydown', { key: 'PageUp' }))).toBe('<PageUp>');
    expect(translateKey(new KeyboardEvent('keydown', { key: 'PageDown' }))).toBe('<PageDown>');
  });

  test('should translate Delete', () => {
    const event = new KeyboardEvent('keydown', { key: 'Delete' });
    const result = translateKey(event);
    expect(result).toBe('<Del>');
  });

  test('should translate Insert', () => {
    const event = new KeyboardEvent('keydown', { key: 'Insert' });
    const result = translateKey(event);
    expect(result).toBe('<Insert>');
  });

  test('should translate printable characters', () => {
    expect(translateKey(new KeyboardEvent('keydown', { key: 'a' }))).toBe('a');
    expect(translateKey(new KeyboardEvent('keydown', { key: 'Z' }))).toBe('Z');
    expect(translateKey(new KeyboardEvent('keydown', { key: '1' }))).toBe('1');
    expect(translateKey(new KeyboardEvent('keydown', { key: '!' }))).toBe('!');
    expect(translateKey(new KeyboardEvent('keydown', { key: ' ' }))).toBe(' ');
  });

  test('should translate Ctrl+letter combinations', () => {
    expect(translateKey(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }))).toBe('<C-a>');
    expect(translateKey(new KeyboardEvent('keydown', { key: 'w', ctrlKey: true }))).toBe('<C-w>');
    expect(translateKey(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true }))).toBe('<C-p>');
  });

  test('should translate Ctrl+H as Backspace', () => {
    const event = new KeyboardEvent('keydown', { key: 'h', ctrlKey: true });
    const result = translateKey(event);
    expect(result).toBe('<BS>');
  });

  test('should translate Ctrl+M as Enter', () => {
    const event = new KeyboardEvent('keydown', { key: 'm', ctrlKey: true });
    const result = translateKey(event);
    expect(result).toBe('<CR>');
  });

  test('should translate Ctrl+[ as Escape', () => {
    const event = new KeyboardEvent('keydown', { key: '[', ctrlKey: true });
    const result = translateKey(event);
    expect(result).toBe('<Esc>');
  });

  test('should translate Ctrl+arrow keys', () => {
    expect(translateKey(new KeyboardEvent('keydown', { key: 'ArrowUp', ctrlKey: true }))).toBe('<C-Up>');
    expect(translateKey(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true }))).toBe('<C-Down>');
    expect(translateKey(new KeyboardEvent('keydown', { key: 'ArrowLeft', ctrlKey: true }))).toBe('<C-Left>');
    expect(translateKey(new KeyboardEvent('keydown', { key: 'ArrowRight', ctrlKey: true }))).toBe('<C-Right>');
  });

  test('should translate Alt/Meta+letter combinations', () => {
    expect(translateKey(new KeyboardEvent('keydown', { key: 'a', altKey: true }))).toBe('<M-a>');
    expect(translateKey(new KeyboardEvent('keydown', { key: 'b', metaKey: true }))).toBe('<M-b>');
  });

  test('should translate function keys', () => {
    expect(translateKey(new KeyboardEvent('keydown', { key: 'F1' }))).toBe('<F1>');
    expect(translateKey(new KeyboardEvent('keydown', { key: 'F2' }))).toBe('<F2>');
    expect(translateKey(new KeyboardEvent('keydown', { key: 'F12' }))).toBe('<F12>');
  });

  test('should ignore modifier-only keys', () => {
    expect(translateKey(new KeyboardEvent('keydown', { key: 'Shift' }))).toBeNull();
    expect(translateKey(new KeyboardEvent('keydown', { key: 'Control' }))).toBeNull();
    expect(translateKey(new KeyboardEvent('keydown', { key: 'Alt' }))).toBeNull();
    expect(translateKey(new KeyboardEvent('keydown', { key: 'Meta' }))).toBeNull();
  });

  test('should ignore IME composition', () => {
    const event = new KeyboardEvent('keydown', { key: 'a' });
    (event as any).isComposing = true;
    const result = translateKey(event);
    expect(result).toBeNull();
  });

  test('should handle special characters', () => {
    expect(translateKey(new KeyboardEvent('keydown', { key: ':' }))).toBe(':');
    expect(translateKey(new KeyboardEvent('keydown', { key: '/' }))).toBe('/');
    expect(translateKey(new KeyboardEvent('keydown', { key: '?' }))).toBe('?');
    expect(translateKey(new KeyboardEvent('keydown', { key: '.' }))).toBe('.');
    expect(translateKey(new KeyboardEvent('keydown', { key: ',' }))).toBe(',');
  });

  test('should handle Ctrl+special keys', () => {
    expect(translateKey(new KeyboardEvent('keydown', { key: 'Backspace', ctrlKey: true }))).toBe('<C-BS>');
    expect(translateKey(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }))).toBe('<C-CR>');
    expect(translateKey(new KeyboardEvent('keydown', { key: 'Tab', ctrlKey: true }))).toBe('<C-Tab>');
  });

  test('should handle uppercase letters', () => {
    expect(translateKey(new KeyboardEvent('keydown', { key: 'A' }))).toBe('A');
    expect(translateKey(new KeyboardEvent('keydown', { key: 'Z' }))).toBe('Z');
  });

  test('should handle numbers', () => {
    for (let i = 0; i <= 9; i++) {
      expect(translateKey(new KeyboardEvent('keydown', { key: String(i) }))).toBe(String(i));
    }
  });

  test('should handle Ctrl with uppercase', () => {
    const event = new KeyboardEvent('keydown', { key: 'A', ctrlKey: true });
    const result = translateKey(event);
    expect(result).toBe('<C-a>'); // Should normalize to lowercase
  });

  test('should handle complex modifier combinations', () => {
    // Ctrl+Shift+letter is typically just the uppercase letter with Ctrl
    const event = new KeyboardEvent('keydown', { key: 'A', ctrlKey: true, shiftKey: true });
    const result = translateKey(event);
    expect(result).toBe('<C-a>');
  });

  test('should handle symbols with Shift', () => {
    expect(translateKey(new KeyboardEvent('keydown', { key: '@' }))).toBe('@');
    expect(translateKey(new KeyboardEvent('keydown', { key: '#' }))).toBe('#');
    expect(translateKey(new KeyboardEvent('keydown', { key: '$' }))).toBe('$');
    expect(translateKey(new KeyboardEvent('keydown', { key: '%' }))).toBe('%');
  });
});
