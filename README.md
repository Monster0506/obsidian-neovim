# Obsidian Neovim

An experimental Obsidian plugin that runs a real Neovim instance in the background and lets it drive your editing. Motions, operators, modes, registers—the whole Vim brain—while Obsidian renders the text. Think “VSCode Neovim,” but for Obsidian.

## What it does
- Starts Neovim headless with msgpack-RPC
- Attaches a remote UI and listens for redraw signals
- Forwards essentially every keypress to Neovim (with termcodes)
- Syncs Neovim-driven edits back into Obsidian precisely
- Keeps the cursor in perfect lockstep with Neovim

## Why you might like it
- It’s actual Neovim. Your muscle memory works. Motions feel right. Undo feels right.
- You can keep using Obsidian for everything else—vaults, links, plugins—while getting real Vim where it matters: editing.

## Quick start
- Requirements: Obsidian Desktop + Neovim installed and on your PATH
- Install:
  - Place this project in your vault at .obsidian/plugins/obsidian-neovim
  - npm install
  - npm run dev (or npm run build)
  - Enable the plugin in Obsidian
- Open a note, press h j k l, i, and Esc. Neovim takes it from there.

## How it works
- A headless Neovim process is launched with --embed
- The plugin attaches via msgpack-RPC and subscribes to UI events
- Buffers are attached for precise change events
- Obsidian’s editor is updated with minimal diffs as Neovim edits
- Cursor updates come from Neovim directly, so what you see is what it thinks

### Logging
- Logs are written to your vault at obsidian-neovim-logs/log-YYYYMMDD.txt
- If something feels off, check there first

## A gentle nudge for your friend
This plugin will absolutely not start an editor war in your group chat. It will, however, make your friend who "never really got into Vim" ask, "Wait, how did you do that?" and then slowly begin mapping hjkl in their head. It’s fine. We’ve all been there. Welcome aboard.

Notes
- Desktop only (it launches a local Neovim process)
- Starts Neovim with a minimal config by default for deterministic behavior
- You can point it at a custom init later if you know what you’re doing

License
MIT
