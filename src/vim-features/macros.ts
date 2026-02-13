import type { NvimHost } from "@src/nvim";
import type { FileLogger } from "@src/logger";

export class MacroManager {
  private isRecording: boolean = false;
  private currentRegister: string = "";

  constructor(
    private nvim: NvimHost,
    private log: FileLogger
  ) {}

  async isRecordingMacro(): Promise<boolean> {
    try {
      const reg = (await this.nvim.nvim.request("nvim_call_function", [
        "reg_recording",
        []
      ])) as string;

      this.isRecording = reg !== "";
      this.currentRegister = reg || "";

      return this.isRecording;
    } catch (e) {
      this.log.warn("isRecordingMacro failed", { err: (e as any)?.message ?? String(e) });
      return false;
    }
  }

  getRecordingRegister(): string {
    return this.currentRegister;
  }

  async startRecording(register: string): Promise<boolean> {
    try {
      await this.nvim.input(`q${register}`);
      this.isRecording = true;
      this.currentRegister = register;
      this.log.debug("startRecording ok", { register });
      return true;
    } catch (e) {
      this.log.warn("startRecording failed", { register, err: (e as any)?.message ?? String(e) });
      return false;
    }
  }

  async stopRecording(): Promise<boolean> {
    try {
      await this.nvim.input("q");
      this.isRecording = false;
      const reg = this.currentRegister;
      this.currentRegister = "";
      this.log.debug("stopRecording ok", { register: reg });
      return true;
    } catch (e) {
      this.log.warn("stopRecording failed", { err: (e as any)?.message ?? String(e) });
      return false;
    }
  }

  async playMacro(register: string, count: number = 1): Promise<boolean> {
    try {
      const countStr = count > 1 ? String(count) : "";
      await this.nvim.input(`${countStr}@${register}`);
      this.log.debug("playMacro ok", { register, count });
      return true;
    } catch (e) {
      this.log.warn("playMacro failed", { register, err: (e as any)?.message ?? String(e) });
      return false;
    }
  }

  async repeatLastMacro(): Promise<boolean> {
    try {
      await this.nvim.input("@@");
      this.log.debug("repeatLastMacro ok");
      return true;
    } catch (e) {
      this.log.warn("repeatLastMacro failed", { err: (e as any)?.message ?? String(e) });
      return false;
    }
  }

  async getMacroContent(register: string): Promise<string | null> {
    try {
      const content = (await this.nvim.nvim.request("nvim_call_function", [
        "getreg",
        [register]
      ])) as string;

      return content || null;
    } catch (e) {
      this.log.warn("getMacroContent failed", { register, err: (e as any)?.message ?? String(e) });
      return null;
    }
  }

  async setMacroContent(register: string, content: string): Promise<boolean> {
    try {
      await this.nvim.nvim.request("nvim_call_function", [
        "setreg",
        [register, content]
      ]);

      this.log.debug("setMacroContent ok", { register, len: content.length });
      return true;
    } catch (e) {
      this.log.warn("setMacroContent failed", { register, err: (e as any)?.message ?? String(e) });
      return false;
    }
  }
}
