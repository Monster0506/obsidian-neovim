import type { Editor } from "obsidian";
import type { FileLogger } from "@src/logger";
import type { NvimOnLinesEvent } from "@src/nvim";
import { EditorBridge } from "@src/bridge";

export class SyncApplier {
  private queue: NvimOnLinesEvent[] = [];
  private scheduled = false;

  constructor(private bridge: EditorBridge, private log: FileLogger) {}

  enqueue(ev: NvimOnLinesEvent) {
    this.queue.push(ev);
    this.log.debug("SyncApplier.enqueue", {
      buf: ev.buf,
      first: ev.firstline,
      last: ev.lastline,
      lines: ev.linedata.length,
      qlen: this.queue.length
    });
    if (!this.scheduled) {
      this.scheduled = true;
      if (typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(() => this.flush());
      } else {
        setTimeout(() => this.flush(), 0);
      }
    }
  }

  private flush() {
    try {
      if (this.queue.length === 0) {
        this.scheduled = false;
        return;
      }
      const events = this.queue.slice();
      this.queue = [];
      this.scheduled = false;

      for (const ev of events) {
        this.applyEvent(ev);
      }
    } catch (e) {
      this.log.warn("SyncApplier.flush error", {
        err: (e as any)?.message ?? String(e)
      });
    }
  }

  private applyEvent(ev: NvimOnLinesEvent) {
    try {
      const ed = this.bridge.getActiveEditor();
      if (!ed) {
        this.log.warn("applyEvent: no active editor");
        return;
      }
      const lc = ed.lineCount();
      const fromLine = clamp(ev.firstline, 0, Math.max(0, lc));
      const toLine = clamp(ev.lastline, 0, Math.max(0, lc));
      const from = { line: fromLine, ch: 0 };
      const to = endPosForExclusiveLineIndex(ed, toLine);
      const insert = ev.linedata.join("\n");
      const ok = this.bridge.replaceRange(from, to, insert);
      this.log.debug("applyEvent", {
        buf: ev.buf,
        from,
        to,
        lines: ev.linedata.length,
        ok
      });
    } catch (e) {
      this.log.warn("applyEvent error", {
        err: (e as any)?.message ?? String(e)
      });
    }
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function posAtDocEnd(ed: Editor): { line: number; ch: number } {
  try {
    const lc = ed.lineCount();
    if (lc <= 0) return { line: 0, ch: 0 };
    const last = lc - 1;
    const lineText = ed.getLine(last) ?? "";
    return { line: last, ch: lineText.length };
  } catch {
    return { line: 0, ch: 0 };
  }
}

// Convert an exclusive end line index (as provided by Neovim on_lines 'lastline')
// into a CodeMirror position at the end of the affected content.
// For 0 <= toLine < lc, we want the end-of-line position of (toLine - 1),
// because CM replaceRange uses inclusive positions and to={line: toLine, ch:0}
// would also delete the newline at (toLine - 1).
function endPosForExclusiveLineIndex(
  ed: Editor,
  toLineExclusive: number
): { line: number; ch: number } {
  try {
    const lc = ed.lineCount();
    if (toLineExclusive <= 0) return { line: 0, ch: 0 };
    if (toLineExclusive >= lc) return posAtDocEnd(ed);
    const endLine = toLineExclusive - 1;
    const text = ed.getLine(endLine) ?? "";
    return { line: endLine, ch: text.length };
  } catch {
    return posAtDocEnd(ed);
  }
}
