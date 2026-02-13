import type { NvimHost } from "@src/nvim";
import type { FileLogger } from "@src/logger";

export interface VimMark {
  name: string;
  line: number; // 0-indexed
  col: number;  // 0-indexed
  file?: string;
}

export class MarksManager {
  constructor(
    private nvim: NvimHost,
    private log: FileLogger
  ) {}

  async getMark(name: string): Promise<VimMark | null> {
    try {
      const pos = (await this.nvim.nvim.request("nvim_call_function", [
        "getpos",
        [`'${name}`]
      ])) as any[];

      if (!pos || pos.length < 4) return null;

      const [bufnr, line, col] = pos;
      if (line === 0 && col === 0) return null;

      return {
        name,
        line: Math.max(0, (line ?? 1) - 1),
        col: Math.max(0, (col ?? 1) - 1),
        file: bufnr > 0 ? await this.getBufferName(bufnr) : undefined
      };
    } catch (e) {
      this.log.warn("getMark failed", { name, err: (e as any)?.message ?? String(e) });
      return null;
    }
  }

  async setMark(name: string, line: number, col: number): Promise<boolean> {
    try {
      await this.nvim.nvim.request("nvim_call_function", [
        "setpos",
        [`'${name}`, [0, line + 1, col + 1, 0]]
      ]);

      this.log.debug("setMark ok", { name, line, col });
      return true;
    } catch (e) {
      this.log.warn("setMark failed", { name, err: (e as any)?.message ?? String(e) });
      return false;
    }
  }

  async jumpToMark(name: string): Promise<boolean> {
    try {
      await this.nvim.command(`normal! \`${name}`);
      this.log.debug("jumpToMark ok", { name });
      return true;
    } catch (e) {
      this.log.warn("jumpToMark failed", { name, err: (e as any)?.message ?? String(e) });
      return false;
    }
  }

  async getAllMarks(): Promise<VimMark[]> {
    const marks: VimMark[] = [];

    const localMarks = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
                        "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
    const globalMarks = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
                         "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
    const specialMarks = ["'", "`", "[", "]", "<", ">", "^", ".", "(", ")"];

    const allMarks = [...localMarks, ...globalMarks, ...specialMarks];

    for (const name of allMarks) {
      const mark = await this.getMark(name);
      if (mark) {
        marks.push(mark);
      }
    }

    return marks;
  }

  async deleteMark(name: string): Promise<boolean> {
    try {
      await this.nvim.command(`delmarks ${name}`);
      this.log.debug("deleteMark ok", { name });
      return true;
    } catch (e) {
      this.log.warn("deleteMark failed", { name, err: (e as any)?.message ?? String(e) });
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
