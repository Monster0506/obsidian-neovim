import { App, Modal } from "obsidian";

export class CommandLineModal extends Modal {
  private promptEl!: HTMLElement;
  private inputEl!: HTMLElement;
  private wildEl!: HTMLElement;
  private lastContent = "";
  private lastPrompt = ":";
  private lastPos = 0;

  constructor(app: App) {
    super(app);
    this.modalEl.addClass("nvim-cmdline-modal");
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    const row = contentEl.createDiv({ cls: "nvim-cmdline-row" });
    this.promptEl = row.createDiv({ cls: "nvim-cmdline-prompt" });
    this.inputEl = row.createDiv({ cls: "nvim-cmdline-input" });
    this.wildEl = contentEl.createDiv({ cls: "nvim-cmdline-wildmenu" });
    this.render();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  update(prompt: string, content: string, pos: number) {
    this.lastPrompt = prompt ?? ":";
    this.lastContent = content ?? "";
    this.lastPos = Math.max(0, Math.min(pos ?? 0, this.lastContent.length));
    if (!this.isOpen) this.open();
    this.render();
  }

  hideCmdline() {
    if (this.isOpen) this.close();
  }

  updateWildmenu(items: string[], selected: number) {
    this.wildEl.empty();
    if (!items || !items.length) return;
    items.forEach((it, idx) => {
      const el = this.wildEl.createDiv({ cls: "nvim-cmdline-wilditem" });
      el.textContent = it;
      if (idx === selected) el.addClass("is-selected");
    });
  }

  // Optimistic local echo while modal is open: update text first, then send to Neovim
  previewInsert(chars: string) {
    if (!chars) return;
    this.lastContent =
      this.lastContent.slice(0, this.lastPos) + chars + this.lastContent.slice(this.lastPos);
    this.lastPos += chars.length;
    this.render();
  }

  previewBackspace() {
    if (this.lastPos <= 0) return;
    this.lastContent =
      this.lastContent.slice(0, this.lastPos - 1) + this.lastContent.slice(this.lastPos);
    this.lastPos -= 1;
    this.render();
  }

  private render() {
    if (!this.promptEl || !this.inputEl) return;
    this.promptEl.textContent = this.lastPrompt;
    const before = this.lastContent.slice(0, this.lastPos);
    const after = this.lastContent.slice(this.lastPos);
    this.inputEl.innerHTML = `${escapeHtml(before)}<span class="nvim-cmdline-cursor">&nbsp;</span>${escapeHtml(after)}`;
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


