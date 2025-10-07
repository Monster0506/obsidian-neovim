import { EditorView, keymap, ViewPlugin } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import type { NvimHost } from "@src/nvim";

function log(
  nvim: NvimHost | null | undefined,
  level: "debug" | "info" | "warn" | "error",
  msg: string,
  extra?: any
) {
  try {
    const l = (nvim as any)?.log;
    if (l && typeof l[level] === "function") l[level](`[cm6] ${msg}`, extra);
  } catch {}
}

function isModifierOnly(e: KeyboardEvent) {
  return (
    e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta"
  );
}

function functionKeyToTerm(key: string): string | null {
  if (/^F\d+$/.test(key)) {
    return `<${key}>`; // <F1>..<F24> etc.
  }
  return null;
}

function baseKeyToTermcode(key: string, shift: boolean): string | null {
  if (key.length === 1) {
    // Printable character; browser applied Shift already
    return key;
  }
  const base: Record<string, string> = {
    Escape: "<Esc>",
    Enter: "<CR>",
    Backspace: "<BS>",
    Tab: "<Tab>",
    ArrowUp: "<Up>",
    ArrowDown: "<Down>",
    ArrowLeft: "<Left>",
    ArrowRight: "<Right>",
    Home: "<Home>",
    End: "<End>",
    PageUp: "<PageUp>",
    PageDown: "<PageDown>",
    Insert: "<Insert>",
    Delete: "<Del>"
  };
  const fn = functionKeyToTerm(key);
  if (fn) return fn;
  if (key === "Tab" && shift) return "<S-Tab>";
  return base[key] ?? null;
}

function ctrlName(key: string): string {
  if (key.length === 1) {
    const c = key.toLowerCase();
    // Map common canonical ctrl equivalents used by Vim
    if (c === "h") return "<BS>"; // Ctrl+H → backspace
    if (c === "m") return "<CR>"; // Ctrl+M → enter
    if (c === "[") return "<Esc>"; // Ctrl+[ → escape
    if (c >= "a" && c <= "z") return `<C-${c}>`;
  }
  const specials: Record<string, string> = {
    ArrowUp: "<C-Up>",
    ArrowDown: "<C-Down>",
    ArrowLeft: "<C-Left>",
    ArrowRight: "<C-Right>",
    Home: "<C-Home>",
    End: "<C-End>",
    PageUp: "<C-PageUp>",
    PageDown: "<C-PageDown>",
    Backspace: "<C-BS>",
    Enter: "<C-CR>",
    Tab: "<C-Tab>"
  };
  if (key in specials) return specials[key];
  return `<C-${key}>`;
}

function altName(key: string, shift: boolean): string {
  if (key.length === 1) return `<M-${key}>`;
  const base = baseKeyToTermcode(key, shift);
  if (base) {
    if (base.startsWith("<") && base.endsWith(">")) {
      return `<M-${base.slice(1, -1)}>`;
    }
  }
  return `<M-${key}>`;
}

export function translateKey(e: KeyboardEvent): string | null {
  // Let IME composition flow; handle after composition if desired
  if ((e as any).isComposing) return null;
  if (isModifierOnly(e)) return null;

  const { key, ctrlKey, altKey, metaKey, shiftKey } = e;
  const altOrMeta = altKey || metaKey;

  // Ctrl+Alt (or Meta) combos
  if (ctrlKey && altOrMeta) {
    if (key.length === 1) {
      return `<C-M-${key}>`;
    }
    const base = baseKeyToTermcode(key, shiftKey) ?? key;
    if (base.startsWith("<") && base.endsWith(">")) {
      return `<C-M-${base.slice(1, -1)}>`;
    }
    return `<C-M-${base}>`;
  }

  // Ctrl only
  if (ctrlKey) {
    return ctrlName(key);
  }

  // Alt/Meta only
  if (altOrMeta) {
    return altName(key, shiftKey);
  }

  // No modifiers
  const base = baseKeyToTermcode(key, shiftKey);
  if (base) return base;

  if (key.length === 1) return key; // printable char
  return null;
}

export function neovimExtension(nvim: NvimHost): Extension {
  log(nvim, "info", "neovimExtension: constructing (full key routing)");

  // Simple fast-path for common vim keys; everything else via domEvent handler
  function routeSimple(key: string) {
    return (_view: EditorView) => {
      void nvim
        .input(key)
        .then(() => log(nvim, "debug", "nvim.input ok", { key }))
        .catch((e) =>
          log(nvim, "warn", "nvim.input failed", { key, err: e?.message ?? String(e) })
        )
        .finally(() => {
          try {
            window.dispatchEvent(
              new CustomEvent("obsidian-neovim-input", { detail: { term: key } })
            );
          } catch {}
        });
      return true;
    };
  }

  const keys = keymap.of([
    { key: "Escape", run: routeSimple("<Esc>") },
    { key: "h", run: routeSimple("h") },
    { key: "j", run: routeSimple("j") },
    { key: "k", run: routeSimple("k") },
    { key: "l", run: routeSimple("l") },
    { key: "i", run: routeSimple("i") },
    { key: "Backspace", run: routeSimple("<BS>") },
    { key: "Delete", run: routeSimple("<Del>") },
    { key: "Enter", run: routeSimple("<CR>") },
    { key: "Tab", run: routeSimple("<Tab>") },
    { key: "ArrowUp", run: routeSimple("<Up>") },
    { key: "ArrowDown", run: routeSimple("<Down>") },
    { key: "ArrowLeft", run: routeSimple("<Left>") },
    { key: "ArrowRight", run: routeSimple("<Right>") }
  ]);

  const domHandlers = EditorView.domEventHandlers({
    keydown: (e, _view) => {
      try {
        if ((e as any).__nvimHandled) {
          return true; // capture handler already did this
        }
        // Allow only Ctrl+P to reach Obsidian (command palette)
        if (e.ctrlKey && !e.shiftKey && !e.altKey && (e.key === "P" || e.key === "p")) {
          log(nvim, "debug", "bypass Neovim: Ctrl+P");
          return false; // allow Obsidian
        }

        const term = translateKey(e);
        if (!term) return false;

        // Avoid double handling of our simple bindings
        if (
          term === "h" ||
          term === "j" ||
          term === "k" ||
          term === "l" ||
          term === "i" ||
          term === "<Esc>" ||
          term === "<BS>" ||
          term === "<Del>" ||
          term === "<CR>" ||
          term === "<Tab>" ||
          term === "<Up>" ||
          term === "<Down>" ||
          term === "<Left>" ||
          term === "<Right>"
        ) {
          return false;
        }

        log(nvim, "debug", "keydown -> termcode", { key: e.key, term });

        e.preventDefault();
        e.stopPropagation();

        void nvim
          .input(term)
          .then(() => log(nvim, "debug", "nvim.input ok", { term }))
          .catch((err) =>
            log(nvim, "warn", "nvim.input failed", {
              term,
              err: err?.message ?? String(err)
            })
          )
          .finally(() => {
            try {
              window.dispatchEvent(
                new CustomEvent("obsidian-neovim-input", { detail: { term } })
              );
            } catch {}
          });
        return true;
      } catch (err) {
        log(nvim, "error", "keydown handler error", {
          err: (err as any)?.message ?? String(err)
        });
        return false;
      }
    }
  });

  // Lightweight cmdline bar within the editor (bottom), driven by window events
  const cmdlineBar = ViewPlugin.fromClass(
    class {
      private bar: HTMLElement | null = null;
      private onState = (ev: Event) => {
        try {
          const e = ev as CustomEvent<{ type: string; content: string; pos: number; visible: boolean; }>;
          const d = e.detail;
          if (!d || !d.visible) {
            this.hide();
            return;
          }
          this.ensure();
          if (!this.bar) return;
          const prompt = d.type || ":";
          const before = d.content.slice(0, Math.max(0, Math.min(d.pos, d.content.length)));
          const after = d.content.slice(Math.max(0, Math.min(d.pos, d.content.length)));
          this.bar.innerHTML = `<span class="nvim-cmdbar-prompt">${escapeHtml(prompt)}</span> <span class="nvim-cmdbar-content">${escapeHtml(before)}<span class="nvim-cmdbar-caret">&nbsp;</span>${escapeHtml(after)}</span>`;
        } catch (err) {
          log(nvim, "warn", "cmdline bar update error", { err: (err as any)?.message ?? String(err) });
        }
      };
      constructor(private view: EditorView) {
        window.addEventListener("obsidian-neovim-cmdline-state", this.onState as any);
      }
      destroy() {
        window.removeEventListener("obsidian-neovim-cmdline-state", this.onState as any);
        this.hide();
      }
      private ensure() {
        if (this.bar) return;
        const el = document.createElement("div");
        el.className = "nvim-cmdbar";
        // position at bottom of the editor
        el.style.position = "absolute";
        el.style.left = "0";
        el.style.right = "0";
        el.style.bottom = "0";
        if (!this.view.scrollDOM.style.position) this.view.scrollDOM.style.position = "relative";
        this.view.scrollDOM.appendChild(el);
        this.bar = el;
      }
      private hide() {
        if (this.bar && this.bar.parentElement) this.bar.parentElement.removeChild(this.bar);
        this.bar = null;
      }
    }
  );

  const theme = EditorView.baseTheme({
    ".nvim-cmdbar": {
      backgroundColor: "var(--background-secondary)",
      borderTop: "1px solid var(--background-modifier-border)",
      fontFamily: "var(--font-monospace)",
      fontSize: "12px",
      color: "var(--text-normal)",
      padding: "4px 8px",
      pointerEvents: "none"
    },
    ".nvim-cmdbar-prompt": { color: "var(--text-muted)" },
    ".nvim-cmdbar-caret": { display: "inline-block", width: "7px", background: "var(--text-accent)" }
  });

  return [keys, domHandlers, cmdlineBar, theme];
}

function escapeHtml(s: string) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
