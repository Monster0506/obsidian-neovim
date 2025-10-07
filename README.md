# Obsidian Neovim

An experimental Obsidian plugin that runs a real Neovim instance in the background and lets it drive your editing. Motions, operators, modes, registers—the whole Vim brain—while Obsidian renders the text.

## What it does
- Starts Neovim headless with msgpack-RPC
- Attaches a remote UI and listens for redraw signals
- Forwards essentially every keypress to Neovim (with termcodes)
- Syncs Neovim-driven edits back into Obsidian precisely
- Keeps the cursor in perfect lockstep with Neovim
