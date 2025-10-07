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

  constructor(private app: App, private tag = "[obsidian-neovim]") {
    const base =
      (this.app as any)?.vault?.adapter?.basePath ||
      (this.app as any)?.vault?.getBasePath?.() ||
      "";
    this.logDir = join(base, "obsidian-neovim-logs");
    const stamp = new Date();
    const y = String(stamp.getFullYear());
    const m = String(stamp.getMonth() + 1).padStart(2, "0");
    const d = String(stamp.getDate()).padStart(2, "0");
    this.logFile = join(this.logDir, `log-${y}${m}${d}.txt`);
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
      this.ready = true;
      if (this.queue.length) {
        const queued = this.queue.join("");
        this.queue.length = 0;
        await appendFile(normalizePath(this.logFile), queued);
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
        await appendFile(normalizePath(this.logFile), chunk);
      }
    } catch (_) {
      // keep queue for retry
    } finally {
      this.writing = false;
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
