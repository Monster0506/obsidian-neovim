import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ErrorRecoveryManager, DEFAULT_RECOVERY_CONFIG } from '../src/error-recovery';

describe('Error Recovery', () => {
  let recovery: ErrorRecoveryManager;

  beforeEach(() => {
    recovery = new ErrorRecoveryManager(DEFAULT_RECOVERY_CONFIG);
    jest.clearAllMocks();
  });

  it('should create recovery manager', () => {
    expect(recovery).toBeDefined();
  });

  it('should recover on first successful attempt', async () => {
    const callback = jest.fn().mockResolvedValue(undefined);

    const result = await recovery.attemptRecovery(callback, 'test');

    expect(result).toBe(true);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    let attemptCount = 0;
    const callback = jest.fn().mockImplementation(async () => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new Error('Connection failed');
      }
    });

    const result = await recovery.attemptRecovery(callback, 'test');

    expect(result).toBe(true);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('should fail after max retries', async () => {
    const callback = jest.fn().mockRejectedValue(new Error('Always fails'));
    const config = { ...DEFAULT_RECOVERY_CONFIG, maxRetries: 3 };
    recovery = new ErrorRecoveryManager(config);

    const result = await recovery.attemptRecovery(callback, 'test');

    expect(result).toBe(false);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('should reset retry counter', async () => {
    let attemptCount = 0;
    const callback = jest.fn().mockImplementation(async () => {
      attemptCount++;
      if (attemptCount === 1) {
        throw new Error('First attempt fails');
      }
    });

    await recovery.attemptRecovery(callback, 'test');
    recovery.reset();

    const status = recovery.getStatus();
    expect(status.retryCount).toBe(0);
    expect(status.isRecovering).toBe(false);
  });

  it('should report recovery status', async () => {
    const callback = jest.fn().mockRejectedValue(new Error('Fails'));
    const config = { ...DEFAULT_RECOVERY_CONFIG, maxRetries: 5, retryDelayMs: 1 };
    recovery = new ErrorRecoveryManager(config);

    // Start recovery in background (don't await)
    const promise = recovery.attemptRecovery(callback, 'test');

    // Check status immediately
    const status = recovery.getStatus();
    expect(status.isRecovering).toBe(true);

    await promise;
  });

  it('should cancel ongoing recovery', async () => {
    const callback = jest.fn().mockRejectedValue(new Error('Fails'));
    const config = { ...DEFAULT_RECOVERY_CONFIG, maxRetries: 10, retryDelayMs: 100 };
    recovery = new ErrorRecoveryManager(config);

    // Start recovery
    const promise = recovery.attemptRecovery(callback, 'test');

    // Cancel immediately
    recovery.cancel();

    // Wait for completion
    await promise;

    const status = recovery.getStatus();
    expect(status.isRecovering).toBe(false);
  });

  it('should not start recovery if already recovering', async () => {
    const callback1 = jest.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    const callback2 = jest.fn().mockResolvedValue(undefined);

    const config = { ...DEFAULT_RECOVERY_CONFIG, retryDelayMs: 50 };
    recovery = new ErrorRecoveryManager(config);

    // Start first recovery
    const promise1 = recovery.attemptRecovery(callback1, 'test1');

    // Try to start second recovery while first is running
    const result2 = await recovery.attemptRecovery(callback2, 'test2');

    expect(result2).toBe(false);
    expect(callback2).not.toHaveBeenCalled();

    await promise1;
  });
});
