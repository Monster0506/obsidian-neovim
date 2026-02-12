# Testing Guide for Obsidian Neovim

This directory contains end-to-end (e2e) tests for the Obsidian Neovim plugin. The tests verify core functionality including plugin lifecycle, Neovim integration, text synchronization, and key handling.

## Overview

The test suite uses Jest with TypeScript support (ts-jest) and includes mock implementations of the Obsidian API to enable testing without a full Obsidian environment.

## Test Structure

```
tests/
├── __mocks__/
│   └── obsidian.ts          # Mock Obsidian API implementation
├── e2e/
│   ├── plugin-lifecycle.test.ts   # Plugin loading and lifecycle tests
│   ├── nvim-integration.test.ts   # Neovim process and RPC tests
│   ├── text-sync.test.ts          # Text synchronization tests
│   └── key-handling.test.ts       # Keyboard input handling tests
├── setup.ts                 # Jest test setup
└── README.md               # This file
```

## Prerequisites

Install the test dependencies:

```bash
npm install
```

This will install:
- `jest` - Testing framework
- `ts-jest` - TypeScript support for Jest
- `@types/jest` - TypeScript type definitions
- `@jest/globals` - Jest globals for TypeScript

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

### Run only e2e tests
```bash
npm run test:e2e
```

### Run a specific test file
```bash
npm test -- tests/e2e/plugin-lifecycle.test.ts
```

### Run tests matching a pattern
```bash
npm test -- --testNamePattern="should sync"
```

## Test Suites

### 1. Plugin Lifecycle Tests (`plugin-lifecycle.test.ts`)

Tests the basic plugin initialization, settings, and command registration.

**Coverage:**
- Plugin instantiation
- Settings initialization and persistence
- Command registration (restart, toggle, etc.)
- Event handler registration
- Workspace event handling

### 2. Neovim Integration Tests (`nvim-integration.test.ts`)

Tests the Neovim process management and RPC communication layer.

**Coverage:**
- Neovim process spawning
- RPC client attachment
- Mode detection (`nvim_get_mode`)
- Cursor position queries
- Buffer creation and management
- Buffer attach/detach for change events
- External Neovim connections (socket and TCP)
- Redraw event handling
- Clean shutdown

### 3. Text Synchronization Tests (`text-sync.test.ts`)

Tests bidirectional text synchronization between Obsidian and Neovim.

**Coverage:**
- Initial document sync to Neovim
- Neovim to Obsidian change propagation
- Single and multi-line edits
- Line insertion and deletion
- Cursor position synchronization
- Unicode and emoji handling
- Edge cases (empty documents, large files, etc.)
- Sync queue management

### 4. Key Handling Tests (`key-handling.test.ts`)

Tests keyboard input capture, translation, and forwarding to Neovim.

**Coverage:**
- Special key translation (Escape, Enter, Tab, etc.)
- Arrow key handling
- Ctrl key combinations
- Regular character input
- Command-line mode activation (`:`, `/`, `?`)
- Event prevention and propagation
- Input throttling
- Obsidian passthrough (e.g., Ctrl+P)

## Mocking Strategy

### Obsidian API Mocks

The `tests/__mocks__/obsidian.ts` file provides mock implementations of Obsidian's API:

- `Plugin` - Base plugin class with lifecycle hooks
- `App` - Application instance with vault and workspace
- `Workspace` - Workspace event management
- `MockEditor` - Editor instance with content and cursor management
- `Notice` - User notifications
- `Setting` - Settings UI components

### Neovim Mocks

Neovim integration is mocked using Jest's module mocking:

```typescript
jest.mock('neovim', () => ({
  attach: jest.fn().mockResolvedValue(mockClient)
}));
```

This prevents actual Neovim processes from being spawned during tests while still allowing verification of the RPC communication logic.

## Writing New Tests

To add new tests:

1. Create a new file in `tests/e2e/` with the `.test.ts` extension
2. Import necessary testing utilities:
   ```typescript
   import { describe, test, expect, beforeEach } from '@jest/globals';
   ```
3. Import mocks as needed:
   ```typescript
   import { App, MockEditor } from '../__mocks__/obsidian';
   ```
4. Write your test cases using the standard Jest API

Example:

```typescript
describe('My Feature', () => {
  test('should do something', () => {
    expect(true).toBe(true);
  });
});
```

## Coverage Reports

After running `npm run test:coverage`, coverage reports are generated in:

- `coverage/lcov-report/index.html` - HTML coverage report
- `coverage/lcov.info` - LCOV format for CI tools
- Console output with summary

Coverage is collected from all TypeScript files in the `src/` directory.

## Continuous Integration

These tests can be integrated into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test

- name: Generate coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Troubleshooting

### Tests timeout

If tests are timing out, you can increase the timeout in `tests/setup.ts`:

```typescript
jest.setTimeout(60000); // 60 seconds
```

### Mock not working

Ensure mocks are defined before imports:

```typescript
jest.mock('module-name', () => ({
  // mock implementation
}));

import { Component } from 'module-name'; // Import after mock
```

### Path resolution issues

If you encounter module resolution errors, check:
1. `tsconfig.json` has correct path mappings
2. `jest.config.js` has matching `moduleNameMapper`
3. Imports use the correct path alias (e.g., `@src/module`)

## Future Improvements

Potential enhancements to the test suite:

- Integration tests with real Neovim instances (in CI)
- Performance benchmarks for sync operations
- Visual regression tests for UI components
- Property-based testing for sync edge cases
- End-to-end tests in a real Obsidian environment using the Obsidian CLI

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ts-jest Documentation](https://kulshekhar.github.io/ts-jest/)
- [Obsidian Plugin Developer Docs](https://docs.obsidian.md/Home)
- [Neovim RPC API](https://neovim.io/doc/user/api.html)
