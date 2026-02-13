import { describe, it, expect, beforeEach } from '@jest/globals';
import { PerformanceMetrics } from '../src/metrics';

describe('Performance Metrics', () => {
  let metrics: PerformanceMetrics;

  beforeEach(() => {
    metrics = new PerformanceMetrics();
  });

  it('should create metrics instance', () => {
    expect(metrics).toBeDefined();
  });

  it('should record key latency', () => {
    metrics.recordKeyLatency(10);
    metrics.recordKeyLatency(15);
    metrics.recordKeyLatency(12);

    const summary = metrics.getSummary();
    expect(summary.keyInputLatency.count).toBe(3);
    expect(summary.keyInputLatency.avg).toBeCloseTo(12.33, 1);
    expect(summary.keyInputLatency.min).toBe(10);
    expect(summary.keyInputLatency.max).toBe(15);
  });

  it('should record sync latency', () => {
    metrics.recordSyncLatency(5);
    metrics.recordSyncLatency(8);
    metrics.recordSyncLatency(6);

    const summary = metrics.getSummary();
    expect(summary.syncLatency.count).toBe(3);
    expect(summary.syncLatency.avg).toBeCloseTo(6.33, 1);
    expect(summary.syncLatency.min).toBe(5);
    expect(summary.syncLatency.max).toBe(8);
  });

  it('should track connection health', () => {
    const summary = metrics.getSummary();
    expect(summary.connectionHealth.reconnects).toBe(0);
    expect(summary.connectionHealth.lastReconnect).toBeNull();
    expect(summary.connectionHealth.uptime).toBeGreaterThan(0);
  });

  it('should record reconnection events', () => {
    metrics.recordReconnect();
    metrics.recordReconnect();

    const summary = metrics.getSummary();
    expect(summary.connectionHealth.reconnects).toBe(2);
    expect(summary.connectionHealth.lastReconnect).not.toBeNull();
  });

  it('should reset connection time', () => {
    const before = metrics.getSummary().connectionHealth.uptime;

    // Wait a bit
    const waitTime = 50;
    const start = Date.now();
    while (Date.now() - start < waitTime) {
      // busy wait
    }

    metrics.resetConnectionTime();
    const after = metrics.getSummary().connectionHealth.uptime;

    expect(after).toBeLessThan(before);
  });

  it('should limit sample size', () => {
    // Record more than maxSamples (100)
    for (let i = 0; i < 150; i++) {
      metrics.recordKeyLatency(i);
    }

    const summary = metrics.getSummary();
    expect(summary.keyInputLatency.count).toBe(100);
  });

  it('should generate readable report', () => {
    metrics.recordKeyLatency(10);
    metrics.recordSyncLatency(5);
    metrics.recordReconnect();

    const report = metrics.getReport();
    expect(report).toContain('Performance Metrics');
    expect(report).toContain('Key Input Latency');
    expect(report).toContain('Sync Latency');
    expect(report).toContain('Connection Health');
    expect(report).toContain('Reconnects: 1');
  });

  it('should reset all metrics', () => {
    metrics.recordKeyLatency(10);
    metrics.recordSyncLatency(5);
    metrics.recordReconnect();

    metrics.reset();

    const summary = metrics.getSummary();
    expect(summary.keyInputLatency.count).toBe(0);
    expect(summary.syncLatency.count).toBe(0);
    expect(summary.connectionHealth.reconnects).toBe(0);
    expect(summary.connectionHealth.lastReconnect).toBeNull();
  });

  it('should handle empty metrics gracefully', () => {
    const summary = metrics.getSummary();
    expect(summary.keyInputLatency.avg).toBe(0);
    expect(summary.keyInputLatency.min).toBe(0);
    expect(summary.keyInputLatency.max).toBe(0);
    expect(summary.keyInputLatency.count).toBe(0);
  });
});
