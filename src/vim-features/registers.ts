import type { NvimHost } from "@src/nvim";
import type { FileLogger } from "@src/logger";

export interface VimRegister {
  name: string;
  content: string[];
  type: "c" | "l" | "b"; // characterwise, linewise, blockwise
}

export class RegistersManager {
  constructor(
    private nvim: NvimHost,
    private log: FileLogger
  ) {}

  async getRegister(name: string): Promise<VimRegister | null> {
    try {
      const content = (await this.nvim.nvim.request("nvim_call_function", [
        "getreg",
        [name, 1, true]
      ])) as string[];

      const regtype = (await this.nvim.nvim.request("nvim_call_function", [
        "getregtype",
        [name]
      ])) as string;

      let type: "c" | "l" | "b" = "c";
      if (regtype === "V") type = "l";
      else if (regtype.startsWith("\x16")) type = "b";

      return {
        name,
        content: Array.isArray(content) ? content : [String(content)],
        type
      };
    } catch (e) {
      this.log.warn("getRegister failed", { name, err: (e as any)?.message ?? String(e) });
      return null;
    }
  }

  async setRegister(name: string, content: string[], type: "c" | "l" | "b" = "c"): Promise<boolean> {
    try {
      let regtype = "c";
      if (type === "l") regtype = "V";
      else if (type === "b") regtype = "\x16";

      await this.nvim.nvim.request("nvim_call_function", [
        "setreg",
        [name, content, regtype]
      ]);

      this.log.debug("setRegister ok", { name, lines: content.length, type });
      return true;
    } catch (e) {
      this.log.warn("setRegister failed", { name, err: (e as any)?.message ?? String(e) });
      return false;
    }
  }

  async getAllRegisters(): Promise<VimRegister[]> {
    const registers: VimRegister[] = [];
    const names = [
      '"', "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
      "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
      "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
      "-", "*", "+", "/"
    ];

    for (const name of names) {
      const reg = await this.getRegister(name);
      if (reg && reg.content.length > 0 && reg.content[0] !== "") {
        registers.push(reg);
      }
    }

    return registers;
  }

  async yankToSystemClipboard(text: string): Promise<boolean> {
    try {
      await this.setRegister("+", [text], "c");
      await this.setRegister("*", [text], "c");

      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }

      this.log.debug("yankToSystemClipboard ok", { len: text.length });
      return true;
    } catch (e) {
      this.log.warn("yankToSystemClipboard failed", { err: (e as any)?.message ?? String(e) });
      return false;
    }
  }

  async pasteFromSystemClipboard(): Promise<string | null> {
    try {
      let text: string | null = null;

      if (typeof navigator !== "undefined" && navigator.clipboard) {
        text = await navigator.clipboard.readText();
      }

      if (text) {
        await this.setRegister("+", [text], "c");
        await this.setRegister("*", [text], "c");
      }

      this.log.debug("pasteFromSystemClipboard ok", { len: text?.length ?? 0 });
      return text;
    } catch (e) {
      this.log.warn("pasteFromSystemClipboard failed", { err: (e as any)?.message ?? String(e) });
      return null;
    }
  }
}
