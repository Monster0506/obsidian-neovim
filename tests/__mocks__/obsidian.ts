// Mock implementation of Obsidian API for testing

export class App {
  workspace = new Workspace();
  vault = new Vault();
}

export class Workspace {
  private activeLeaf: any = null;
  private activeFile: any = null;
  private layoutReadyCallbacks: Array<() => void> = [];
  private eventHandlers: Map<string, Array<(arg?: any) => void>> = new Map();

  onLayoutReady(callback: () => void) {
    this.layoutReadyCallbacks.push(callback);
    // Simulate immediate layout ready for tests
    setTimeout(callback, 0);
  }

  on(event: string, callback: (arg?: any) => void) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
    return { unload: jest.fn() };
  }

  getActiveFile() {
    return this.activeFile;
  }

  setActiveFile(file: any) {
    this.activeFile = file;
  }

  getActiveViewOfType(type: any) {
    return this.activeLeaf;
  }

  setActiveLeaf(leaf: any) {
    this.activeLeaf = leaf;
  }

  triggerEvent(event: string, arg?: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(arg));
    }
  }
}

export class Vault {
  adapter = {
    basePath: '/tmp/test-vault',
  };

  getBasePath() {
    return this.adapter.basePath;
  }
}

export class Plugin {
  app: App;
  manifest: any = {
    id: 'obsidian-neovim',
    name: 'Obsidian Neovim',
    version: '0.0.1',
  };

  constructor(app: App, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }

  async loadData() {
    return {};
  }

  async saveData(data: any) {
    // Mock save
  }

  addRibbonIcon(icon: string, title: string, callback: () => void) {
    return { remove: jest.fn() };
  }

  addCommand(command: { id: string; name: string; callback: () => void }) {
    // Mock command registration
  }

  registerEvent(event: any) {
    // Mock event registration
  }

  registerEditorExtension(extension: any) {
    // Mock editor extension registration
  }

  addSettingTab(tab: any) {
    // Mock setting tab
  }

  register(callback: () => void) {
    // Mock cleanup registration
  }

  registerInterval(interval: number) {
    // Mock interval registration
  }

  async onload() {}
  async onunload() {}
}

export class PluginSettingTab {
  app: App;
  plugin: Plugin;
  containerEl: HTMLElement;

  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement('div');
  }

  display() {}
}

export class Setting {
  constructor(containerEl: HTMLElement) {}
  setName(name: string) { return this; }
  setDesc(desc: string) { return this; }
  addToggle(callback: (toggle: any) => void) {
    callback({
      setValue: jest.fn().mockReturnThis(),
      onChange: jest.fn(),
    });
    return this;
  }
  addText(callback: (text: any) => void) {
    callback({
      setPlaceholder: jest.fn().mockReturnThis(),
      setValue: jest.fn().mockReturnThis(),
      onChange: jest.fn(),
    });
    return this;
  }
}

export class Notice {
  constructor(message: string) {
    // Mock notice
  }
}

export class MarkdownView {
  editor: any;

  getViewType() {
    return 'markdown';
  }
}

export class TFile {
  path: string;
  basename: string;
  extension: string;

  constructor(path: string) {
    this.path = path;
    this.basename = path.split('/').pop() || '';
    this.extension = this.basename.split('.').pop() || '';
  }
}
