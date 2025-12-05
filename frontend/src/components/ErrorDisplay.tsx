import React, { useEffect } from 'react';
import { EvaWarningBorder } from './ui/eva-effects';
import { soundService } from '../services/SoundService';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'error' | 'warning' | 'info';

/**
 * Error type categories for specific troubleshooting
 */
export type ErrorType = 
  | 'connection'
  | 'database'
  | 'api'
  | 'validation'
  | 'unknown';

/**
 * Props for ErrorDisplay component
 */
export interface ErrorDisplayProps {
  /**
   * Error message to display
   */
  message: string;

  /**
   * Error type for specific troubleshooting steps
   */
  type?: ErrorType;

  /**
   * Error severity level
   */
  severity?: ErrorSeverity;

  /**
   * Optional detailed error information
   */
  details?: string;

  /**
   * Callback when error is dismissed
   */
  onDismiss?: () => void;

  /**
   * Optional CSS class name for styling
   */
  className?: string;

  /**
   * Whether to show troubleshooting steps
   */
  showTroubleshooting?: boolean;
}

/**
 * ErrorDisplay Component
 * 
 * Displays user-friendly error messages with troubleshooting steps
 * and dismiss functionality. Handles different error types with
 * specific guidance for resolution.
 * 
 * Requirements: 5.4, 12.2
 * - EVA warning border animation
 * - EVA red for error states
 * 
 * @param props - Component props
 * @returns ErrorDisplay component
 * 
 * @example
 * <ErrorDisplay 
 *   message="Failed to connect to server"
 *   type="connection"
 *   onDismiss={() => setError(null)}
 * />
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  message,
  type = 'unknown',
  severity = 'error',
  details,
  onDismiss,
  className = '',
  showTroubleshooting = true,
}) => {
  /**
   * Get troubleshooting steps based on error type
   */
  const getTroubleshootingSteps = (): string[] => {
    switch (type) {
      case 'connection':
        return [
          'Check your internet connection',
          'Verify the backend server is running',
          'Ensure the WebSocket URL is correct in configuration',
          'Check if firewall or proxy is blocking the connection',
          'Try refreshing the page',
        ];
      case 'database':
        return [
          'The server is experiencing database issues',
          'Data may be temporarily unavailable',
          'Please try again in a few moments',
          'Contact support if the issue persists',
        ];
      case 'api':
        return [
          'The API request failed',
          'Check if the backend service is running',
          'Verify your request parameters are correct',
          'Try refreshing the page',
        ];
      case 'validation':
        return [
          'Please check your input data',
          'Ensure all required fields are filled',
          'Verify data formats are correct',
        ];
      case 'unknown':
      default:
        return [
          'An unexpected error occurred',
          'Try refreshing the page',
          'Clear your browser cache',
          'Contact support if the issue persists',
        ];
    }
  };

  /**
   * Get icon based on severity - terminal style
   */
  const getIcon = (): string => {
    switch (severity) {
      case 'error':
        return '[!]';
      case 'warning':
        return '[*]';
      case 'info':
        return '[i]';
      default:
        return '[!]';
    }
  };

  /**
   * Get EVA color based on severity
   */
  const getEvaColor = (): 'orange' | 'red' | 'purple' => {
    switch (severity) {
      case 'error':
        return 'red';
      case 'warning':
        return 'orange';
      case 'info':
        return 'purple';
      default:
        return 'red';
    }
  };

  /**
   * Get color classes based on severity (EVA theme)
   */
  const getColorClasses = (): {
    container: string;
    text: string;
    button: string;
  } => {
    switch (severity) {
      case 'error':
        return {
          container: 'bg-eva-bg-secondary',
          text: 'text-eva-accent-red',
          button: 'text-eva-accent-red hover:text-eva-text-primary',
        };
      case 'warning':
        return {
          container: 'bg-eva-bg-secondary',
          text: 'text-eva-accent-orange',
          button: 'text-eva-accent-orange hover:text-eva-text-primary',
        };
      case 'info':
        return {
          container: 'bg-eva-bg-secondary',
          text: 'text-eva-accent-purple',
          button: 'text-eva-accent-purple hover:text-eva-text-primary',
        };
      default:
        return {
          container: 'bg-eva-bg-secondary',
          text: 'text-eva-accent-red',
          button: 'text-eva-accent-red hover:text-eva-text-primary',
        };
    }
  };

  const colors = getColorClasses();
  const evaColor = getEvaColor();
  const troubleshootingSteps = getTroubleshootingSteps();

  // Play alert/error sound when error is displayed - Requirements: 14.3
  useEffect(() => {
    if (severity === 'error') {
      soundService.play('error');
    } else if (severity === 'warning') {
      soundService.play('alert');
    }
  }, [message, severity]);

  return (
    <EvaWarningBorder active={true} color={evaColor}>
      <div
        className={`eva-panel ${colors.container} p-4 ${className}`}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {/* Icon */}
            <div className="text-2xl flex-shrink-0" aria-hidden="true">
              {getIcon()}
            </div>

            {/* Content */}
            <div className="flex-1">
              {/* Error message */}
              <h3 className={`text-sm font-semibold font-eva-mono uppercase tracking-eva-wide ${colors.text} mb-1`}>
                {message}
              </h3>

              {/* Details */}
              {details && (
                <p className={`text-xs font-eva-mono ${colors.text} opacity-80 mb-2`}>
                  {details}
                </p>
              )}

              {/* Troubleshooting steps */}
              {showTroubleshooting && troubleshootingSteps.length > 0 && (
                <div className="mt-3">
                  <p className={`text-xs font-medium font-eva-mono uppercase tracking-eva-wide ${colors.text} mb-2`}>
                    Troubleshooting steps:
                  </p>
                  <ul className={`text-xs font-eva-mono ${colors.text} opacity-80 space-y-1 list-disc list-inside`}>
                    {troubleshootingSteps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Dismiss button */}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`flex-shrink-0 ml-3 ${colors.button} transition-colors`}
              aria-label="Dismiss error"
              type="button"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </EvaWarningBorder>
  );
};

export default ErrorDisplay;
