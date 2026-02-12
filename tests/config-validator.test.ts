import { describe, it, expect } from '@jest/globals';
import { ConfigValidator } from '../src/config-validator';
import { NeovimSettings } from '../src/settings';

describe('Configuration Validator', () => {
  const validSettings: NeovimSettings = {
    enabled: true,
    nvimPath: 'nvim',
    initLuaPath: '',
    useExternal: false,
    externalSocketPath: '',
    externalHost: '127.0.0.1',
    externalPort: 8000,
    debugMode: false,
    showMetrics: false,
    autoReconnect: true,
    maxReconnectAttempts: 5,
  };

  it('should validate correct settings', () => {
    const result = ConfigValidator.validate(validSettings);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject empty nvimPath', () => {
    const settings = { ...validSettings, nvimPath: '' };
    const result = ConfigValidator.validate(settings);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Neovim path cannot be empty');
  });

  it('should require connection details when useExternal is true', () => {
    const settings = {
      ...validSettings,
      useExternal: true,
      externalSocketPath: '',
      externalHost: '',
    };
    const result = ConfigValidator.validate(settings);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('External mode requires'))).toBe(true);
  });

  it('should validate TCP port range', () => {
    const invalidSettings = {
      ...validSettings,
      useExternal: true,
      externalHost: '127.0.0.1',
      externalPort: 99999,
    };
    const result = ConfigValidator.validate(invalidSettings);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Invalid port number'))).toBe(true);
  });

  it('should warn about privileged ports', () => {
    const settings = {
      ...validSettings,
      useExternal: true,
      externalHost: '127.0.0.1',
      externalPort: 80,
    };
    const result = ConfigValidator.validate(settings);
    expect(result.warnings.some(w => w.includes('elevated privileges'))).toBe(true);
  });

  it('should warn when both socket and TCP are configured', () => {
    const settings = {
      ...validSettings,
      useExternal: true,
      externalSocketPath: '/tmp/nvim.sock',
      externalHost: '127.0.0.1',
      externalPort: 8000,
    };
    const result = ConfigValidator.validate(settings);
    expect(result.warnings.some(w => w.includes('Both socket and TCP'))).toBe(true);
  });

  it('should validate IPv4 addresses', () => {
    const validIpSettings = {
      ...validSettings,
      useExternal: true,
      externalHost: '192.168.1.1',
      externalPort: 8000,
    };
    const result = ConfigValidator.validate(validIpSettings);
    expect(result.valid).toBe(true);
  });

  it('should validate hostnames', () => {
    const hostnameSettings = {
      ...validSettings,
      useExternal: true,
      externalHost: 'localhost',
      externalPort: 8000,
    };
    const result = ConfigValidator.validate(hostnameSettings);
    expect(result.valid).toBe(true);
  });

  it('should generate error message', () => {
    const settings = { ...validSettings, nvimPath: '' };
    const result = ConfigValidator.validate(settings);
    const message = ConfigValidator.getErrorMessage(result);
    expect(message).toContain('Errors:');
    expect(message).toContain('Neovim path cannot be empty');
  });

  it('should return empty string for valid settings', () => {
    const result = ConfigValidator.validate(validSettings);
    const message = ConfigValidator.getErrorMessage(result);
    expect(message).toBe('');
  });
});
