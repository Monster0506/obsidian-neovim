# Obsidian Neovim

An experimental Obsidian plugin that runs a real Neovim instance in the background and lets it drive your editing. Motions, operators, modes, registers—the whole Vim brain—while Obsidian renders the text.

## What it does
- Starts Neovim headless with msgpack-RPC
- Attaches a remote UI and listens for redraw signals
- Forwards essentially every keypress to Neovim (with termcodes)
- Syncs Neovim-driven edits back into Obsidian precisely
- Keeps the cursor in perfect lockstep with Neovim

## Advanced Vim Features

This plugin includes comprehensive support for advanced Vim features:

- **Registers**: View and manage all Vim registers, including system clipboard integration
- **Marks**: Navigate using local, global, and special marks with interactive jumping
- **Search Highlights**: Visual highlighting of search pattern matches in the buffer
- **Jump List**: Navigate through cursor movement history
- **Macros**: Full support for recording and playing back macros

See [VIM_FEATURES.md](./VIM_FEATURES.md) for detailed documentation on using these features.
