// Mock Neovim client
import { EventEmitter } from 'events';

export class MockNeovimClient extends EventEmitter {
  private buffers: Map<number, string[]> = new Map();
  private currentBuf: number = 1;
  private cursor: [number, number] = [1, 0];
  private mode: any = { mode: 'normal', blocking: false };
  private attached: Set<number> = new Set();
  private cmdline: { type: string; content: string; pos: number } = { type: ':', content: '', pos: 0 };

  async request(method: string, args: any[]): Promise<any> {
    switch (method) {
      case 'nvim_get_api_info':
        return [0, { version: { major: 0, minor: 9, patch: 0 } }];

      case 'nvim_ui_attach':
        return null;

      case 'nvim_get_current_buf':
        return this.currentBuf;

      case 'nvim_create_buf':
        const newBuf = Math.max(...Array.from(this.buffers.keys()), 0) + 1;
        this.buffers.set(newBuf, ['']);
        return newBuf;

      case 'nvim_buf_attach':
        const [buf] = args;
        this.attached.add(buf);
        return true;

      case 'nvim_buf_detach':
        const [detachBuf] = args;
        this.attached.delete(detachBuf);
        return true;

      case 'nvim_buf_set_lines':
        const [setBuf, start, end, strict, lines] = args;
        this.buffers.set(setBuf, lines);
        // Simulate on_lines event
        if (this.attached.has(setBuf)) {
          setTimeout(() => {
            this.emit('notification', 'nvim_buf_lines_event', [
              setBuf, 0, start, end, lines
            ]);
          }, 0);
        }
        return null;

      case 'nvim_buf_get_lines':
        const [getBuf, getStart, getEnd] = args;
        return this.buffers.get(getBuf) || [''];

      case 'nvim_win_get_cursor':
        return this.cursor;

      case 'nvim_win_set_cursor':
        this.cursor = args[1];
        return null;

      case 'nvim_get_mode':
        return this.mode;

      case 'nvim_input':
        const [keys] = args;
        // Simulate mode changes for common inputs
        if (keys === 'i') {
          this.mode = { mode: 'insert', blocking: false };
          this.emit('notification', 'redraw', [[['mode_change', ['insert']]]]);
        } else if (keys === '<Esc>') {
          this.mode = { mode: 'normal', blocking: false };
          this.emit('notification', 'redraw', [[['mode_change', ['normal']]]]);
        } else if (keys === ':' || keys === '/' || keys === '?') {
          this.cmdline = { type: keys, content: '', pos: 0 };
          this.emit('notification', 'redraw', [[['cmdline_show', [[[], 0, 0, keys]]]]]);
        }
        return keys.length;

      case 'nvim_command':
        const [cmd] = args;
        if (cmd === 'enew') {
          this.currentBuf = Math.max(...Array.from(this.buffers.keys()), 0) + 1;
          this.buffers.set(this.currentBuf, ['']);
        } else if (cmd.startsWith('edit ')) {
          this.currentBuf = Math.max(...Array.from(this.buffers.keys()), 0) + 1;
          this.buffers.set(this.currentBuf, ['']);
        } else if (cmd === 'setlocal nomodified') {
          // no-op
        } else if (cmd === ':qa!') {
          this.removeAllListeners();
        }
        return null;

      case 'nvim_call_function':
        const [fn, fnArgs] = args;
        switch (fn) {
          case 'getcmdtype':
            return this.cmdline.type;
          case 'getcmdline':
            return this.cmdline.content;
          case 'getcmdpos':
            return this.cmdline.pos + 1; // Vim uses 1-indexed
          case 'getpos':
            const [mark] = fnArgs;
            if (mark === "'<") return [0, 1, 1, 0];
            if (mark === "'>") return [0, 1, 1, 0];
            return [0, 0, 0, 0];
          default:
            return null;
        }

      default:
        return null;
    }
  }

  // Helper methods for testing
  simulateBufferChange(buf: number, firstline: number, lastline: number, lines: string[]) {
    if (this.attached.has(buf)) {
      this.emit('notification', 'nvim_buf_lines_event', [
        buf, 0, firstline, lastline, lines
      ]);
    }
  }

  simulateCursorMove(line: number, col: number) {
    this.cursor = [line + 1, col]; // Neovim uses 1-indexed lines
    this.emit('notification', 'redraw', [[['grid_cursor_goto', [[0, line, col]]]]]);
  }

  simulateModeChange(mode: string) {
    this.mode = { mode, blocking: false };
    this.emit('notification', 'redraw', [[['mode_change', [mode]]]]);
  }

  simulateCmdlineEvent(type: 'show' | 'hide' | 'pos', content?: string, pos?: number) {
    if (type === 'show' && content !== undefined && pos !== undefined) {
      this.cmdline = { type: ':', content, pos };
      this.emit('notification', 'redraw', [[['cmdline_show', [[[content], pos, 0, ':']]]]]);
    } else if (type === 'hide') {
      this.emit('notification', 'redraw', [[['cmdline_hide', []]]]);
    } else if (type === 'pos' && pos !== undefined) {
      this.cmdline.pos = pos;
      this.emit('notification', 'redraw', [[['cmdline_pos', [pos]]]]);
    }
  }
}

export function attach(options: any): Promise<MockNeovimClient> {
  return Promise.resolve(new MockNeovimClient());
}
