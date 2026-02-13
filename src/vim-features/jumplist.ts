import type { NvimHost } from "@src/nvim";
import type { FileLogger } from "@src/logger";

export interface JumpEntry {
  line: number;  // 0-indexed
  col: number;   // 0-indexed
  file?: string;
}

export class JumpListManager {
  constructor(
    private nvim: NvimHost,
    private log: FileLogger
  ) {}

  async getJumpList(): Promise<{ jumps: JumpEntry[], current: number }> {
    try {
      const result = (await this.nvim.nvim.request("nvim_call_function", [
        "getjumplist",
        []
      ])) as any[];

      if (!result || result.length < 2) {
        return { jumps: [], current: 0 };
      }

      const [jumpList, currentIdx] = result;
      const jumps: JumpEntry[] = [];

      for (const jump of jumpList) {
        if (!jump) continue;

        const line = Math.max(0, (jump.lnum ?? 1) - 1);
        const col = Math.max(0, (jump.col ?? 1) - 1);
        const bufnr = jump.bufnr;

        jumps.push({
          line,
          col,
          file: bufnr > 0 ? await this.getBufferName(bufnr) : undefined
        });
      }

      return {
        jumps,
        current: Number(currentIdx ?? 0)
      };
    } catch (e) {
      this.log.warn("getJumpList failed", { err: (e as any)?.message ?? String(e) });
      return { jumps: [], current: 0 };
    }
  }

  async jumpOlder(): Promise<boolean> {
    try {
      await this.nvim.input("<C-o>");
      this.log.debug("jumpOlder ok");
      return true;
    } catch (e) {
      this.log.warn("jumpOlder failed", { err: (e as any)?.message ?? String(e) });
      return false;
    }
  }

  async jumpNewer(): Promise<boolean> {
    try {
      await this.nvim.input("<C-i>");
      this.log.debug("jumpNewer ok");
      return true;
    } catch (e) {
      this.log.warn("jumpNewer failed", { err: (e as any)?.message ?? String(e) });
      return false;
    }
  }

  async clearJumpList(): Promise<boolean> {
    try {
      await this.nvim.command("clearjumps");
      this.log.debug("clearJumpList ok");
      return true;
    } catch (e) {
      this.log.warn("clearJumpList failed", { err: (e as any)?.message ?? String(e) });
      return false;
    }
  }

  private async getBufferName(bufnr: number): Promise<string | undefined> {
    try {
      const name = (await this.nvim.nvim.request("nvim_buf_get_name", [bufnr])) as string;
      return name || undefined;
    } catch {
      return undefined;
    }
  }
}
