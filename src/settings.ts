export interface NeovimSettings {
  enabled: boolean;
  nvimPath: string; // Path to Neovim binary, or "nvim" on PATH
  initLuaPath: string; // Path to init script; empty = plugin default
}

export const DEFAULT_SETTINGS: NeovimSettings = {
  enabled: true,
  nvimPath: "nvim",
  initLuaPath: "",
};


