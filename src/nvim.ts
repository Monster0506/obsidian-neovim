import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { attach, NeovimClient } from "neovim";
import { join } from "path";
import { App } from "obsidian";
import { FileLogger } from "@src/logger";

export type NvimOptions = {
  nvimPath?: string;
  initLuaPath?: string; // absolute path; if empty, we use plugin's assets/host-init.lua
  pluginDir?: string; // absolute plugin directory path (for defaults)
};

export type RedrawHandler = (method: string, args: any[]) => void;
export type OnLinesHandler = (ev: NvimOnLinesEvent) => void;
export type OnCursorHandler = (pos: { line: number; col: number }) => void;

export type NvimOnLinesEvent = {
  buf: number;
  changedtick: number;
  firstline: number; // inclusive
  lastline: number; // exclusive
  linedata: string[]; // replacement lines
};

export class NvimHost {
  private proc!: ChildProcessWithoutNullStreams;
  public nvim!: NeovimClient;
  private ready = false;
  private mode: string = "normal";
  private currentBuf: number | null = null;

  constructor(
    private app: App,
    private opts: NvimOptions = {},
    public log = new FileLogger(app)
  ) {}

  onRedraw?: RedrawHandler;
  onLines?: OnLinesHandler;
  onCursor?: OnCursorHandler;

  async start(): Promise<void> {
    await this.log.init();
    this.log.info("NvimHost.start() begin", { opts: this.opts });

    const nvimPath = this.opts.nvimPath ?? "nvim";
    let initLua = this.opts.initLuaPath;
    if (!initLua) {
      // Default to the plugin's bundled assets/host-init.lua
      // pluginDir should be passed in from the plugin entry to avoid vault-root assumptions
      const base = this.opts.pluginDir || ((this.app as any).vault?.adapter?.basePath ?? "");
      initLua = join(base, "assets", "host-init.lua");
    }

    const args = ["--embed", "-u", "NONE", "-n"];
    args.push("-c", `lua dofile('${initLua.replace(/\\/g, "\\\\")}')`);

    this.log.info("Spawning Neovim", { nvimPath, args });

    try {
      this.proc = spawn(nvimPath, args, { stdio: "pipe" });
    } catch (e) {
      this.log.error("spawn() threw", e);
      throw e;
    }

    this.proc.on("error", (err) => {
      this.log.error("proc error", err);
    });
    this.proc.on("exit", (code, signal) => {
      this.log.warn("proc exit", { code, signal });
    });
    this.proc.stderr.on("data", (buf) => {
      this.log.error("[nvim stderr]", buf?.toString?.() ?? String(buf));
    });
    this.proc.stdout.on("data", (buf) => {
      this.log.debug("[nvim stdout chunk]", (buf?.length ?? 0) + " bytes");
    });

    try {
      this.nvim = await attach({
        proc: this.proc,
        reader: this.proc.stdout,
        writer: this.proc.stdin
      });
      this.log.info("attach() OK");
    } catch (e) {
      this.log.error("attach() failed", e);
      throw e;
    }

    try {
      const apiInfo = (await this.nvim.request("nvim_get_api_info", [])) as any;
      this.log.info("nvim_get_api_info", {
        version: apiInfo?.[1]?.version ?? apiInfo
      });
    } catch (e) {
      this.log.warn("nvim_get_api_info failed", e);
    }

    try {
      await this.nvim.request("nvim_ui_attach", [
        120,
        40,
        {
          rgb: true,
          ext_cmdline: true,
          ext_messages: true,
          ext_popupmenu: true,
          ext_hlstate: true,
          ext_linegrid: true
        }
      ]);
      this.log.info("nvim_ui_attach OK");
    } catch (e) {
      this.log.error("nvim_ui_attach failed", e);
      throw e;
    }

    this.nvim.on("notification", (method: string, args: any[]) => {
      if (method === "redraw") {
        this.parseRedraw(args);
        const head = Array.isArray(args) && args.length ? args[0] : "(empty)";
        this.log.debug("notification: redraw", head);
        this.onRedraw?.(method, args);
      } else if (method === "nvim_buf_lines_event") {
        try {
          const [buf, changedtick, first, last, linedata] = args as any[];
          const ev: NvimOnLinesEvent = {
            buf,
            changedtick,
            firstline: first,
            lastline: last,
            linedata
          };
          this.log.debug("nvim_buf_lines_event", {
            buf,
            changedtick,
            first,
            last,
            lines: linedata?.length ?? 0
          });
          this.onLines?.(ev);
        } catch (e) {
          this.log.warn("nvim_buf_lines_event parse failed", {
            err: (e as any)?.message ?? String(e)
          });
        }
      } else {
        this.log.debug("notification", { method });
      }
    });

    this.log.info("NvimHost.start() complete");
  }

  private parseRedraw(batches: any[]) {
    try {
      for (const batch of batches) {
        const [name, ...tuples] = batch;
        switch (name) {
          case "mode_change": {
            for (const t of tuples) {
              const [m] = t;
              this.mode = String(m ?? "normal");
              this.log.info("mode_change", { mode: this.mode });
            }
            break;
          }
          case "grid_cursor_goto": {
            // After UI reports a cursor move, query exact buffer cursor and emit
            for (const _t of tuples) {
              queueMicrotask(async () => {
                try {
                  const pos = await this.getCursor();
                  this.onCursor?.(pos);
                  this.log.debug("cursor sync via nvim_win_get_cursor", pos);
                } catch (e) {
                  this.log.warn("getCursor failed", {
                    err: (e as any)?.message ?? String(e)
                  });
                }
              });
            }
            break;
          }
          default:
            break;
        }
      }
    } catch (e) {
      this.log.warn("parseRedraw failed", { err: (e as any)?.message ?? String(e) });
    }
  }

  getMode(): string {
    return this.mode;
  }

  isReady() {
    return this.ready;
  }

  async stop() {
    this.log.info("NvimHost.stop()");
    try {
      await this.nvim?.request("nvim_command", [":qa!"]);
    } catch (e) {
      this.log.warn("nvim_command(:qa!) failed (continuing)", e);
    }
    try {
      this.proc?.kill();
    } catch (e) {
      this.log.warn("proc.kill() failed", e);
    }
  }

  // API helpers
  async input(keys: string) {
    this.log.debug("nvim_input", { keys });
    return this.nvim.request("nvim_input", [keys]);
  }

  async command(cmd: string) {
    this.log.debug("nvim_command", { cmd });
    return this.nvim.request("nvim_command", [cmd]);
  }

  async getCurrentBuf(): Promise<number> {
    const buf = (await this.nvim.request("nvim_get_current_buf", [])) as number;
    this.currentBuf = buf;
    this.log.debug("nvim_get_current_buf", { buf });
    return buf;
  }

  async bufAttach(buf: number) {
    this.log.info("nvim_buf_attach", { buf });
    return this.nvim.request("nvim_buf_attach", [buf, false, { on_lines: true }]);
  }

  async bufDetach(buf: number) {
    this.log.info("nvim_buf_detach", { buf });
    return this.nvim.request("nvim_buf_detach", [buf]);
  }

  async setBufferText(buf: number, text: string) {
    this.log.debug("nvim_buf_set_lines", { buf, len: text.length });
    const lines = text.split("\n");
    return this.nvim.request("nvim_buf_set_lines", [buf, 0, -1, false, lines]);
  }

  async createOrLoadBuffer(path?: string, text?: string): Promise<number> {
    this.log.info("createOrLoadBuffer", {
      path: path ?? "(in-memory)",
      len: text?.length ?? 0
    });
    if (path) {
      await this.command(`edit ${escapeVimPath(path)}`);
    } else {
      await this.command("enew");
    }
    const buf = await this.getCurrentBuf();
    if (text != null) {
      await this.setBufferText(buf, text);
      await this.command("setlocal nomodified");
    }
    try {
      await this.bufAttach(buf);
    } catch (e) {
      this.log.warn("bufAttach failed", {
        buf,
        err: (e as any)?.message ?? String(e)
      });
    }
    return buf;
  }

  async getCursor(): Promise<{ line: number; col: number }> {
    const [line1, col] = (await this.nvim.request("nvim_win_get_cursor", [
      0
    ])) as [number, number];
    return { line: Math.max(0, (line1 ?? 1) - 1), col: Math.max(0, col ?? 0) };
  }
}

function escapeVimPath(p: string) {
  return p.replace(/\\/g, "\\\\").replace(/ /g, "\\ ");
}
