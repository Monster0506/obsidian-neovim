-- Quiet, deterministic embedded startup
vim.opt.shortmess = "filnxtToOFc"
vim.opt.swapfile = false
vim.opt.writebackup = false
vim.opt.backup = false
vim.opt.termguicolors = true
vim.g.loaded_matchparen = 1
vim.g.loaded_netrw = 1
vim.g.loaded_netrwPlugin = 1
vim.g.loaded_rplugin = 1

-- Optional: disable plugins entirely if user wants absolute minimal
-- package.loaded = {} -- not recommended globally; keep minimal

-- Example: notify UI that init done
vim.schedule(function()
  vim.rpcnotify(0, "host.ready", {})
end)
