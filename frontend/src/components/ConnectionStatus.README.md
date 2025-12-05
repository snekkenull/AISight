# ConnectionStatus Component

## Overview

The `ConnectionStatus` component displays the current WebSocket connection status with a visual indicator. It provides real-time feedback to users about their connection to the backend server.

## Features

- **Visual Indicator**: Color-coded dot (green/red/yellow) based on connection state
- **Status Text**: Clear text labels ("Connected", "Disconnected", "Connecting...", "Error")
- **Accessibility**: Proper ARIA labels and live regions for screen readers
- **Error Display**: Optional error message tooltip
- **Responsive**: Works well in headers, sidebars, or standalone
- **Animated**: Pulsing indicator during connection attempts

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `status` | `ConnectionStatus` | Yes | - | Current WebSocket connection status |
| `error` | `Error \| null` | No | `null` | Optional error object to display |
| `className` | `string` | No | `''` | Additional CSS classes for styling |

### ConnectionStatus Type

```typescript
type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';
```

## Visual States

### Connected
- **Indicator**: Green dot
- **Text**: "Connected" (green)
- **Meaning**: WebSocket is active and receiving updates

### Disconnected
- **Indicator**: Red dot
- **Text**: "Disconnected" (red)
- **Meaning**: WebSocket connection is lost

### Connecting
- **Indicator**: Yellow dot (pulsing)
- **Text**: "Connecting..." (yellow)
- **Meaning**: Attempting to establish connection

### Error
- **Indicator**: Red dot
- **Text**: "Error" (red)
- **Additional**: Info icon with error message tooltip
- **Meaning**: Connection failed with an error

## Usage

### Basic Usage

```tsx
import { ConnectionStatus } from './components';
import { useVesselTracking } from './hooks/useVesselTracking';

function App() {
  const { connectionStatus, error } = useVesselTracking();

  return (
    <div>
      <ConnectionStatus status={connectionStatus} error={error} />
    </div>
  );
}
```

### In a Header

```tsx
function Header() {
  const { connectionStatus, error } = useVesselTracking();

  return (
    <header className="bg-gray-800 p-4">
      <div className="flex justify-between items-center">
        <h1>Smart AIS MVP</h1>
        <ConnectionStatus status={connectionStatus} error={error} />
      </div>
    </header>
  );
}
```

### With Custom Styling

```tsx
<ConnectionStatus
  status={connectionStatus}
  error={error}
  className="border-2 border-blue-500 shadow-lg"
/>
```

### Standalone States (for testing/demos)

```tsx
// Show all states
<ConnectionStatus status="connected" />
<ConnectionStatus status="disconnected" />
<ConnectionStatus status="connecting" />
<ConnectionStatus status="error" error={new Error('Connection failed')} />
```

## Integration with useVesselTracking

The component is designed to work seamlessly with the `useVesselTracking` hook:

```tsx
import { ConnectionStatus } from './components';
import { useVesselTracking } from './hooks/useVesselTracking';

function VesselTracker() {
  const {
    connectionStatus,
    error,
    connect,
    disconnect,
    isConnected
  } = useVesselTracking({
    autoConnect: true,
    onError: (err) => console.error('Connection error:', err),
  });

  return (
    <div>
      <ConnectionStatus status={connectionStatus} error={error} />
      
      <div className="mt-4">
        <button onClick={connect} disabled={isConnected}>
          Connect
        </button>
        <button onClick={disconnect} disabled={!isConnected}>
          Disconnect
        </button>
      </div>
    </div>
  );
}
```

## Accessibility

The component includes proper accessibility features:

- **ARIA role**: `role="status"` for status updates
- **ARIA live region**: `aria-live="polite"` for screen reader announcements
- **ARIA label**: Descriptive label for the connection state
- **Error tooltip**: Error messages are accessible via title and aria-label

## Styling

The component uses TailwindCSS classes and can be customized:

- **Base styles**: White background, rounded corners, shadow
- **Status colors**: Green (connected), Red (disconnected/error), Yellow (connecting)
- **Animation**: Pulse effect during connection attempts
- **Responsive**: Adapts to container width

## Requirements Validation

This component satisfies the following requirements:

- **Requirement 9.3**: Displays "Connected" when WebSocket is active
- **Requirement 9.4**: Displays "Disconnected" when WebSocket is lost and shows reconnection status

## Examples

See `ConnectionStatus.example.tsx` for complete working examples including:
- Basic usage with hook integration
- All connection states
- Custom styling
- Header integration
- Manual connection control
