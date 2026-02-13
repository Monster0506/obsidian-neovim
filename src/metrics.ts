/**
 * Performance metrics tracking for Obsidian Neovim
 * Tracks key input latency, sync performance, and connection health
 */

export interface MetricsSummary {
  keyInputLatency: {
    avg: number;
    min: number;
    max: number;
    count: number;
  };
  syncLatency: {
    avg: number;
    min: number;
    max: number;
    count: number;
  };
  connectionHealth: {
    uptime: number;
    reconnects: number;
    lastReconnect: number | null;
  };
}

export class PerformanceMetrics {
  private keyLatencies: number[] = [];
  private syncLatencies: number[] = [];
  private connectionStartTime: number = Date.now();
  private reconnectCount: number = 0;
  private lastReconnectTime: number | null = null;
  private maxSamples: number = 100; // Keep last 100 samples

  /**
   * Record key input latency (time from keypress to Neovim response)
   */
  recordKeyLatency(latencyMs: number) {
    this.keyLatencies.push(latencyMs);
    if (this.keyLatencies.length > this.maxSamples) {
      this.keyLatencies.shift();
    }
  }

  /**
   * Record text sync latency (time from Neovim change to Obsidian update)
   */
  recordSyncLatency(latencyMs: number) {
    this.syncLatencies.push(latencyMs);
    if (this.syncLatencies.length > this.maxSamples) {
      this.syncLatencies.shift();
    }
  }

  /**
   * Record a reconnection event
   */
  recordReconnect() {
    this.reconnectCount++;
    this.lastReconnectTime = Date.now();
  }

  /**
   * Reset connection uptime (called when connection established)
   */
  resetConnectionTime() {
    this.connectionStartTime = Date.now();
  }

  /**
   * Get current metrics summary
   */
  getSummary(): MetricsSummary {
    return {
      keyInputLatency: this.calculateStats(this.keyLatencies),
      syncLatency: this.calculateStats(this.syncLatencies),
      connectionHealth: {
        uptime: Date.now() - this.connectionStartTime,
        reconnects: this.reconnectCount,
        lastReconnect: this.lastReconnectTime,
      },
    };
  }

  /**
   * Get human-readable metrics report
   */
  getReport(): string {
    const summary = this.getSummary();
    const uptimeHours = (summary.connectionHealth.uptime / 3600000).toFixed(2);

    const lines = [
      'Obsidian Neovim Performance Metrics',
      '====================================',
      '',
      'Key Input Latency:',
      `  Average: ${summary.keyInputLatency.avg.toFixed(2)}ms`,
      `  Min: ${summary.keyInputLatency.min.toFixed(2)}ms`,
      `  Max: ${summary.keyInputLatency.max.toFixed(2)}ms`,
      `  Samples: ${summary.keyInputLatency.count}`,
      '',
      'Sync Latency:',
      `  Average: ${summary.syncLatency.avg.toFixed(2)}ms`,
      `  Min: ${summary.syncLatency.min.toFixed(2)}ms`,
      `  Max: ${summary.syncLatency.max.toFixed(2)}ms`,
      `  Samples: ${summary.syncLatency.count}`,
      '',
      'Connection Health:',
      `  Uptime: ${uptimeHours} hours`,
      `  Reconnects: ${summary.connectionHealth.reconnects}`,
      `  Last Reconnect: ${summary.connectionHealth.lastReconnect
        ? new Date(summary.connectionHealth.lastReconnect).toLocaleString()
        : 'Never'}`,
    ];

    return lines.join('\n');
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.keyLatencies = [];
    this.syncLatencies = [];
    this.reconnectCount = 0;
    this.lastReconnectTime = null;
    this.resetConnectionTime();
  }

  private calculateStats(samples: number[]): { avg: number; min: number; max: number; count: number } {
    if (samples.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }

    const sum = samples.reduce((a, b) => a + b, 0);
    return {
      avg: sum / samples.length,
      min: Math.min(...samples),
      max: Math.max(...samples),
      count: samples.length,
    };
  }
}
