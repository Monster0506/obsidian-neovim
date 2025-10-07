import { Plugin, Notice, PluginSettingTab, App, Setting } from "obsidian";
import { NvimHost } from "@src/nvim";
import { neovimExtension } from "@src/cm6";
import { FileLogger } from "@src/logger";
import { getActiveEditor, getActiveMarkdownView } from "@src/obsidian-helpers";
import { EditorBridge } from "@src/bridge";
import { SyncApplier } from "@src/sync";
import { DEFAULT_SETTINGS, NeovimSettings } from "@src/settings";

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

  async onload() {
    const pluginDir = (this.manifest as any)?.dir || (this.app as any)?.vault?.adapter?.basePath || "";
    this.log = new FileLogger(this.app, PLUGIN_TAG, pluginDir);
    await this.log.init();
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
          new Notice(`Log: ${p}`);
          this.log.info("Log path requested", { path: p });
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

      if (this.settings.enabled) {
        await this.startNvim();
      } else {
        this.log.info("Plugin disabled via settings; not starting Neovim");
      }

      // Redraw hookup (mode logs handled in NvimHost)
      this.log.info("Hooking nvim.onRedraw");
      this.nvim.onRedraw = (method, args) => {
        try {
          const head = Array.isArray(args) && args.length > 0 ? args[0] : "(empty)";
          this.log.debug(`onRedraw: ${method}`, head);
        } catch (e) {
          this.log.error("onRedraw handler error", e);
        }
      };

      // on_lines -> apply precise changes
      this.nvim.onLines = (ev) => {
        this.log.debug("onLines received", {
          buf: ev.buf,
          first: ev.firstline,
          last: ev.lastline,
          lines: ev.linedata.length
        });
        this.sync.enqueue(ev);
      };

      // Cursor sync: set Obsidian cursor when Neovim moves it
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
        } catch (e) {
          this.log.warn("onCursor error", { err: (e as any)?.message ?? String(e) });
        }
      };

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
          pluginDir: (this.manifest as any)?.dir || (this.app as any)?.vault?.adapter?.basePath || "",
          externalSocketPath: this.settings.useExternal ? (this.settings.externalSocketPath || undefined) : undefined,
          externalHost: this.settings.useExternal ? (this.settings.externalHost || undefined) : undefined,
          externalPort: this.settings.useExternal ? (this.settings.externalPort || undefined) : undefined,
        },
        this.log
      );
      await this.nvim.start();
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
          .setPlaceholder("/tmp/nvim-remote-socket")
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
