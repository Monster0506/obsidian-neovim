// Test environment setup
import { jest } from '@jest/globals';

// Set up global test timeout
jest.setTimeout(10000);

// Suppress console logs during tests (comment out to see logs)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock global objects that Obsidian would provide
(global as any).window = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  setInterval: jest.fn((fn, delay) => setTimeout(fn, delay)),
  clearInterval: jest.fn(),
};

(global as any).document = {
  createElement: jest.fn(() => ({
    style: {},
    appendChild: jest.fn(),
    addEventListener: jest.fn(),
  })),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
  },
};

// Mock navigator for clipboard operations
(global as any).navigator = {
  clipboard: {
    writeText: jest.fn(),
  },
};
