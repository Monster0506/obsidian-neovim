import type { NvimHost } from "@src/nvim";
import type { FileLogger } from "@src/logger";
import { EditorView, Decoration, DecorationSet } from "@codemirror/view";
import { StateField, StateEffect } from "@codemirror/state";

export interface SearchMatch {
  line: number;  // 0-indexed
  startCol: number;
  endCol: number;
}

export class SearchManager {
  private currentPattern: string = "";
  private matches: SearchMatch[] = [];

  constructor(
    private nvim: NvimHost,
    private log: FileLogger
  ) {}

  async getCurrentSearchPattern(): Promise<string> {
    try {
      const pattern = (await this.nvim.nvim.request("nvim_call_function", [
        "getreg",
        ["/"]
      ])) as string;

      this.currentPattern = pattern || "";
      return this.currentPattern;
    } catch (e) {
      this.log.warn("getCurrentSearchPattern failed", { err: (e as any)?.message ?? String(e) });
      return "";
    }
  }

  async searchInBuffer(pattern: string, bufText: string): Promise<SearchMatch[]> {
    try {
      const matches: SearchMatch[] = [];
      const lines = bufText.split("\n");

      let vimPattern = pattern;
      if (!vimPattern.startsWith("\\v") && !vimPattern.startsWith("\\V")) {
        vimPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }

      const jsPattern = this.vimPatternToJsRegex(pattern);
      if (!jsPattern) return matches;

      const regex = new RegExp(jsPattern, "gi");

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        let match;

        while ((match = regex.exec(line)) !== null) {
          matches.push({
            line: lineIdx,
            startCol: match.index,
            endCol: match.index + match[0].length
          });
        }
      }

      this.matches = matches;
      this.log.debug("searchInBuffer ok", { pattern, matches: matches.length });
      return matches;
    } catch (e) {
      this.log.warn("searchInBuffer failed", { err: (e as any)?.message ?? String(e) });
      return [];
    }
  }

  async getSearchMatches(): Promise<SearchMatch[]> {
    const pattern = await this.getCurrentSearchPattern();
    if (!pattern) return [];

    try {
      const text = await this.nvim.getBufferText();
      return await this.searchInBuffer(pattern, text);
    } catch (e) {
      this.log.warn("getSearchMatches failed", { err: (e as any)?.message ?? String(e) });
      return [];
    }
  }

  async clearSearch(): Promise<boolean> {
    try {
      await this.nvim.command("nohlsearch");
      this.matches = [];
      this.currentPattern = "";
      this.log.debug("clearSearch ok");
      return true;
    } catch (e) {
      this.log.warn("clearSearch failed", { err: (e as any)?.message ?? String(e) });
      return false;
    }
  }

  private vimPatternToJsRegex(pattern: string): string | null {
    try {
      let jsPattern = pattern;

      jsPattern = jsPattern.replace(/\\</g, "\\b");
      jsPattern = jsPattern.replace(/\\>/g, "\\b");

      jsPattern = jsPattern.replace(/\\v/g, "");
      jsPattern = jsPattern.replace(/\\V/g, "");

      jsPattern = jsPattern.replace(/\\n/g, "\n");
      jsPattern = jsPattern.replace(/\\t/g, "\t");

      return jsPattern;
    } catch {
      return null;
    }
  }

  getCurrentMatches(): SearchMatch[] {
    return this.matches;
  }
}

export const setSearchHighlightsEffect = StateEffect.define<SearchMatch[]>();

export const searchHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setSearchHighlightsEffect)) {
        const matches = effect.value;
        const decorations_list: any[] = [];

        for (const match of matches) {
          try {
            const line = tr.state.doc.line(match.line + 1);
            const from = line.from + match.startCol;
            const to = line.from + match.endCol;

            if (from >= 0 && to <= tr.state.doc.length && from < to) {
              decorations_list.push(
                Decoration.mark({
                  class: "nvim-search-highlight"
                }).range(from, to)
              );
            }
          } catch (e) {
          }
        }

        return Decoration.set(decorations_list, true);
      }
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f)
});

export const searchHighlightTheme = EditorView.baseTheme({
  ".nvim-search-highlight": {
    backgroundColor: "rgba(255, 255, 0, 0.3)",
    borderRadius: "2px"
  }
});
