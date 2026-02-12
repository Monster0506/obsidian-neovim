/**
 * Error recovery and automatic reconnection system
 * Handles Neovim crashes and connection failures with automatic retry
 */

import type { FileLogger } from "./logger";

export interface RecoveryConfig {
  maxRetries: number;
  retryDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

export const DEFAULT_RECOVERY_CONFIG: RecoveryConfig = {
  maxRetries: 5,
  retryDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 30000,
};

export type RecoveryCallback = () => Promise<void>;

export class ErrorRecoveryManager {
  private retryCount: number = 0;
  private isRecovering: boolean = false;
  private recoveryTimer: NodeJS.Timeout | null = null;

  constructor(
    private config: RecoveryConfig = DEFAULT_RECOVERY_CONFIG,
    private log?: FileLogger
  ) {}

  /**
   * Attempt to recover from an error by retrying the callback
   * Returns true if recovery was successful, false if max retries exceeded
   */
  async attemptRecovery(
    callback: RecoveryCallback,
    context: string
  ): Promise<boolean> {
    if (this.isRecovering) {
      this.log?.warn('Recovery already in progress', { context });
      return false;
    }

    this.isRecovering = true;
    this.retryCount = 0;

    try {
      return await this.retryWithBackoff(callback, context);
    } finally {
      this.isRecovering = false;
      this.clearRecoveryTimer();
    }
  }

  /**
   * Reset retry counter (call when connection is successful)
   */
  reset() {
    this.retryCount = 0;
    this.isRecovering = false;
    this.clearRecoveryTimer();
  }

  /**
   * Cancel any ongoing recovery attempt
   */
  cancel() {
    this.isRecovering = false;
    this.clearRecoveryTimer();
    this.log?.info('Recovery cancelled');
  }

  /**
   * Get current recovery status
   */
  getStatus(): { isRecovering: boolean; retryCount: number } {
    return {
      isRecovering: this.isRecovering,
      retryCount: this.retryCount,
    };
  }

  private async retryWithBackoff(
    callback: RecoveryCallback,
    context: string
  ): Promise<boolean> {
    while (this.retryCount < this.config.maxRetries) {
      this.retryCount++;

      const delay = this.calculateDelay();
      this.log?.info('Attempting recovery', {
        context,
        attempt: this.retryCount,
        maxRetries: this.config.maxRetries,
        delayMs: delay,
      });

      // Wait before retry (except for first attempt)
      if (this.retryCount > 1) {
        await this.sleep(delay);
      }

      try {
        await callback();
        this.log?.info('Recovery successful', {
          context,
          attempts: this.retryCount,
        });
        return true;
      } catch (error) {
        this.log?.warn('Recovery attempt failed', {
          context,
          attempt: this.retryCount,
          error: (error as any)?.message ?? String(error),
        });

        // If this was the last attempt, log error
        if (this.retryCount >= this.config.maxRetries) {
          this.log?.error('Recovery failed after max retries', {
            context,
            attempts: this.retryCount,
            error: (error as any)?.message ?? String(error),
          });
          return false;
        }
      }
    }

    return false;
  }

  private calculateDelay(): number {
    if (this.retryCount === 1) {
      return this.config.retryDelayMs;
    }

    const delay =
      this.config.retryDelayMs *
      Math.pow(this.config.backoffMultiplier, this.retryCount - 1);

    return Math.min(delay, this.config.maxDelayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.recoveryTimer = setTimeout(resolve, ms);
    });
  }

  private clearRecoveryTimer() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }
}

/**
 * Utility function to wrap a function with error recovery
 */
export function withRecovery<T>(
  fn: () => Promise<T>,
  recovery: ErrorRecoveryManager,
  context: string,
  onSuccess?: () => void
): Promise<T | null> {
  return fn()
    .then((result) => {
      recovery.reset();
      onSuccess?.();
      return result;
    })
    .catch(async (error) => {
      const recovered = await recovery.attemptRecovery(
        async () => {
          await fn();
        },
        context
      );

      if (recovered) {
        onSuccess?.();
        return fn(); // Try one more time after successful recovery
      }

      throw error; // Re-throw if recovery failed
    });
}
