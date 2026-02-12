/**
 * Configuration validator for Neovim settings
 * Validates settings before they are applied
 */

import { NeovimSettings } from "./settings";
import { existsSync } from "fs";
import { resolve } from "path";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ConfigValidator {
  /**
   * Validate Neovim settings
   */
  static validate(settings: NeovimSettings): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate nvimPath
    if (!settings.nvimPath || settings.nvimPath.trim() === '') {
      errors.push('Neovim path cannot be empty');
    }

    // Validate initLuaPath if provided
    if (settings.initLuaPath && settings.initLuaPath.trim() !== '') {
      try {
        const resolvedPath = resolve(settings.initLuaPath);
        if (!existsSync(resolvedPath)) {
          errors.push(`Init Lua file not found: ${settings.initLuaPath}`);
        }
      } catch (e) {
        errors.push(`Invalid init Lua path: ${settings.initLuaPath}`);
      }
    }

    // Validate external connection settings
    if (settings.useExternal) {
      const hasSocket = settings.externalSocketPath && settings.externalSocketPath.trim() !== '';
      const hasTcp = settings.externalHost && settings.externalHost.trim() !== '' && settings.externalPort > 0;

      if (!hasSocket && !hasTcp) {
        errors.push('External mode requires either socket path or TCP host/port');
      }

      if (hasSocket && hasTcp) {
        warnings.push('Both socket and TCP configured; socket will be used');
      }

      // Validate TCP port range
      if (hasTcp) {
        if (settings.externalPort < 1 || settings.externalPort > 65535) {
          errors.push(`Invalid port number: ${settings.externalPort} (must be 1-65535)`);
        }

        // Warn about common port conflicts
        if (settings.externalPort < 1024) {
          warnings.push(`Port ${settings.externalPort} requires elevated privileges`);
        }
      }

      // Validate TCP host format
      if (settings.externalHost) {
        const host = settings.externalHost.trim();
        if (host && !this.isValidHost(host)) {
          warnings.push(`Host "${host}" may not be valid (expected IP address or hostname)`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if a string is a valid hostname or IP address
   */
  private static isValidHost(host: string): boolean {
    // Check for IPv4
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(host)) {
      const parts = host.split('.');
      return parts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      });
    }

    // Check for IPv6 (basic check)
    if (host.includes(':')) {
      return /^[0-9a-fA-F:]+$/.test(host);
    }

    // Check for hostname (basic check)
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return hostnameRegex.test(host);
  }

  /**
   * Get validation error message for display
   */
  static getErrorMessage(result: ValidationResult): string {
    if (result.valid) {
      return '';
    }

    const parts: string[] = [];

    if (result.errors.length > 0) {
      parts.push('Errors:');
      parts.push(...result.errors.map(e => `  - ${e}`));
    }

    if (result.warnings.length > 0) {
      if (parts.length > 0) parts.push('');
      parts.push('Warnings:');
      parts.push(...result.warnings.map(w => `  - ${w}`));
    }

    return parts.join('\n');
  }
}
