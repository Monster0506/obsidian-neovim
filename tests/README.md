# E2E Tests for Obsidian Neovim Plugin

This directory contains comprehensive end-to-end tests for the Obsidian Neovim plugin.

## Test Coverage

### Core Components

1. **Plugin Lifecycle** (`plugin-lifecycle.test.ts`)
   - Plugin instantiation and initialization
   - Command registration and execution
   - Settings loading and persistence
   - Workspace event handling
   - CodeMirror extension registration
   - Plugin cleanup on unload

2. **Neovim Integration** (`nvim-integration.test.ts`)
   - Neovim process spawning and management
   - RPC communication and API calls
   - Buffer creation and attachment
   - Buffer text operations (get/set)
   - Cursor position handling
   - Mode detection and changes
   - Command-line interface
   - External connection modes (socket, TCP)
   - Event notifications (redraw, on_lines, cursor, mode_change)

3. **Text Synchronization** (`text-sync.test.ts`)
   - Single-line and multi-line edits
   - Line insertion and deletion
   - Text appending at document end
   - Event queueing and batching
   - Empty buffer initialization
   - Unicode and emoji support
   - Large text block handling
   - Full document replacement
   - Rapid successive changes
   - Line ending preservation

4. **Key Handling** (`key-handling.test.ts`)
   - Special key translation (Esc, Enter, Tab, etc.)
   - Arrow key translation
   - Function key support (F1-F12)
   - Ctrl+letter combinations
   - Ctrl+special key combinations
   - Alt/Meta key combinations
   - Printable character passthrough
   - Modifier-only key filtering
   - IME composition handling
   - Special character handling

5. **Editor Bridge** (`editor-bridge.test.ts`)
   - Active editor retrieval
   - Range replacement operations
   - Full text setting
   - Text value retrieval
   - Line access operations
   - Line count operations
   - Multi-line operations
   - Insertion and deletion
   - Unicode content handling
   - Large document handling
   - Boundary condition handling

6. **Settings** (`settings.test.ts`)
   - Default settings validation
   - Settings structure verification
   - Custom settings override
   - External connection configuration
   - Init.lua path customization

7. **Integration Tests** (`integration.test.ts`)
   - End-to-end buffer synchronization
   - Cursor position synchronization
   - Mode change workflows
   - Full editing workflows
   - Command-line mode activation
   - Buffer switching
   - Rapid key input handling
   - Unicode text synchronization
   - Large document synchronization
   - Concurrent buffer operations
   - Bidirectional sync (Editor ↔ Neovim)
   - Cursor boundary clamping
   - Empty document operations
   - Reconnection scenarios

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test File

```bash
npm test -- plugin-lifecycle.test.ts
```

### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="should sync"
```

## Test Structure

### Mock Implementations

- **`__mocks__/obsidian.ts`**: Complete mock of Obsidian API including App, Plugin, Workspace, Vault, Editor, etc.
- **`__mocks__/neovim.ts`**: Mock Neovim client with simulated RPC communication and event emission

### Test Setup

- **`setup.ts`**: Global test environment configuration, console suppression, and global object mocks

### Configuration

- **`jest.config.js`**: Jest configuration with TypeScript support, module mapping, and coverage settings

## Writing New Tests

### Basic Test Structure

```typescript
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup code
  });

  test('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Testing Async Operations

```typescript
test('should handle async operation', async () => {
  const promise = asyncFunction();
  await expect(promise).resolves.toBe('value');
});
```

### Testing Events

```typescript
test('should emit event', async () => {
  let eventFired = false;

  nvim.onLines = (ev) => {
    eventFired = true;
  };

  // Trigger event
  const mockClient = nvim.nvim as any;
  mockClient.simulateBufferChange(1, 0, 1, ['new line']);

  await new Promise(resolve => setTimeout(resolve, 50));

  expect(eventFired).toBe(true);
});
```

## Coverage Goals

- Line coverage: > 80%
- Branch coverage: > 75%
- Function coverage: > 80%
- Statement coverage: > 80%

## CI/CD Integration

These tests are designed to run in CI/CD pipelines without requiring actual Neovim or Obsidian installations. All external dependencies are mocked.

### GitHub Actions Example

```yaml
- name: Run Tests
  run: |
    npm install
    npm test
    npm run test:coverage
```

## Troubleshooting

### Tests Timeout

Increase timeout in `jest.config.js`:
```javascript
testTimeout: 20000  // 20 seconds
```

### Mock Not Working

Ensure mocks are set up before imports:
```typescript
jest.mock('module', () => require('./__mocks__/module'));
```

### Async Test Failures

Add proper waits for async operations:
```typescript
await new Promise(resolve => setTimeout(resolve, 100));
```

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure tests pass locally
3. Maintain or improve coverage
4. Update this README if adding new test suites

## Test Statistics

- **Total Test Suites**: 7
- **Total Test Cases**: 150+
- **Coverage**: Comprehensive coverage of all major components
- **Mock Complexity**: Full Obsidian API and Neovim RPC simulation
