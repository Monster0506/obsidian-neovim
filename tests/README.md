# E2E Test Suite for Obsidian Neovim

This directory contains comprehensive end-to-end tests for the Obsidian Neovim plugin.

## Overview

The test suite validates core functionality including:
- Plugin lifecycle (loading, initialization, commands, events)
- Neovim integration (process management, RPC communication)
- Text synchronization (bidirectional sync, cursor position)
- Key handling (input translation, forwarding, command-line mode)

## Prerequisites

Ensure you have the following installed:
- Node.js (v16 or later)
- npm or yarn

## Setup

Install dependencies:

```bash
npm install
```

This will install all required test dependencies:
- `jest` - Test framework
- `ts-jest` - TypeScript support for Jest
- `@jest/globals` - Jest type definitions
- `@types/jest` - TypeScript types for Jest

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run only e2e tests
```bash
npm run test:e2e
```

## Test Structure

### Test Files

1. **plugin-lifecycle.test.ts** - Plugin initialization and lifecycle
   - App and workspace instance creation
   - Event handling
   - Layout ready callbacks
   - Vault integration

2. **nvim-integration.test.ts** - Neovim process management
   - Process spawning and RPC attachment
   - External connections (socket and TCP)
   - Event handlers (redraw, onLines, cursor)
   - Clean shutdown

3. **text-sync.test.ts** - Bidirectional text synchronization
   - Single and multi-line edits
   - Line insertion and deletion
   - Unicode and emoji handling
   - Rapid consecutive edits
   - Empty document handling

4. **key-handling.test.ts** - Keyboard input handling
   - Special key translation (Escape, Enter, Tab, etc.)
   - Arrow keys and navigation
   - Ctrl combinations
   - Command-line mode triggers (`:`, `/`, `?`)
   - Regular character input

### Mock Implementations

- **tests/__mocks__/obsidian.ts** - Mock implementations of Obsidian API
  - `App`, `Workspace`, `Vault`
  - `Plugin`, `PluginSettingTab`
  - `Notice`, `Setting`
  - `MarkdownView`, `TFile`

- **Neovim mocks** - Inline mocks in test files
  - Mock Neovim client with RPC methods
  - Mock child process for spawned Neovim instances
  - Mock buffer attach/detach operations

## Testing Strategy

### Unit Testing
Tests are designed to run without spawning actual Neovim processes or requiring Obsidian to be running. All external dependencies are mocked to ensure:
- Fast test execution
- Reliable CI/CD integration
- No side effects between test runs

### Mocking Approach
- **Obsidian API**: Full mock implementation in `tests/__mocks__/obsidian.ts`
- **Neovim Client**: Mocked using Jest's `jest.mock()` in individual test files
- **File System**: Tests use temporary paths and don't write to actual filesystem
- **Child Process**: Mocked to avoid spawning real processes

## Writing New Tests

When adding new tests:

1. **Import test utilities**:
```typescript
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
```

2. **Use the mocked Obsidian API**:
```typescript
import { App } from 'obsidian';
```

3. **Create test instances in `beforeEach`**:
```typescript
beforeEach(() => {
  app = new App();
  jest.clearAllMocks();
});
```

4. **Write descriptive test names**:
```typescript
it('should handle unicode content in synchronization', () => {
  // test implementation
});
```

5. **Mock Neovim when needed**:
```typescript
jest.mock('neovim', () => ({
  attach: jest.fn().mockResolvedValue(mockClient),
}));
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Run Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '16'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## Troubleshooting

### Tests failing with module not found
- Run `npm install` to ensure all dependencies are installed
- Check that `jest.config.js` has correct `moduleNameMapper` configuration

### TypeScript errors in tests
- Ensure `@types/jest` and `@jest/globals` are installed
- Check that `tsconfig.json` includes the tests directory

### Mock not working
- Clear Jest cache: `npx jest --clearCache`
- Ensure mocks are defined before imports that use them
- Use `jest.clearAllMocks()` in `beforeEach` blocks

### Coverage not generating
- Run `npm run test:coverage` instead of `npm test`
- Check `jest.config.js` for `collectCoverageFrom` configuration

## Coverage Goals

Target coverage levels:
- Statements: 80%+
- Branches: 75%+
- Functions: 80%+
- Lines: 80%+

Current coverage can be viewed by running `npm run test:coverage` and opening `coverage/lcov-report/index.html`.

## Contributing

When contributing new features:
1. Write tests first (TDD approach recommended)
2. Ensure all existing tests pass
3. Add tests for new functionality
4. Update this README if adding new test categories
5. Run coverage to ensure adequate test coverage

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ts-jest Documentation](https://kulshekhar.github.io/ts-jest/)
- [Obsidian API Documentation](https://github.com/obsidianmd/obsidian-api)
- [Neovim API Documentation](https://neovim.io/doc/user/api.html)
