/**
 * Status bar integration for Obsidian Neovim
 * Shows connection status and current mode
 */

export type NvimMode = 'normal' | 'insert' | 'visual' | 'command' | 'replace' | 'operator' | 'unknown';
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface StatusBarState {
  mode: NvimMode;
  connectionStatus: ConnectionStatus;
  errorMessage?: string;
}

export class StatusBarManager {
  private statusBarItem: HTMLElement | null = null;
  private state: StatusBarState = {
    mode: 'normal',
    connectionStatus: 'disconnected',
  };

  constructor(statusBar: HTMLElement) {
    this.statusBarItem = statusBar.createEl('div', {
      cls: 'obsidian-neovim-status',
    });
    this.render();
  }

  /**
   * Update the current Neovim mode
   */
  setMode(mode: NvimMode) {
    this.state.mode = mode;
    this.render();
  }

  /**
   * Update the connection status
   */
  setConnectionStatus(status: ConnectionStatus, errorMessage?: string) {
    this.state.connectionStatus = status;
    this.state.errorMessage = errorMessage;
    this.render();
  }

  /**
   * Get current state
   */
  getState(): StatusBarState {
    return { ...this.state };
  }

  /**
   * Remove status bar item
   */
  destroy() {
    if (this.statusBarItem) {
      this.statusBarItem.remove();
      this.statusBarItem = null;
    }
  }

  private render() {
    if (!this.statusBarItem) return;

    const { mode, connectionStatus, errorMessage } = this.state;

    // Clear existing content
    this.statusBarItem.empty();

    // Connection status indicator
    const statusIcon = this.statusBarItem.createEl('span', {
      cls: `status-icon status-${connectionStatus}`,
    });

    switch (connectionStatus) {
      case 'connected':
        statusIcon.setText('●');
        statusIcon.style.color = '#4ade80'; // green
        break;
      case 'connecting':
        statusIcon.setText('◌');
        statusIcon.style.color = '#fbbf24'; // yellow
        break;
      case 'disconnected':
        statusIcon.setText('○');
        statusIcon.style.color = '#9ca3af'; // gray
        break;
      case 'error':
        statusIcon.setText('✕');
        statusIcon.style.color = '#ef4444'; // red
        break;
    }

    // Mode display
    if (connectionStatus === 'connected') {
      const modeText = this.statusBarItem.createEl('span', {
        cls: `mode-text mode-${mode}`,
      });
      modeText.setText(` ${this.getModeDisplayText(mode)}`);
      modeText.style.marginLeft = '4px';

      // Color code by mode
      switch (mode) {
        case 'normal':
          modeText.style.color = '#60a5fa'; // blue
          break;
        case 'insert':
          modeText.style.color = '#34d399'; // green
          break;
        case 'visual':
          modeText.style.color = '#a78bfa'; // purple
          break;
        case 'command':
          modeText.style.color = '#fbbf24'; // yellow
          break;
        case 'replace':
          modeText.style.color = '#f87171'; // red
          break;
        default:
          modeText.style.color = '#9ca3af'; // gray
      }
    } else if (errorMessage) {
      const errorText = this.statusBarItem.createEl('span', {
        cls: 'error-text',
      });
      errorText.setText(` ${errorMessage}`);
      errorText.style.marginLeft = '4px';
      errorText.style.color = '#ef4444';
    }

    // Tooltip
    this.statusBarItem.setAttribute(
      'aria-label',
      this.getTooltipText()
    );
  }

  private getModeDisplayText(mode: NvimMode): string {
    const modeMap: Record<NvimMode, string> = {
      normal: 'NORMAL',
      insert: 'INSERT',
      visual: 'VISUAL',
      command: 'COMMAND',
      replace: 'REPLACE',
      operator: 'OPERATOR',
      unknown: 'UNKNOWN',
    };
    return modeMap[mode] || 'UNKNOWN';
  }

  private getTooltipText(): string {
    const { mode, connectionStatus, errorMessage } = this.state;

    const parts = ['Neovim'];

    switch (connectionStatus) {
      case 'connected':
        parts.push(`Connected - ${this.getModeDisplayText(mode)} mode`);
        break;
      case 'connecting':
        parts.push('Connecting...');
        break;
      case 'disconnected':
        parts.push('Disconnected');
        break;
      case 'error':
        parts.push(`Error: ${errorMessage || 'Unknown error'}`);
        break;
    }

    return parts.join(' - ');
  }
}
