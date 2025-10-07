import { App, normalizePath } from "obsidian";
import { appendFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

export type LogLevel = "debug" | "info" | "warn" | "error";

export class FileLogger {
  private logDir: string;
  private logFile: string;
  private ready = false;
  private queue: string[] = [];
  private writing = false;
  private tmpLogFile: string;
  private memoryBuffer: string[] = [];
  private memoryBufferLimit = 500;
  private storageKey: string;

  constructor(private app: App, private tag = "[obsidian-neovim]", private pluginDir?: string) {
    // Always prefer writing logs under the plugin directory to ensure availability
    // e.g., <vault>/.obsidian/plugins/<id>/runtimelogs
    const base = this.pluginDir ||
      (this.app as any)?.vault?.adapter?.basePath ||
      (this.app as any)?.vault?.getBasePath?.() ||
      "";
    this.logDir = join(base, "runtimelogs");
    const stamp = new Date();
    const y = String(stamp.getFullYear());
    const m = String(stamp.getMonth() + 1).padStart(2, "0");
    const d = String(stamp.getDate()).padStart(2, "0");
    this.logFile = join(this.logDir, `log-${y}${m}${d}.txt`);
    // Secondary tmp sink (best-effort)
    this.tmpLogFile = `/tmp/obsidian-neovim-${y}${m}${d}.log`;
    this.storageKey = `obsidian-neovim-log-${y}${m}${d}`;
  }

  async init(): Promise<void> {
    try {
      if (!existsSync(this.logDir)) {
        await mkdir(this.logDir, { recursive: true });
      }
      await appendFile(
        normalizePath(this.logFile),
        `\n===== ${this.ts()} Logger init ${this.tag} =====\n`
      );
      // Initialize tmp sink
      try {
        await appendFile(this.tmpLogFile, `\n===== ${this.ts()} Logger init ${this.tag} (tmp) =====\n`);
      } catch (_) {}
      this.ready = true;
      if (this.queue.length) {
        const queued = this.queue.join("");
        this.queue.length = 0;
        await appendFile(normalizePath(this.logFile), queued);
        try { await appendFile(this.tmpLogFile, queued); } catch (_) {}
        try { this.appendToStorage(queued); } catch (_) {}
      }
    } catch (e) {
      try {
        await appendFile(
          normalizePath(this.logFile),
          `\n${this.ts()} [error] Logger init failed: ${serializeErr(e)}\n`
        );
      } catch (_) {}
    }
  }

  debug(msg: string, extra?: any) {
    this.write("debug", msg, extra);
  }
  info(msg: string, extra?: any) {
    this.write("info", msg, extra);
  }
  warn(msg: string, extra?: any) {
    this.write("warn", msg, extra);
  }
  error(msg: string, extra?: any) {
    this.write("error", msg, extra);
  }

  private async write(level: LogLevel, msg: string, extra?: any) {
    const line =
      `${this.ts()} [${level}] ${this.tag} ${msg}` +
      (extra !== undefined ? ` ${safeJson(extra)}\n` : `\n`);
    if (!this.ready) {
      this.queue.push(line);
      return;
    }
    this.queue.push(line);
    if (this.writing) return;
    this.writing = true;
    try {
      while (this.queue.length) {
        const chunk = this.queue.splice(0, 256).join("");
        // file sink under plugin dir
        await appendFile(normalizePath(this.logFile), chunk);
        // tmp sink (best-effort)
        try { await appendFile(this.tmpLogFile, chunk); } catch (_) {}
        // console sink
        try { console.debug?.(chunk) } catch (_) {}
        // local storage sink
        try { this.appendToStorage(chunk); } catch (_) {}
        // memory buffer sink
        this.appendToMemory(chunk);
        // in-app event sink
        try {
          (window as any)?.dispatchEvent?.(new CustomEvent("obsidian-neovim-log", { detail: { chunk } }));
        } catch (_) {}
      }
    } catch (_) {
      // keep queue for retry
    } finally {
      this.writing = false;
    }
  }

  private appendToStorage(text: string) {
    try {
      const prev = (window as any)?.localStorage?.getItem?.(this.storageKey) ?? "";
      (window as any)?.localStorage?.setItem?.(this.storageKey, prev + text);
    } catch (_) {}
  }

  private appendToMemory(text: string) {
    // split by lines to cap memory reasonably
    const parts = String(text).split(/\n/);
    for (const p of parts) {
      if (!p) continue;
      this.memoryBuffer.push(p);
      if (this.memoryBuffer.length > this.memoryBufferLimit) {
        this.memoryBuffer.splice(0, this.memoryBuffer.length - this.memoryBufferLimit);
      }
    }
  }

  private ts(): string {
    const d = new Date();
    const pad = (n: number, w = 2) => String(n).padStart(w, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
      d.getSeconds()
    )}.${String(d.getMilliseconds()).padStart(3, "0")}`;
  }

  getLogDirectory(): string {
    return this.logDir;
  }

  getLogFilePath(): string {
    return this.logFile;
  }

  getTmpLogFilePath(): string {
    return this.tmpLogFile;
  }

  getLocalStorageKey(): string {
    return this.storageKey;
  }

  getRecentBuffer(max = 200): string {
    const start = Math.max(0, this.memoryBuffer.length - max);
    return this.memoryBuffer.slice(start).join("\n");
  }
}

function safeJson(v: any): string {
  try {
    return JSON.stringify(v, (_k, val) =>
      val instanceof Error ? serializeErr(val) : val
    );
  } catch {
    return String(v);
  }
}

function serializeErr(e: any) {
  if (!e) return String(e);
  return {
    name: e.name,
    message: e.message,
    stack: e.stack,
    ...e
  };
}
