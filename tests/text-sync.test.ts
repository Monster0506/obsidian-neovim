import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { App } from 'obsidian';
import { EditorBridge } from '../src/bridge';
import { SyncApplier } from '../src/sync';

// Mock FileLogger
jest.mock('../src/logger', () => ({
  FileLogger: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(undefined),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    getLogFilePath: jest.fn().mockReturnValue('/tmp/test.log'),
  })),
}));

describe('Text Synchronization', () => {
  let app: App;
  let bridge: EditorBridge;
  let syncApplier: SyncApplier;
  let mockLogger: any;

  beforeEach(() => {
    app = new App();
    const { FileLogger } = require('../src/logger');
    mockLogger = new FileLogger(app);
    bridge = new EditorBridge(app);
    syncApplier = new SyncApplier(bridge, mockLogger);
  });

  it('should create SyncApplier instance', () => {
    expect(syncApplier).toBeDefined();
  });

  it('should create EditorBridge instance', () => {
    expect(bridge).toBeDefined();
  });

  it('should handle single line edit', () => {
    const event = {
      buf: 1,
      changedtick: 1,
      firstline: 0,
      lastline: 1,
      linedata: ['Hello, world!'],
    };

    syncApplier.enqueue(event);
    expect(mockLogger.debug).toHaveBeenCalled();
  });

  it('should handle multi-line edit', () => {
    const event = {
      buf: 1,
      changedtick: 2,
      firstline: 0,
      lastline: 3,
      linedata: ['Line 1', 'Line 2', 'Line 3'],
    };

    syncApplier.enqueue(event);
    expect(mockLogger.debug).toHaveBeenCalled();
  });

  it('should handle line deletion', () => {
    const event = {
      buf: 1,
      changedtick: 3,
      firstline: 1,
      lastline: 2,
      linedata: [],
    };

    syncApplier.enqueue(event);
    expect(mockLogger.debug).toHaveBeenCalled();
  });

  it('should handle line insertion', () => {
    const event = {
      buf: 1,
      changedtick: 4,
      firstline: 2,
      lastline: 2,
      linedata: ['New line'],
    };

    syncApplier.enqueue(event);
    expect(mockLogger.debug).toHaveBeenCalled();
  });

  it('should handle empty document', () => {
    const event = {
      buf: 1,
      changedtick: 5,
      firstline: 0,
      lastline: 1,
      linedata: [''],
    };

    syncApplier.enqueue(event);
    expect(mockLogger.debug).toHaveBeenCalled();
  });

  it('should handle unicode content', () => {
    const event = {
      buf: 1,
      changedtick: 6,
      firstline: 0,
      lastline: 1,
      linedata: ['Hello 世界 🌍'],
    };

    syncApplier.enqueue(event);
    expect(mockLogger.debug).toHaveBeenCalled();
  });

  it('should handle rapid consecutive edits', () => {
    const events = [
      {
        buf: 1,
        changedtick: 7,
        firstline: 0,
        lastline: 1,
        linedata: ['a'],
      },
      {
        buf: 1,
        changedtick: 8,
        firstline: 0,
        lastline: 1,
        linedata: ['ab'],
      },
      {
        buf: 1,
        changedtick: 9,
        firstline: 0,
        lastline: 1,
        linedata: ['abc'],
      },
    ];

    events.forEach(event => syncApplier.enqueue(event));
    expect(mockLogger.debug).toHaveBeenCalledTimes(events.length);
  });
});
