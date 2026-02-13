# New Features for Obsidian Neovim

This document describes the new features added to enhance reliability, performance monitoring, and user experience.

## Performance Metrics Tracking

### Overview
The performance metrics system tracks key input latency, text synchronization performance, and connection health to help diagnose issues and optimize the plugin.

### Features
- **Key Input Latency**: Measures time from keypress to Neovim response
- **Sync Latency**: Tracks time from Neovim change to Obsidian update
- **Connection Health**: Monitors uptime, reconnection events, and stability

### Usage

```typescript
import { PerformanceMetrics } from './metrics';

const metrics = new PerformanceMetrics();

// Record metrics
metrics.recordKeyLatency(12.5); // milliseconds
metrics.recordSyncLatency(5.2);
metrics.recordReconnect();

// Get summary
const summary = metrics.getSummary();
console.log(`Avg key latency: ${summary.keyInputLatency.avg}ms`);

// Get human-readable report
const report = metrics.getReport();
console.log(report);
```

### Configuration
- Tracks last 100 samples for each metric type
- Automatically manages sample rotation
- Provides min, max, average, and count statistics

## Error Recovery System

### Overview
Automatic reconnection system that handles Neovim crashes and connection failures with exponential backoff retry logic.

### Features
- **Automatic Retry**: Attempts to reconnect when connection fails
- **Exponential Backoff**: Increases delay between retry attempts
- **Configurable Limits**: Set max retries and delays
- **Status Tracking**: Monitor recovery attempts in real-time

### Configuration

```typescript
import { ErrorRecoveryManager } from './error-recovery';

const recovery = new ErrorRecoveryManager({
  maxRetries: 5,              // Maximum retry attempts
  retryDelayMs: 1000,         // Initial delay (1 second)
  backoffMultiplier: 2,       // Double delay each retry
  maxDelayMs: 30000,          // Cap at 30 seconds
});

// Attempt recovery
const success = await recovery.attemptRecovery(
  async () => await startNeovim(),
  'Neovim connection'
);

if (success) {
  console.log('Reconnection successful');
} else {
  console.log('Failed to reconnect after max retries');
}
```

### User Settings
- `autoReconnect`: Enable/disable automatic reconnection (default: true)
- `maxReconnectAttempts`: Maximum retry attempts (default: 5)

## Configuration Validator

### Overview
Validates Neovim settings before they are applied to prevent configuration errors and provide helpful feedback.

### Features
- **Path Validation**: Checks if init.lua file exists
- **Network Validation**: Validates TCP/IP settings (host, port)
- **Port Range Checking**: Ensures port numbers are valid (1-65535)
- **Privilege Warnings**: Warns about ports requiring elevated permissions
- **Conflict Detection**: Warns when both socket and TCP are configured

### Usage

```typescript
import { ConfigValidator } from './config-validator';

const result = ConfigValidator.validate(settings);

if (!result.valid) {
  const message = ConfigValidator.getErrorMessage(result);
  console.error(message);
  // Show error to user
}

// Handle warnings
if (result.warnings.length > 0) {
  console.warn('Configuration warnings:', result.warnings);
}
```

### Validation Rules

**Errors (prevent settings from being applied):**
- Empty Neovim path
- Invalid init.lua file path
- Invalid port number (< 1 or > 65535)
- External mode without connection details

**Warnings (settings can still be applied):**
- Privileged ports (< 1024)
- Both socket and TCP configured
- Invalid hostname format

## Status Bar Integration

### Overview
Visual status indicator showing Neovim connection status and current mode in the Obsidian status bar.

### Features
- **Connection Status**: Visual indicator (connected, connecting, disconnected, error)
- **Mode Display**: Shows current Neovim mode (NORMAL, INSERT, VISUAL, etc.)
- **Color Coding**: Different colors for different modes and states
- **Tooltips**: Hover for detailed status information

### Status Indicators

**Connection States:**
- 🟢 Connected (green solid circle)
- 🟡 Connecting (yellow open circle)
- ⚪ Disconnected (gray open circle)
- 🔴 Error (red X)

**Modes:**
- **NORMAL** - Blue
- **INSERT** - Green
- **VISUAL** - Purple
- **COMMAND** - Yellow
- **REPLACE** - Red

### Usage

```typescript
import { StatusBarManager } from './ui/status-bar';

const statusBar = this.addStatusBarItem();
const manager = new StatusBarManager(statusBar);

// Update mode
manager.setMode('insert');

// Update connection status
manager.setConnectionStatus('connected');

// Show error
manager.setConnectionStatus('error', 'Connection lost');
```

## Enhanced Settings

### New Settings

**Debug and Performance:**
- `debugMode`: Enable detailed debug logging
  - Default: `false`
  - Enables verbose logging for troubleshooting

- `showMetrics`: Display performance metrics in status bar
  - Default: `false`
  - Shows latency and performance stats when enabled

**Error Recovery:**
- `autoReconnect`: Automatically reconnect on connection loss
  - Default: `true`
  - Attempts to reconnect when Neovim crashes or disconnects

- `maxReconnectAttempts`: Maximum reconnection attempts
  - Default: `5`
  - Number of times to retry before giving up

### Accessing Settings

Settings can be configured in Obsidian's settings panel under "Obsidian Neovim":

1. Open Settings (Ctrl/Cmd + ,)
2. Navigate to Community Plugins → Obsidian Neovim
3. Configure desired options
4. Settings are validated before being saved

## Integration Examples

### Complete Integration Example

```typescript
import { PerformanceMetrics } from './metrics';
import { ErrorRecoveryManager } from './error-recovery';
import { StatusBarManager } from './ui/status-bar';
import { ConfigValidator } from './config-validator';

class NeovimPlugin extends Plugin {
  private metrics: PerformanceMetrics;
  private recovery: ErrorRecoveryManager;
  private statusBar: StatusBarManager;

  async onload() {
    // Initialize components
    this.metrics = new PerformanceMetrics();
    this.recovery = new ErrorRecoveryManager();
    this.statusBar = new StatusBarManager(this.addStatusBarItem());

    // Validate settings before use
    const validation = ConfigValidator.validate(this.settings);
    if (!validation.valid) {
      new Notice(ConfigValidator.getErrorMessage(validation));
      return;
    }

    // Start Neovim with error recovery
    await this.startWithRecovery();

    // Monitor performance
    this.registerKeyHandler((latency) => {
      this.metrics.recordKeyLatency(latency);
    });

    // Update status bar
    this.updateStatusBar();
  }

  private async startWithRecovery() {
    this.statusBar.setConnectionStatus('connecting');

    const success = await this.recovery.attemptRecovery(
      async () => await this.startNvim(),
      'Neovim startup'
    );

    if (success) {
      this.statusBar.setConnectionStatus('connected');
      this.metrics.resetConnectionTime();
    } else {
      this.statusBar.setConnectionStatus('error', 'Failed to connect');
    }
  }

  onunload() {
    this.statusBar.destroy();
  }
}
```

### Command: Show Metrics Report

```typescript
this.addCommand({
  id: 'obsidian-neovim-show-metrics',
  name: 'Show Performance Metrics',
  callback: () => {
    const report = this.metrics.getReport();
    new Notice(report);
    console.log(report);
  }
});
```

## Benefits

### For Users
- **Better Reliability**: Automatic reconnection reduces manual intervention
- **Performance Visibility**: See how the plugin is performing
- **Clear Status**: Always know connection state and current mode
- **Fewer Errors**: Configuration validation prevents common mistakes

### For Developers
- **Debugging**: Detailed metrics help identify performance bottlenecks
- **Testing**: Comprehensive test suite ensures reliability
- **Monitoring**: Track plugin health and connection stability
- **Error Handling**: Robust recovery system handles edge cases

## Testing

All new features include comprehensive test coverage:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- metrics.test.ts
npm test -- config-validator.test.ts
npm test -- error-recovery.test.ts

# Run with coverage
npm run test:coverage
```

Test files:
- `tests/metrics.test.ts` - Performance metrics tests
- `tests/config-validator.test.ts` - Configuration validation tests
- `tests/error-recovery.test.ts` - Error recovery tests

## Future Enhancements

Potential future improvements:
- Real-time metrics dashboard in Obsidian
- Metrics export to CSV/JSON
- Historical performance tracking
- Custom retry strategies per error type
- Health check endpoints
- Metrics-based alerting

## Contributing

When adding new features:
1. Add comprehensive tests
2. Update this documentation
3. Follow existing code patterns
4. Validate settings appropriately
5. Include error recovery where applicable
