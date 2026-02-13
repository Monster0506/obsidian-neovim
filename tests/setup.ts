/**
 * Jest setup file for e2e tests
 * This file runs before all tests to set up the testing environment
 */

// Increase timeout for e2e tests that may involve Neovim process startup
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Clean up any running processes after tests
afterAll(async () => {
  // Give time for any async cleanup
  await new Promise(resolve => setTimeout(resolve, 1000));
});
