import { describe, it, expect } from '@jest/globals';
import { translateKey } from '../src/cm6';

describe('Key Handling', () => {
  it('should translate Escape key', () => {
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    const result = translateKey(event);
    expect(result).toBe('<Esc>');
  });

  it('should translate Enter key', () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    const result = translateKey(event);
    expect(result).toBe('<CR>');
  });

  it('should translate Tab key', () => {
    const event = new KeyboardEvent('keydown', { key: 'Tab' });
    const result = translateKey(event);
    expect(result).toBe('<Tab>');
  });

  it('should translate Backspace key', () => {
    const event = new KeyboardEvent('keydown', { key: 'Backspace' });
    const result = translateKey(event);
    expect(result).toBe('<BS>');
  });

  it('should translate Delete key', () => {
    const event = new KeyboardEvent('keydown', { key: 'Delete' });
    const result = translateKey(event);
    expect(result).toBe('<Del>');
  });

  it('should translate ArrowUp key', () => {
    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    const result = translateKey(event);
    expect(result).toBe('<Up>');
  });

  it('should translate ArrowDown key', () => {
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    const result = translateKey(event);
    expect(result).toBe('<Down>');
  });

  it('should translate ArrowLeft key', () => {
    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    const result = translateKey(event);
    expect(result).toBe('<Left>');
  });

  it('should translate ArrowRight key', () => {
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    const result = translateKey(event);
    expect(result).toBe('<Right>');
  });

  it('should translate Ctrl+C', () => {
    const event = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true });
    const result = translateKey(event);
    expect(result).toBe('<C-c>');
  });

  it('should translate Ctrl+W', () => {
    const event = new KeyboardEvent('keydown', { key: 'w', ctrlKey: true });
    const result = translateKey(event);
    expect(result).toBe('<C-w>');
  });

  it('should translate Ctrl+U', () => {
    const event = new KeyboardEvent('keydown', { key: 'u', ctrlKey: true });
    const result = translateKey(event);
    expect(result).toBe('<C-u>');
  });

  it('should translate Ctrl+D', () => {
    const event = new KeyboardEvent('keydown', { key: 'd', ctrlKey: true });
    const result = translateKey(event);
    expect(result).toBe('<C-d>');
  });

  it('should translate regular letter keys', () => {
    const event = new KeyboardEvent('keydown', { key: 'a' });
    const result = translateKey(event);
    expect(result).toBe('a');
  });

  it('should translate number keys', () => {
    const event = new KeyboardEvent('keydown', { key: '5' });
    const result = translateKey(event);
    expect(result).toBe('5');
  });

  it('should translate colon for command mode', () => {
    const event = new KeyboardEvent('keydown', { key: ':' });
    const result = translateKey(event);
    expect(result).toBe(':');
  });

  it('should translate forward slash for search', () => {
    const event = new KeyboardEvent('keydown', { key: '/' });
    const result = translateKey(event);
    expect(result).toBe('/');
  });

  it('should translate question mark for reverse search', () => {
    const event = new KeyboardEvent('keydown', { key: '?' });
    const result = translateKey(event);
    expect(result).toBe('?');
  });

  it('should translate Space key', () => {
    const event = new KeyboardEvent('keydown', { key: ' ' });
    const result = translateKey(event);
    expect(result).toBe('<Space>');
  });

  it('should handle Shift+key combinations', () => {
    const event = new KeyboardEvent('keydown', { key: 'A', shiftKey: true });
    const result = translateKey(event);
    expect(result).toBe('A');
  });
});
