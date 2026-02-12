# Vim Features

This document describes the advanced Vim features available in the Obsidian Neovim plugin.

## Registers

The plugin provides full access to Vim registers, allowing you to view and manipulate yank, delete, and named registers.

### Features

- **View all registers**: See content of all non-empty registers
- **System clipboard integration**: Automatic synchronization with `+` and `*` registers
- **Register types**: Support for characterwise, linewise, and blockwise registers

### Commands

- **Show registers**: Opens a modal displaying all registers with their content and type

### Programmatic Access

```typescript
// Get a specific register
const reg = await plugin.registers.getRegister('"');

// Set register content
await plugin.registers.setRegister('a', ['line 1', 'line 2'], 'l');

// Yank to system clipboard
await plugin.registers.yankToSystemClipboard('text to copy');

// Get all registers
const allRegs = await plugin.registers.getAllRegisters();
```

## Marks

Navigate through your documents using Vim marks. The plugin supports local marks (a-z), global marks (A-Z), and special marks.

### Features

- **Local marks**: Per-buffer marks (a-z)
- **Global marks**: Cross-buffer marks (A-Z)
- **Special marks**: Jump to previous positions (`'`, `` ` ``, `[`, `]`, etc.)
- **Interactive jumping**: Click on marks in the modal to jump

### Commands

- **Show marks**: Opens a modal with all set marks, click to jump

### Programmatic Access

```typescript
// Get a specific mark
const mark = await plugin.marks.getMark('a');

// Set a mark at current position
await plugin.marks.setMark('a', line, col);

// Jump to a mark
await plugin.marks.jumpToMark('a');

// Get all marks
const allMarks = await plugin.marks.getAllMarks();

// Delete a mark
await plugin.marks.deleteMark('a');
```

## Search Highlights

Visual highlighting of search pattern matches in the buffer.

### Features

- **Pattern sync**: Automatically uses Neovim's current search pattern
- **Visual highlights**: Yellow highlighting of all matches
- **Pattern detection**: Converts Vim regex patterns to JavaScript regex

### Commands

- **Clear search highlights**: Remove all search highlights and clear the pattern

### Programmatic Access

```typescript
// Get current search pattern
const pattern = await plugin.search.getCurrentSearchPattern();

// Search for a pattern in buffer text
const matches = await plugin.search.searchInBuffer(pattern, bufferText);

// Get all matches for current pattern
const allMatches = await plugin.search.getSearchMatches();

// Clear search
await plugin.search.clearSearch();
```

## Jump List

Navigate through your cursor movement history using Vim's jump list.

### Features

- **Jump history**: View all recorded jumps
- **Current position indicator**: See where you are in the jump list
- **Navigation**: Use Ctrl+O (older) and Ctrl+I (newer) to navigate

### Commands

- **Show jump list**: Opens a modal with your jump history and current position

### Programmatic Access

```typescript
// Get the jump list
const { jumps, current } = await plugin.jumpList.getJumpList();

// Jump to older position (Ctrl+O)
await plugin.jumpList.jumpOlder();

// Jump to newer position (Ctrl+I)
await plugin.jumpList.jumpNewer();

// Clear the jump list
await plugin.jumpList.clearJumpList();
```

## Macros

Record and replay sequences of commands using Vim macros.

### Features

- **Recording detection**: Check if currently recording a macro
- **Register-based**: Store macros in any register (a-z)
- **Playback**: Execute macros with optional count
- **Macro inspection**: View and edit macro content

### Keybindings

- `qa` - Start recording macro into register 'a'
- `q` - Stop recording
- `@a` - Play macro from register 'a'
- `@@` - Repeat last macro
- `3@a` - Play macro 3 times

### Programmatic Access

```typescript
// Check if recording
const isRecording = await plugin.macros.isRecordingMacro();
const register = plugin.macros.getRecordingRegister();

// Start recording into register 'a'
await plugin.macros.startRecording('a');

// Stop recording
await plugin.macros.stopRecording();

// Play macro from register 'a'
await plugin.macros.playMacro('a');

// Play macro 5 times
await plugin.macros.playMacro('a', 5);

// Repeat last macro
await plugin.macros.repeatLastMacro();

// Get macro content
const content = await plugin.macros.getMacroContent('a');

// Set macro content
await plugin.macros.setMacroContent('a', 'ddp');
```

## Integration

All these features integrate seamlessly with Neovim's native functionality:

- Registers sync with Neovim's register system
- Marks are stored in Neovim and persist across sessions
- Search patterns use Neovim's search register (`/`)
- Jump list is Neovim's actual jump list
- Macros are stored in Neovim registers

## Future Enhancements

Potential future additions:

- Visual mode selection rendering
- Undo tree visualization
- Change list navigation
- Tag navigation
- Quickfix list integration
- Location list support
