// Mock Obsidian API
export class App {
  workspace: Workspace;
  vault: Vault;

  constructor() {
    this.workspace = new Workspace();
    this.vault = new Vault();
  }
}

export class Workspace {
  private activeFile: any = null;
  private activeLeaf: any = null;
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    return { unload: () => {} };
  }

  trigger(event: string, ...args: any[]) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(...args));
  }

  onLayoutReady(callback: Function) {
    setTimeout(callback, 0);
  }

  getActiveFile() {
    return this.activeFile;
  }

  setActiveFile(file: any) {
    this.activeFile = file;
    this.trigger('file-open', file);
  }

  getActiveViewOfType(type: any) {
    return this.activeLeaf;
  }

  setActiveLeaf(leaf: any) {
    this.activeLeaf = leaf;
    this.trigger('active-leaf-change', leaf);
  }
}

export class Vault {
  adapter: any;

  constructor() {
    this.adapter = {
      basePath: '/mock/vault/path'
    };
  }

  getBasePath() {
    return this.adapter.basePath;
  }
}

export class Plugin {
  app: App;
  manifest: any;
  private commands: any[] = [];
  private ribbonIcons: any[] = [];
  private extensions: any[] = [];
  private events: any[] = [];
  private intervals: any[] = [];

  constructor(app: App, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }

  async onload() {}
  async onunload() {}

  addCommand(command: any) {
    this.commands.push(command);
  }

  addRibbonIcon(icon: string, title: string, callback: Function) {
    this.ribbonIcons.push({ icon, title, callback });
    return { remove: () => {} };
  }

  addSettingTab(tab: any) {}

  registerEditorExtension(extension: any) {
    this.extensions.push(extension);
  }

  registerEvent(event: any) {
    this.events.push(event);
  }

  registerDomEvent(element: any, event: string, callback: Function) {
    this.events.push({ element, event, callback });
  }

  registerInterval(interval: any) {
    this.intervals.push(interval);
  }

  register(callback: Function) {
    this.events.push({ cleanup: callback });
  }

  async loadData() {
    return {};
  }

  async saveData(data: any) {}

  getCommands() {
    return this.commands;
  }
}

export class PluginSettingTab {
  app: App;
  plugin: any;
  containerEl: HTMLElement;

  constructor(app: App, plugin: any) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = {} as HTMLElement;
  }

  display() {}
  hide() {}
}

export class Setting {
  private settingEl: any = {};

  constructor(containerEl: any) {}

  setName(name: string) {
    return this;
  }

  setDesc(desc: string) {
    return this;
  }

  addText(callback: (text: any) => void) {
    const textComponent = {
      setPlaceholder: function(placeholder: string) { return this; },
      setValue: function(value: string) { return this; },
      onChange: function(callback: Function) { return this; },
    };
    callback(textComponent);
    return this;
  }

  addToggle(callback: (toggle: any) => void) {
    const toggleComponent = {
      setValue: function(value: boolean) { return this; },
      onChange: function(callback: Function) { return this; },
    };
    callback(toggleComponent);
    return this;
  }

  addDropdown(callback: (dropdown: any) => void) {
    const dropdownComponent = {
      addOption: function(value: string, display: string) { return this; },
      setValue: function(value: string) { return this; },
      onChange: function(callback: Function) { return this; },
    };
    callback(dropdownComponent);
    return this;
  }
}

export class Notice {
  constructor(message: string | DocumentFragment, timeout?: number) {}
}

export class Modal {
  app: App;
  containerEl: any;
  contentEl: any;
  titleEl: any;

  constructor(app: App) {
    this.app = app;
    this.containerEl = { style: {} };
    this.contentEl = {};
    this.titleEl = {};
  }

  open() {}
  close() {}
  onOpen() {}
  onClose() {}
}

export class MarkdownView {
  private editor: Editor;

  constructor() {
    this.editor = new Editor();
  }

  getViewType() {
    return 'markdown';
  }

  getDisplayText() {
    return 'Mock Note';
  }

  get editor() {
    return this._editor;
  }

  private _editor = new Editor();
}

export class Editor {
  private content: string = '';
  private cursor: { line: number; ch: number } = { line: 0, ch: 0 };

  getValue(): string {
    return this.content;
  }

  setValue(content: string) {
    this.content = content;
  }

  getLine(line: number): string {
    const lines = this.content.split('\n');
    return lines[line] || '';
  }

  lineCount(): number {
    return this.content.split('\n').length;
  }

  getCursor(): { line: number; ch: number } {
    return { ...this.cursor };
  }

  setCursor(pos: { line: number; ch: number }) {
    this.cursor = { ...pos };
  }

  replaceRange(replacement: string, from: any, to: any) {
    const lines = this.content.split('\n');
    const beforeFrom = lines.slice(0, from.line).join('\n');
    const fromLine = lines[from.line] || '';
    const toLine = lines[to.line] || '';
    const beforeCh = fromLine.substring(0, from.ch);
    const afterCh = toLine.substring(to.ch);
    const afterTo = lines.slice(to.line + 1).join('\n');

    const parts = [];
    if (beforeFrom) parts.push(beforeFrom);
    parts.push(beforeCh + replacement + afterCh);
    if (afterTo) parts.push(afterTo);

    this.content = parts.join('\n');
  }

  getRange(from: any, to: any): string {
    const lines = this.content.split('\n');
    if (from.line === to.line) {
      return lines[from.line].substring(from.ch, to.ch);
    }
    const result = [];
    for (let i = from.line; i <= to.line; i++) {
      const line = lines[i] || '';
      if (i === from.line) {
        result.push(line.substring(from.ch));
      } else if (i === to.line) {
        result.push(line.substring(0, to.ch));
      } else {
        result.push(line);
      }
    }
    return result.join('\n');
  }
}
