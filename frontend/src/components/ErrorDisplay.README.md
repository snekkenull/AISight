# ErrorDisplay Component

## Overview

The `ErrorDisplay` component provides user-friendly error messages with troubleshooting steps and dismiss functionality. It handles different error types with specific guidance for resolution.

## Requirements

- **10.2**: Display error messages when database connection fails
- **10.4**: Display user-friendly error messages with troubleshooting steps when frontend cannot connect to backend

## Features

- User-friendly error messages
- Type-specific troubleshooting steps
- Dismiss functionality
- Multiple severity levels (error, warning, info)
- Accessibility support with ARIA attributes
- Responsive design with TailwindCSS

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `message` | `string` | Yes | - | Error message to display |
| `type` | `ErrorType` | No | `'unknown'` | Error type for specific troubleshooting |
| `severity` | `ErrorSeverity` | No | `'error'` | Error severity level |
| `details` | `string` | No | - | Optional detailed error information |
| `onDismiss` | `() => void` | No | - | Callback when error is dismissed |
| `className` | `string` | No | `''` | Optional CSS class name |
| `showTroubleshooting` | `boolean` | No | `true` | Whether to show troubleshooting steps |

## Error Types

- `connection`: WebSocket or network connection errors
- `database`: Database-related errors
- `api`: API request failures
- `validation`: Input validation errors
- `unknown`: Unexpected errors

## Severity Levels

- `error`: Critical errors (red styling)
- `warning`: Warning messages (yellow styling)
- `info`: Informational messages (blue styling)

## Usage Examples

### Basic Error Display

```tsx
import { ErrorDisplay } from './components/ErrorDisplay';

function App() {
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      {error && (
        <ErrorDisplay
          message={error}
          type="connection"
          onDismiss={() => setError(null)}
        />
      )}
    </div>
  );
}
```

### Connection Error with Details

```tsx
<ErrorDisplay
  message="Failed to connect to server"
  type="connection"
  details="WebSocket connection refused at ws://localhost:3000"
  severity="error"
  onDismiss={() => handleDismiss()}
/>
```

### Database Error

```tsx
<ErrorDisplay
  message="Database connection failed"
  type="database"
  details="Unable to retrieve vessel data"
  severity="error"
  onDismiss={() => setError(null)}
/>
```

### API Error

```tsx
<ErrorDisplay
  message="Failed to fetch vessel data"
  type="api"
  details="GET /api/vessels returned 500"
  severity="error"
  onDismiss={() => clearError()}
/>
```

### Warning Message

```tsx
<ErrorDisplay
  message="Connection is slow"
  type="connection"
  severity="warning"
  showTroubleshooting={false}
/>
```

### Info Message

```tsx
<ErrorDisplay
  message="Reconnecting to server..."
  type="connection"
  severity="info"
  showTroubleshooting={false}
/>
```

### Without Dismiss Button

```tsx
<ErrorDisplay
  message="Critical system error"
  type="unknown"
  severity="error"
  // No onDismiss prop - dismiss button won't be shown
/>
```

### With Custom Styling

```tsx
<ErrorDisplay
  message="Custom styled error"
  type="connection"
  className="mb-4 max-w-2xl"
  onDismiss={() => setError(null)}
/>
```

## Troubleshooting Steps by Type

### Connection Errors
- Check your internet connection
- Verify the backend server is running
- Ensure the WebSocket URL is correct in configuration
- Check if firewall or proxy is blocking the connection
- Try refreshing the page

### Database Errors
- The server is experiencing database issues
- Data may be temporarily unavailable
- Please try again in a few moments
- Contact support if the issue persists

### API Errors
- The API request failed
- Check if the backend service is running
- Verify your request parameters are correct
- Try refreshing the page

### Validation Errors
- Please check your input data
- Ensure all required fields are filled
- Verify data formats are correct

### Unknown Errors
- An unexpected error occurred
- Try refreshing the page
- Clear your browser cache
- Contact support if the issue persists

## Accessibility

The component includes proper ARIA attributes:
- `role="alert"` for screen readers
- `aria-live="assertive"` for immediate announcements
- `aria-atomic="true"` for complete message reading
- `aria-label` on dismiss button

## Integration with useVesselTracking

```tsx
import { useVesselTracking } from '../hooks/useVesselTracking';
import { ErrorDisplay } from './ErrorDisplay';

function VesselMap() {
  const { vessels, status, error } = useVesselTracking();

  return (
    <div>
      {error && (
        <ErrorDisplay
          message="Failed to connect to vessel tracking service"
          type="connection"
          details={error.message}
          severity="error"
          onDismiss={() => {/* handle dismiss */}}
        />
      )}
      
      {status === 'disconnected' && !error && (
        <ErrorDisplay
          message="Connection lost"
          type="connection"
          severity="warning"
          showTroubleshooting={true}
        />
      )}
      
      {/* Map component */}
    </div>
  );
}
```

## Styling

The component uses TailwindCSS for styling with color-coded severity levels:
- Error: Red background and border
- Warning: Yellow background and border
- Info: Blue background and border

All colors are accessible and meet WCAG contrast requirements.
