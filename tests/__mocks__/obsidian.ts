/**
 * Mock implementation of Obsidian API for testing
 * This provides the minimal interface needed to test the plugin
 */

export class Plugin {
  app: any;
  manifest: any;

  constructor() {
    this.manifest = {
      id: 'obsidian-neovim-test',
      name: 'Obsidian Neovim Test',
      version: '0.0.1'
    };
  }

  async loadData(): Promise<any> {
    return {};
  }

  async saveData(data: any): Promise<void> {
    // Mock save
  }

  addRibbonIcon(icon: string, title: string, callback: () => void): void {
    // Mock ribbon icon
  }

  addCommand(command: any): void {
    // Mock command
  }

  addSettingTab(tab: any): void {
    // Mock setting tab
  }

  registerEditorExtension(extension: any): void {
    // Mock editor extension
  }

  registerEvent(event: any): void {
    // Mock event registration
  }

  registerDomEvent(target: any, event: string, callback: any): void {
    // Mock DOM event
  }

  register(cleanup: () => void): void {
    // Mock cleanup registration
  }

  registerInterval(id: any): void {
    // Mock interval registration
  }
}

export class Notice {
  constructor(message: string, timeout?: number) {
    // Mock notice
  }
}

export class PluginSettingTab {
  app: any;
  plugin: any;

  constructor(app: any, plugin: any) {
    this.app = app;
    this.plugin = plugin;
  }

  display(): void {
    // Mock display
  }
}

export class App {
  vault: any;
  workspace: any;

  constructor() {
    this.vault = new Vault();
    this.workspace = new Workspace();
  }
}

export class Vault {
  adapter: any;

  constructor() {
    this.adapter = {
      basePath: '/tmp/test-vault'
    };
  }

  getBasePath(): string {
    return '/tmp/test-vault';
  }
}

export class Workspace {
  private activeFile: any = null;
  private activeEditor: any = null;
  private activeMarkdownView: any = null;
  private eventHandlers: Map<string, Function[]> = new Map();

  onLayoutReady(callback: () => void): void {
    // Execute immediately in tests
    setTimeout(callback, 0);
  }

  on(event: string, callback: Function): any {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
    return { unload: () => {} };
  }

  getActiveFile(): any {
    return this.activeFile;
  }

  setActiveFile(file: any): void {
    this.activeFile = file;
  }

  getActiveViewOfType(type: any): any {
    return this.activeMarkdownView;
  }

  setActiveMarkdownView(view: any): void {
    this.activeMarkdownView = view;
  }

  // Helper to trigger events in tests
  _triggerEvent(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(...args));
    }
  }
}

export class Setting {
  constructor(containerEl: any) {}

  setName(name: string): this {
    return this;
  }

  setDesc(desc: string): this {
    return this;
  }

  addToggle(callback: (toggle: any) => void): this {
    const toggle = {
      setValue: (value: boolean) => toggle,
      onChange: (callback: (value: boolean) => void) => {}
    };
    callback(toggle);
    return this;
  }

  addText(callback: (text: any) => void): this {
    const text = {
      setPlaceholder: (placeholder: string) => text,
      setValue: (value: string) => text,
      onChange: (callback: (value: string) => void) => {}
    };
    callback(text);
    return this;
  }
}

export class MarkdownView {
  private editor: any;

  constructor() {
    this.editor = new MockEditor();
  }

  getViewType(): string {
    return 'markdown';
  }

  getDisplayText(): string {
    return 'Test Document';
  }
}

export class MockEditor {
  private content: string = '';
  private cursor: { line: number; ch: number } = { line: 0, ch: 0 };

  getValue(): string {
    return this.content;
  }

  setValue(value: string): void {
    this.content = value;
  }

  getCursor(): { line: number; ch: number } {
    return { ...this.cursor };
  }

  setCursor(pos: { line: number; ch: number }): void {
    this.cursor = { ...pos };
  }

  getLine(line: number): string {
    const lines = this.content.split('\n');
    return lines[line] || '';
  }

  lineCount(): number {
    return this.content.split('\n').length;
  }

  getSelection(): string {
    return '';
  }

  replaceSelection(replacement: string): void {
    // Mock selection replacement
  }

  replaceRange(replacement: string, from: any, to: any): void {
    // Mock range replacement
  }
}
