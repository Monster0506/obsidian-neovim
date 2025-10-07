import type { App, Editor } from "obsidian";
import { getActiveEditor } from "@src/obsidian-helpers";

export class EditorBridge {
  constructor(private app: App) {}

  getActiveEditor(): Editor | null {
    return getActiveEditor(this.app);
  }

  replaceRange(
    from: { line: number; ch: number },
    to: { line: number; ch: number },
    text: string
  ) {
    const ed = this.getActiveEditor();
    if (!ed) return false;
    try {
      ed.replaceRange(text, from, to);
      return true;
    } catch {
      return false;
    }
  }

  setEditorText(text: string) {
    const ed = this.getActiveEditor();
    if (!ed) return false;
    try {
      ed.setValue(text);
      return true;
    } catch {
      return false;
    }
  }

  getLine(line: number): string | null {
    const ed = this.getActiveEditor();
    if (!ed) return null;
    try {
      return ed.getLine(line) ?? "";
    } catch {
      return null;
    }
  }

  lineCount(): number {
    const ed = this.getActiveEditor();
    if (!ed) return 0;
    try {
      return ed.lineCount();
    } catch {
      return 0;
    }
  }
}
