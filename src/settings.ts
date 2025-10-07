export interface NeovimSettings {
  enabled: boolean;
  nvimPath: string; // Path to Neovim binary, or "nvim" on PATH
  initLuaPath: string; // Path to init script; empty = plugin default
  // External attach (non-headless visible Neovim via --listen)
  useExternal: boolean; // if true, attach instead of spawn
  externalSocketPath: string; // e.g., /tmp/nvim-remote-socket
  externalHost: string; // e.g., 127.0.0.1
  externalPort: number; // e.g., 8000
}

export const DEFAULT_SETTINGS: NeovimSettings = {
  enabled: true,
  nvimPath: "nvim",
  initLuaPath: "",
  useExternal: false,
  externalSocketPath: "",
  externalHost: "127.0.0.1",
  externalPort: 8000,
};


