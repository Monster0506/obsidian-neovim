import { describe, test, expect } from '@jest/globals';
import { DEFAULT_SETTINGS } from '../src/settings';

describe('Settings', () => {
  test('should have default settings defined', () => {
    expect(DEFAULT_SETTINGS).toBeDefined();
  });

  test('should have enabled setting', () => {
    expect(DEFAULT_SETTINGS).toHaveProperty('enabled');
    expect(typeof DEFAULT_SETTINGS.enabled).toBe('boolean');
  });

  test('should have nvimPath setting', () => {
    expect(DEFAULT_SETTINGS).toHaveProperty('nvimPath');
    expect(typeof DEFAULT_SETTINGS.nvimPath).toBe('string');
  });

  test('should have initLuaPath setting', () => {
    expect(DEFAULT_SETTINGS).toHaveProperty('initLuaPath');
    expect(typeof DEFAULT_SETTINGS.initLuaPath).toBe('string');
  });

  test('should have useExternal setting', () => {
    expect(DEFAULT_SETTINGS).toHaveProperty('useExternal');
    expect(typeof DEFAULT_SETTINGS.useExternal).toBe('boolean');
  });

  test('should have external connection settings', () => {
    expect(DEFAULT_SETTINGS).toHaveProperty('externalSocketPath');
    expect(DEFAULT_SETTINGS).toHaveProperty('externalHost');
    expect(DEFAULT_SETTINGS).toHaveProperty('externalPort');
  });

  test('should have reasonable default values', () => {
    expect(DEFAULT_SETTINGS.enabled).toBe(true);
    expect(DEFAULT_SETTINGS.nvimPath).toBe('nvim');
    expect(DEFAULT_SETTINGS.initLuaPath).toBe('');
    expect(DEFAULT_SETTINGS.useExternal).toBe(false);
  });

  test('should allow settings override', () => {
    const customSettings = {
      ...DEFAULT_SETTINGS,
      enabled: false,
      nvimPath: '/custom/nvim'
    };

    expect(customSettings.enabled).toBe(false);
    expect(customSettings.nvimPath).toBe('/custom/nvim');
    expect(customSettings.initLuaPath).toBe(DEFAULT_SETTINGS.initLuaPath);
  });

  test('should validate external connection settings', () => {
    const externalSettings = {
      ...DEFAULT_SETTINGS,
      useExternal: true,
      externalSocketPath: '/tmp/nvim.sock'
    };

    expect(externalSettings.useExternal).toBe(true);
    expect(externalSettings.externalSocketPath).toBe('/tmp/nvim.sock');
  });

  test('should validate TCP connection settings', () => {
    const tcpSettings = {
      ...DEFAULT_SETTINGS,
      useExternal: true,
      externalHost: '127.0.0.1',
      externalPort: 8000
    };

    expect(tcpSettings.externalHost).toBe('127.0.0.1');
    expect(tcpSettings.externalPort).toBe(8000);
  });

  test('should support custom init.lua path', () => {
    const customInit = {
      ...DEFAULT_SETTINGS,
      initLuaPath: '/custom/path/to/init.lua'
    };

    expect(customInit.initLuaPath).toBe('/custom/path/to/init.lua');
  });
});
