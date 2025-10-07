import { App, Editor, MarkdownView } from "obsidian";

export function getActiveMarkdownView(app: App): MarkdownView | null {
  try {
    const mv = app.workspace.getActiveViewOfType(MarkdownView);
    if (mv) return mv;
    const activeLeaf: any = (app.workspace as any).activeLeaf;
    if (activeLeaf?.view instanceof MarkdownView) {
      return activeLeaf.view as MarkdownView;
    }
    return null;
  } catch {
    return null;
  }
}

export function getActiveEditor(app: App): Editor | null {
  return getActiveMarkdownView(app)?.editor ?? null;
}
