import { Plugin, Notice, PluginSettingTab, App, Setting, Modal } from "obsidian";
import { join } from "path";
import { NvimHost } from "@src/nvim";
import { neovimExtension, translateKey } from "@src/cm6";
import { FileLogger } from "@src/logger";
import { getActiveEditor, getActiveMarkdownView } from "@src/obsidian-helpers";
import { EditorBridge } from "@src/bridge";
import { SyncApplier } from "@src/sync";
import { DEFAULT_SETTINGS, NeovimSettings } from "@src/settings";
import { CommandLineModal } from "@src/ui/cmdline";
import {
  RegistersManager,
  MarksManager,
  SearchManager,
  JumpListManager,
  MacroManager
} from "@src/vim-features";

const PLUGIN_TAG = "[obsidian-neovim]";

export default class NeovimBackendPlugin extends Plugin {
  private nvim!: NvimHost;
  private log!: FileLogger;
  private bridge!: EditorBridge;
  private cmExtRegistered = false;
  private layoutReadyLogged = false;
  private sync!: SyncApplier;
  private attachedBuf: number | null = null;
  settings!: NeovimSettings;
  private pluginDir!: string;
  private lastFallbackSyncTs = 0;
  private pendingFallback = false;
  private inputSyncThrottled = false;
  // Note: Visual selection sync attempts removed for now; see syncVisualSelection()
  private cmdline?: CommandLineModal;
  private cmdPollId: number | null = null;

  // Vim feature managers
  private registers!: RegistersManager;
  private marks!: MarksManager;
  private search!: SearchManager;
  private jumpList!: JumpListManager;
  private macros!: MacroManager;

  async onload() {
    const vaultBase =
      (this.app as any)?.vault?.adapter?.basePath ||
      (this.app as any)?.vault?.getBasePath?.() ||
      "";
    this.pluginDir = join(vaultBase, ".obsidian", "plugins", this.manifest.id);
    this.log = new FileLogger(this.app, PLUGIN_TAG, this.pluginDir);
    await this.log.init();
    try {
      new Notice("obsidian-neovim onload reached");
    } catch {}
    try {
      // Minimal always-on overlay logger for sanity checks
      const w: any = window as any;
      if (!w.__nvimOverlay) {
        const ol = document.createElement("div");
        ol.style.cssText =
          "position:fixed;right:8px;bottom:8px;max-width:40vw;max-height:35vh;z-index:999999;background:#000c;color:#9cf;border:1px solid #224;padding:6px;font:12px/1.3 monospace;opacity:.95;backdrop-filter: blur(2px);display:flex;flex-direction:column;gap:6px";

        const toolbar = document.createElement("div");
        toolbar.style.cssText = "display:flex;gap:6px;align-items:center;justify-content:space-between";
        const title = document.createElement("span");
        title.textContent = "obsidian-neovim overlay logger";
        title.style.cssText = "color:#7fb;opacity:.9";
        const btns = document.createElement("div");
        btns.style.cssText = "display:flex;gap:6px";
        const copyBtn = document.createElement("button");
        copyBtn.textContent = "Copy all";
        copyBtn.style.cssText = "background:#123;color:#9cf;border:1px solid #246;padding:2px 6px;border-radius:4px;cursor:pointer";
        const clearBtn = document.createElement("button");
        clearBtn.textContent = "Clear";
        clearBtn.style.cssText = "background:#123;color:#9cf;border:1px solid #246;padding:2px 6px;border-radius:4px;cursor:pointer";
        btns.appendChild(copyBtn);
        btns.appendChild(clearBtn);
        toolbar.appendChild(title);
        toolbar.appendChild(btns);

        const content = document.createElement("pre");
        content.style.cssText = "margin:0;white-space:pre-wrap;overflow:auto;flex:1;user-select:text";
        content.textContent = "overlay initialized\n";

        copyBtn.onclick = async () => {
          const text = content.textContent ?? "";
          try {
            if (navigator?.clipboard?.writeText) {
              await navigator.clipboard.writeText(text);
            } else {
              const ta = document.createElement("textarea");
              ta.value = text;
              ta.style.position = "fixed";
              ta.style.opacity = "0";
              document.body.appendChild(ta);
              ta.select();
              document.execCommand("copy");
              document.body.removeChild(ta);
            }
          } catch {}
        };
        clearBtn.onclick = () => {
          content.textContent = "";
        };

        ol.appendChild(toolbar);
        ol.appendChild(content);
        document.body.appendChild(ol);
        w.__nvimOverlay = ol;
        w.__nvimLog = (t: any) => {
          try {
            const s = typeof t === "string" ? t : JSON.stringify(t);
            content.textContent += s + "\n";
            content.scrollTop = content.scrollHeight;
          } catch {}
        };
      }
      (window as any).__nvimLog?.("onload: begin");
    } catch {}
    this.bridge = new EditorBridge(this.app);
    this.sync = new SyncApplier(this.bridge, this.log);

    // Load settings
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new NeovimSettingsTab(this.app, this));

    try {
      this.log.info("Loading Obsidian Neovim Backend POC", {
        manifest: this.manifest,
        platform: process.platform,
        node: process.version,
        cwd: process.cwd?.()
      });

      this.addRibbonIcon("dot", "Restart Neovim", async () => {
        this.log.info("Ribbon clicked: restart");
        try {
          await this.restartNvim();
          new Notice("Neovim restarted");
        } catch (e) {
          this.log.error("Restart error", e);
          new Notice("Failed to restart Neovim (see log file)");
        }
      });

      // Commands
      this.addCommand({
        id: "obsidian-neovim-restart",
        name: "Restart Neovim",
        callback: async () => {
          try {
            await this.restartNvim();
            new Notice("Neovim restarted");
          } catch (e) {
            this.log.error("Restart error", e);
            new Notice("Failed to restart Neovim (see log file)");
          }
        }
      });

      this.addCommand({
        id: "obsidian-neovim-toggle",
        name: "Toggle enable",
        callback: async () => {
          this.settings.enabled = !this.settings.enabled;
          await this.saveData(this.settings);
          if (this.settings.enabled) {
            await this.startNvim();
            await this.syncActiveEditorToNvim();
            new Notice("Obsidian Neovim enabled");
          } else {
            await this.nvim?.stop();
            new Notice("Obsidian Neovim disabled");
          }
        }
      });

      this.addCommand({
        id: "obsidian-neovim-open-log-path",
        name: "Show log file path",
        callback: () => {
          const p = this.log.getLogFilePath();
          const tmp = this.log.getTmpLogFilePath?.() ?? "(no tmp)";
          const ls = this.log.getLocalStorageKey?.() ?? "(no storage)";
          new Notice(`Log: ${p}\nTmp: ${tmp}\nStorageKey: ${ls}\nUse: View → Toggle Developer Tools (Console)\nOr run: window.addEventListener('obsidian-neovim-log', e => console.log(e.detail.chunk))`);
          this.log.info("Log path requested", { path: p, tmp, storageKey: ls });
        }
      });

      this.addCommand({
        id: "obsidian-neovim-reconnect-external",
        name: "Reconnect to external Neovim",
        callback: async () => {
          try {
            await this.restartNvim();
            new Notice("Reconnected to Neovim");
          } catch (e) {
            this.log.error("Reconnect error", e);
            new Notice("Failed to reconnect (see log file)");
          }
        }
      });

      // Vim features commands
      this.addCommand({
        id: "obsidian-neovim-show-registers",
        name: "Show registers",
        callback: async () => {
          if (!this.registers) {
            new Notice("Neovim not started");
            return;
          }
          try {
            const regs = await this.registers.getAllRegisters();
            new RegistersModal(this.app, regs).open();
          } catch (e) {
            this.log.error("Show registers error", e);
            new Notice("Failed to get registers");
          }
        }
      });

      this.addCommand({
        id: "obsidian-neovim-show-marks",
        name: "Show marks",
        callback: async () => {
          if (!this.marks) {
            new Notice("Neovim not started");
            return;
          }
          try {
            const marks = await this.marks.getAllMarks();
            new MarksModal(this.app, marks, this.marks).open();
          } catch (e) {
            this.log.error("Show marks error", e);
            new Notice("Failed to get marks");
          }
        }
      });

      this.addCommand({
        id: "obsidian-neovim-show-jumplist",
        name: "Show jump list",
        callback: async () => {
          if (!this.jumpList) {
            new Notice("Neovim not started");
            return;
          }
          try {
            const { jumps, current } = await this.jumpList.getJumpList();
            new JumpListModal(this.app, jumps, current).open();
          } catch (e) {
            this.log.error("Show jump list error", e);
            new Notice("Failed to get jump list");
          }
        }
      });

      this.addCommand({
        id: "obsidian-neovim-clear-search",
        name: "Clear search highlights",
        callback: async () => {
          if (!this.search) {
            new Notice("Neovim not started");
            return;
          }
          try {
            await this.search.clearSearch();
            new Notice("Search cleared");
          } catch (e) {
            this.log.error("Clear search error", e);
            new Notice("Failed to clear search");
          }
        }
      });

      if (this.settings.enabled) {
        await this.startNvim();
        (window as any).__nvimLog?.("nvim: started");
      } else {
        this.log.info("Plugin disabled via settings; not starting Neovim");
        (window as any).__nvimLog?.("plugin disabled via settings");
      }

      // Redraw hookup (mode logs handled in NvimHost)
      if (this.nvim) {
        this.log.info("Hooking nvim.onRedraw");
        (window as any).__nvimLog?.("hook: onRedraw");
        this.nvim.onRedraw = (method, args) => {
          try {
            const head = Array.isArray(args) && args.length > 0 ? args[0] : "(empty)";
            this.log.debug(`onRedraw: ${method}`, head);
            // Fallback sync while in insert mode: sometimes on_lines may not arrive via buf_attach
            this.maybeScheduleFallbackSync();
          } catch (e) {
            this.log.error("onRedraw handler error", e);
          }
        };
      } else {
        this.log.warn("Skipping nvim.onRedraw hookup: nvim not started");
      }

      // Mode change: previously used to drive visual selection highlight; disabled for now
      if (this.nvim) {
        this.nvim.onModeChange = async (mode) => {
          this.log.debug("onModeChange", { mode });
        };
      }

      // Cmdline wiring for CM6 bottom bar (no modal)
      this.cmdline = undefined; // stop using modal
      this.nvim.onCmdline = (ev) => {
        try {
          if (ev.type === "show") {
            this.log.debug("cmdline show", { prompt: ev.prompt, contentLen: ev.content.length, pos: ev.pos });
            // Query authoritative state from Neovim to ensure accurate echo
            void this.nvim.getCmdlineState().then((st) => {
              window.dispatchEvent(new CustomEvent("obsidian-neovim-cmdline-state", { detail: { type: st.type, content: st.content, pos: st.pos, visible: true } }));
            });
            this.startCmdlinePolling();
          } else if (ev.type === "pos") {
            // Future: track content locally and update caret only
            this.log.debug("cmdline pos", { pos: ev.pos });
            void this.nvim.getCmdlineState().then((st) => {
              window.dispatchEvent(new CustomEvent("obsidian-neovim-cmdline-state", { detail: { type: st.type, content: st.content, pos: st.pos, visible: true } }));
            });
          } else if (ev.type === "hide") {
            this.log.debug("cmdline hide");
            window.dispatchEvent(new CustomEvent("obsidian-neovim-cmdline-state", { detail: { type: ":", content: "", pos: 0, visible: false } }));
            this.stopCmdlinePolling();
          } else if (ev.type === "wildmenu") {
            this.log.debug("cmdline wildmenu", { count: ev.items.length, selected: ev.selected });
            // TODO: render wildmenu in bar
          }
        } catch (e) {
          this.log.warn("cmdline overlay error", { err: (e as any)?.message ?? String(e) });
        }
      };

      // on_lines -> apply precise changes
      if (this.nvim) {
        this.nvim.onLines = (ev) => {
          this.log.debug("onLines received", {
            buf: ev.buf,
            first: ev.firstline,
            last: ev.lastline,
            lines: ev.linedata.length
          });
          this.sync.enqueue(ev);
        };
      }

      // Cursor sync: set Obsidian cursor when Neovim moves it
      if (this.nvim) {
        this.nvim.onCursor = async ({ line, col }) => {
          try {
            const ed = getActiveEditor(this.app);
            if (!ed) {
              this.log.debug("onCursor: no active editor");
              return;
            }
            const lc = ed.lineCount();
            const clampedLine = Math.max(0, Math.min(line, Math.max(0, lc - 1)));
            const lineText = ed.getLine(clampedLine) ?? "";
            const clampedCh = Math.max(0, Math.min(col, lineText.length));
            ed.setCursor({ line: clampedLine, ch: clampedCh });
          this.log.debug("onCursor: set", { line: clampedLine, ch: clampedCh });
          (window as any).__nvimLog?.(`cursor: ${clampedLine}:${clampedCh}`);
          } catch (e) {
            this.log.warn("onCursor error", { err: (e as any)?.message ?? String(e) });
          }
        };
      }

      // Register the CM6 extension only after layout is ready
      this.app.workspace.onLayoutReady(() => {
        if (!this.layoutReadyLogged) {
          this.layoutReadyLogged = true;
          this.log.info("onLayoutReady");
        }
        setTimeout(() => {
          try {
            this.tryRegisterCmExtension();
            void this.syncActiveEditorToNvim();
          } catch (e) {
            this.log.error("onLayoutReady handler error", e);
          }
        }, 0);
      });

      // Leaf change
      this.registerEvent(
        this.app.workspace.on("active-leaf-change", (leaf) => {
          this.log.info("active-leaf-change", {
            leaf: leaf ? leaf.getDisplayText?.() : "(no leaf)"
          });
          setTimeout(() => {
            try {
              this.tryRegisterCmExtension();
              void this.syncActiveEditorToNvim();
            } catch (e) {
              this.log.error("active-leaf-change handler error", e);
            }
          }, 0);
        })
      );

      // File open
      this.registerEvent(
        this.app.workspace.on("file-open", (file) => {
          this.log.info("file-open", { path: file?.path ?? null });
          setTimeout(() => {
            try {
              this.tryRegisterCmExtension();
              void this.syncActiveEditorToNvim();
            } catch (e) {
              this.log.error("file-open handler error", e);
            }
          }, 0);
        })
      );

      // Initial attempt
      setTimeout(() => {
        try {
          this.tryRegisterCmExtension();
          void this.syncActiveEditorToNvim();
          // Listen for key-driven sync triggers
          this.registerDomEvent(window, "obsidian-neovim-input" as any, () => {
            this.log.debug("obsidian-neovim-input event");
            (window as any).__nvimLog?.("event: obsidian-neovim-input");
            this.handleKeyDrivenSync();
          });
          // Capture-level key interception to ensure Neovim receives keys
          const capture = (e: KeyboardEvent) => {
            try {
              // Allow only Ctrl+P to Obsidian
              if (e.ctrlKey && !e.shiftKey && !e.altKey && (e.key === "P" || e.key === "p")) return;
              const term = translateKey(e);
              if (!term) return;
              // Open cmdline bar immediately on ':' or search ('/' or '?') and start polling
              if (term === ":" || term === "/" || term === "?") {
                window.dispatchEvent(new CustomEvent("obsidian-neovim-cmdline-state", { detail: { type: term, content: "", pos: 0, visible: true } }));
                // Kick one immediate poll before sending ':' to avoid a blank frame
                void this.nvim.getCmdlineState().then((st) => {
                  window.dispatchEvent(new CustomEvent("obsidian-neovim-cmdline-state", { detail: { type: st.type, content: st.content, pos: st.pos, visible: true } }));
                });
                this.startCmdlinePolling();
              }
              e.preventDefault();
              e.stopPropagation();
              (e as any).__nvimHandled = true;
              (window as any).__nvimLog?.(`key: ${term}`);
              // If modal is open and we're in cmdline, locally echo printable input before sending
              const isCmdPromptOpen = term === ":" || term === "/" || term === "?";
              const isCmdSubmitOrCancel = term === "<CR>" || term === "<Esc>";
              // After sending input, re-pull cmdline state to reflect any changes (mappings, etc.)
              const send = () => this.nvim
                .input(term)
                .then(async () => {
                  this.log.debug("capture nvim.input ok", { term });
                  if (isCmdPromptOpen) {
                    const st = await this.nvim.getCmdlineState();
                    window.dispatchEvent(new CustomEvent("obsidian-neovim-cmdline-state", { detail: { type: st.type, content: st.content, pos: st.pos, visible: !isCmdSubmitOrCancel } }));
                  }
                  if (isCmdPromptOpen && isCmdSubmitOrCancel) this.stopCmdlinePolling();
                })
                .catch((err) => this.log.warn("capture nvim.input failed", { term, err: err?.message ?? String(err) }))
                .finally(() => {
                  try {
                    window.dispatchEvent(new CustomEvent("obsidian-neovim-input", { detail: { term } }));
                  } catch {}
                });
              // Avoid potential race for the initial ':' by microtasking the send
              if (term === ":") {
                queueMicrotask(() => { void send(); });
              } else {
                void send();
              }
            } catch (err) {
              this.log.warn("capture key error", { err: (err as any)?.message ?? String(err) });
            }
          };
          window.addEventListener("keydown", capture, { capture: true });
          this.register(() => window.removeEventListener("keydown", capture, { capture: true } as any));
        } catch (e) {
          this.log.error("initial attempt error", e);
        }
      }, 0);

      this.log.info("onload completed");
    } catch (e) {
      this.log.error("onload fatal error", e);
      new Notice("Obsidian Neovim failed to load (see log file)");
      throw e;
    }
  }

  async onunload() {
    this.log?.info("onunload starting");
    try {
      await this.nvim?.stop();
      this.log?.info("onunload completed");
    } catch (e) {
      this.log?.error("onunload error", e);
    }
  }

  private tryRegisterCmExtension() {
    if (this.cmExtRegistered) {
      this.log.info("CM6 extension already registered");
      return;
    }
    const mv = getActiveMarkdownView(this.app);
    if (!mv) {
      this.log.info("CM6 extension deferred: no MarkdownView yet");
      return;
    }
    try {
      this.log.info("registerEditorExtension(neovimExtension) begin", {
        viewType: mv.getViewType?.() ?? null
      });
      this.registerEditorExtension(neovimExtension(this.nvim));
      this.cmExtRegistered = true;
      this.log.info("registerEditorExtension(neovimExtension) ok");
    } catch (e) {
      this.log.error("registerEditorExtension error", e);
    }
  }

  private async startNvim() {
    this.log.info("startNvim begin");
    try {
      this.nvim = new NvimHost(
        this.app,
        {
          nvimPath: this.settings.nvimPath || "nvim",
          initLuaPath: this.settings.initLuaPath || "",
          pluginDir: this.pluginDir,
          externalSocketPath: this.settings.useExternal ? (this.settings.externalSocketPath || undefined) : undefined,
          externalHost: this.settings.useExternal ? (this.settings.externalHost || undefined) : undefined,
          externalPort: this.settings.useExternal ? (this.settings.externalPort || undefined) : undefined,
        },
        this.log
      );
      await this.nvim.start();

      // Initialize Vim feature managers
      this.registers = new RegistersManager(this.nvim, this.log);
      this.marks = new MarksManager(this.nvim, this.log);
      this.search = new SearchManager(this.nvim, this.log);
      this.jumpList = new JumpListManager(this.nvim, this.log);
      this.macros = new MacroManager(this.nvim, this.log);

      this.log.info("startNvim ok");
    } catch (e) {
      this.log.error("startNvim error", e);
      new Notice("Failed to start Neovim (see log file)");
      throw e;
    }
  }

  private async restartNvim() {
    this.log.info("restartNvim begin");
    try {
      await this.nvim.stop();
    } catch (e) {
      this.log.warn("restartNvim stop() error (continuing)", e);
    }
    await this.startNvim();
    await this.syncActiveEditorToNvim();
    this.log.info("restartNvim ok");
  }

  private async syncActiveEditorToNvim() {
    this.log.info("syncActiveEditorToNvim begin");
    try {
      const editor = getActiveEditor(this.app);
      const file = this.app.workspace.getActiveFile();

      if (!editor) {
        this.log.warn("syncActiveEditorToNvim: no active editor; skip");
        return;
      }

      const text = editor.getValue();
      this.log.info("syncActiveEditorToNvim: pushing", {
        length: text.length,
        path: file?.path ?? "(no file)"
      });

      if (this.attachedBuf != null) {
        try {
          await this.nvim.bufDetach(this.attachedBuf);
          this.log.info("Detached previous buf", { buf: this.attachedBuf });
        } catch (e) {
          this.log.warn("bufDetach previous failed", {
            buf: this.attachedBuf,
            err: (e as any)?.message ?? String(e)
          });
        }
        this.attachedBuf = null;
      }

      const buf = await this.nvim.createOrLoadBuffer(undefined, text);
      this.attachedBuf = buf;

      // Initial cursor sync (exact)
      try {
        const pos = await this.nvim.getCursor();
        const ed = getActiveEditor(this.app);
        if (ed) {
          const lc = ed.lineCount();
          const line = Math.max(0, Math.min(pos.line, Math.max(0, lc - 1)));
          const lineText = ed.getLine(line) ?? "";
          const ch = Math.max(0, Math.min(pos.col, lineText.length));
          ed.setCursor({ line, ch });
          this.log.debug("initial cursor sync", { line, ch });
        }
      } catch (e) {
        this.log.warn("initial cursor sync failed", {
          err: (e as any)?.message ?? String(e)
        });
      }

      this.log.info("syncActiveEditorToNvim ok", { buf });
    } catch (e) {
      this.log.error("syncActiveEditorToNvim error", e);
      new Notice("Failed to sync editor to Neovim (see log file)");
      throw e;
    }
  }

  private async maybeScheduleFallbackSync() {
    try {
      const mode = (await this.nvim.getMode()).mode;
      if (mode !== "insert") return;
      const now = Date.now();
      // throttle to ~20 Hz max
      if (this.pendingFallback || now - this.lastFallbackSyncTs < 50) return;
      this.pendingFallback = true;
      setTimeout(async () => {
        try {
          const ed = getActiveEditor(this.app);
          if (!ed) return;
          const nvimText = await this.nvim.getBufferText();
          const obsidianText = ed.getValue();
          if (typeof nvimText === "string" && nvimText !== obsidianText) {
            ed.setValue(nvimText);
            this.log.debug("fallback sync applied", { len: nvimText.length });
          }
        } catch (e) {
          this.log.warn("fallback sync error", { err: (e as any)?.message ?? String(e) });
        } finally {
          this.lastFallbackSyncTs = Date.now();
          this.pendingFallback = false;
        }
      }, 0);
    } catch (e) {
      this.log.warn("maybeScheduleFallbackSync error", { err: (e as any)?.message ?? String(e) });
    }
  }

  private handleKeyDrivenSync() {
    try {
      if (this.inputSyncThrottled) return;
      this.inputSyncThrottled = true;
      // Throttle to ~30 Hz
      setTimeout(async () => {
        try {
          const ed = getActiveEditor(this.app);
          if (!ed) return;
          this.log.debug("key-sync tick");
          const text = await this.nvim.getBufferText();
          if (typeof text === "string" && text.length > 0) {
            if (text !== ed.getValue()) {
              ed.setValue(text);
              this.log.debug("key-sync applied", { len: text.length });
            }
          }
          // Always try cursor sync on key events
          try {
            const pos = await this.nvim.getCursor();
            const lc = ed.lineCount();
            const line = Math.max(0, Math.min(pos.line, Math.max(0, lc - 1)));
            const lineText = ed.getLine(line) ?? "";
            const ch = Math.max(0, Math.min(pos.col, lineText.length));
            ed.setCursor({ line, ch });
            // Visual selection highlight disabled for now
          } catch (e) {
            this.log.warn("key-sync cursor error", { err: (e as any)?.message ?? String(e) });
          }
        } catch (e) {
          this.log.warn("key-sync error", { err: (e as any)?.message ?? String(e) });
        } finally {
          this.inputSyncThrottled = false;
        }
      }, 33);
    } catch (e) {
      this.log.warn("handleKeyDrivenSync error", { err: (e as any)?.message ?? String(e) });
    }
  }

  // Visual selection sync (disabled)
  // Attempts tried and removed for now:
  // - Querying Neovim visual marks via getpos("'<")/getpos("'>") on mode changes and key ticks
  // - Polling while in visual modes to keep selection updated
  // - Rendering highlights using CodeMirror 6 decorations (StateField + ViewPlugin)
  // Issues observed: highlight not reliably rendering, cursor occasionally jumping to EOL.
  // Next approach to consider: derive CM6 ranges from ext_linegrid highlight ops, or compute
  // ranges based on actual buffer positions mapped to CM6 doc positions with robust mapping.
  private async syncVisualSelection() { return; }

  // Visual mode helpers intentionally omitted (see comment above)

  private startCmdlinePolling() {
    try {
      if (this.cmdPollId != null) return;
      const tick = async () => {
        try {
          const st = await this.nvim.getCmdlineState();
          this.cmdline?.update(st.type, st.content, st.pos);
          (window as any).__nvimLog?.(`cmdline: type=${st.type} pos=${st.pos} text='${st.content}'`);
        } catch (e) {
          // Ignore errors during polling
        }
      };
      const id = window.setInterval(tick, 50);
      this.cmdPollId = id as unknown as number;
      this.registerInterval(id);
      (window as any).__nvimLog?.("cmdline polling: start");
    } catch {}
  }

  private stopCmdlinePolling() {
    try {
      if (this.cmdPollId != null) {
        window.clearInterval(this.cmdPollId);
        this.cmdPollId = null;
        (window as any).__nvimLog?.("cmdline polling: stop");
      }
    } catch {}
  }
}

class NeovimSettingsTab extends PluginSettingTab {
  constructor(app: App, private plugin: NeovimBackendPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Obsidian Neovim" });

    new Setting(containerEl)
      .setName("Enable plugin")
      .setDesc("Start and use Neovim for editing")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.enabled).onChange(async (v) => {
          this.plugin.settings.enabled = v;
          await this.plugin.saveData(this.plugin.settings);
        });
      });

    new Setting(containerEl)
      .setName("Neovim path")
      .setDesc("Executable to launch (e.g., nvim)")
      .addText((text) => {
        text
          .setPlaceholder("nvim")
          .setValue(this.plugin.settings.nvimPath)
          .onChange(async (value) => {
            this.plugin.settings.nvimPath = value.trim();
            await this.plugin.saveData(this.plugin.settings);
          });
      });

    new Setting(containerEl)
      .setName("Init Lua path")
      .setDesc("Absolute path to host-init.lua. Leave empty to use bundled default.")
      .addText((text) => {
        text
          .setPlaceholder("")
          .setValue(this.plugin.settings.initLuaPath)
          .onChange(async (value) => {
            this.plugin.settings.initLuaPath = value.trim();
            await this.plugin.saveData(this.plugin.settings);
          });
      });

    containerEl.createEl("h3", { text: "External Neovim (--listen)" });

    new Setting(containerEl)
      .setName("Attach to external Neovim")
      .setDesc("If enabled, connect to a running nvim --listen instead of spawning.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.useExternal).onChange(async (v) => {
          this.plugin.settings.useExternal = v;
          await this.plugin.saveData(this.plugin.settings);
        });
      });

    new Setting(containerEl)
      .setName("Socket path")
      .setDesc("UNIX socket/pipe path for --listen (optional)")
      .addText((text) => {
        text
          .setPlaceholder("/tmp/nvim-obsidian.sock")
          .setValue(this.plugin.settings.externalSocketPath)
          .onChange(async (value) => {
            this.plugin.settings.externalSocketPath = value.trim();
            await this.plugin.saveData(this.plugin.settings);
          });
      });

    new Setting(containerEl)
      .setName("Host")
      .setDesc("TCP host for --listen (optional)")
      .addText((text) => {
        text
          .setPlaceholder("127.0.0.1")
          .setValue(this.plugin.settings.externalHost)
          .onChange(async (value) => {
            this.plugin.settings.externalHost = value.trim();
            await this.plugin.saveData(this.plugin.settings);
          });
      });

    new Setting(containerEl)
      .setName("Port")
      .setDesc("TCP port for --listen (optional)")
      .addText((text) => {
        text
          .setPlaceholder("8000")
          .setValue(String(this.plugin.settings.externalPort))
          .onChange(async (value) => {
            const n = Number(value);
            this.plugin.settings.externalPort = Number.isFinite(n) ? n : this.plugin.settings.externalPort;
            await this.plugin.saveData(this.plugin.settings);
          });
      });
  }
}

// Modals for Vim features
import type { VimRegister, VimMark, JumpEntry } from "@src/vim-features";

class RegistersModal extends Modal {
  constructor(app: App, private registers: VimRegister[]) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Vim Registers" });

    if (this.registers.length === 0) {
      contentEl.createEl("p", { text: "No registers with content" });
      return;
    }

    const container = contentEl.createDiv({ cls: "vim-registers-list" });
    for (const reg of this.registers) {
      const item = container.createDiv({ cls: "vim-register-item" });
      const header = item.createDiv({ cls: "vim-register-header" });
      header.createEl("strong", { text: `"${reg.name}` });
      header.createEl("span", { text: ` (${reg.type === "l" ? "line" : reg.type === "b" ? "block" : "char"})` });

      const content = item.createEl("pre", { cls: "vim-register-content" });
      content.textContent = reg.content.join("\n");
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class MarksModal extends Modal {
  constructor(app: App, private marks: VimMark[], private marksManager: MarksManager) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Vim Marks" });

    if (this.marks.length === 0) {
      contentEl.createEl("p", { text: "No marks set" });
      return;
    }

    const container = contentEl.createDiv({ cls: "vim-marks-list" });
    for (const mark of this.marks) {
      const item = container.createDiv({ cls: "vim-mark-item" });
      const text = `'${mark.name} → Line ${mark.line + 1}, Col ${mark.col + 1}${mark.file ? ` (${mark.file})` : ""}`;
      const btn = item.createEl("button", { text });
      btn.addEventListener("click", async () => {
        await this.marksManager.jumpToMark(mark.name);
        this.close();
      });
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class JumpListModal extends Modal {
  constructor(app: App, private jumps: JumpEntry[], private current: number) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Jump List" });

    if (this.jumps.length === 0) {
      contentEl.createEl("p", { text: "Jump list is empty" });
      return;
    }

    const container = contentEl.createDiv({ cls: "vim-jumplist" });
    for (let i = 0; i < this.jumps.length; i++) {
      const jump = this.jumps[i];
      const item = container.createDiv({ cls: "vim-jump-item" });
      if (i === this.current) {
        item.addClass("is-current");
      }

      const text = `${i === this.current ? ">" : " "} Line ${jump.line + 1}, Col ${jump.col + 1}${jump.file ? ` (${jump.file})` : ""}`;
      item.createEl("div", { text });
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
