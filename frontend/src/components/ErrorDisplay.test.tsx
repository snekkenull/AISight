import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorDisplay } from './ErrorDisplay';

describe('ErrorDisplay', () => {
  it('should render error message', () => {
    render(
      <ErrorDisplay
        message="Test error message"
        type="connection"
      />
    );

    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should render details when provided', () => {
    render(
      <ErrorDisplay
        message="Test error"
        details="Additional error details"
        type="connection"
      />
    );

    expect(screen.getByText('Additional error details')).toBeInTheDocument();
  });

  it('should show troubleshooting steps for connection errors', () => {
    render(
      <ErrorDisplay
        message="Connection failed"
        type="connection"
        showTroubleshooting={true}
      />
    );

    expect(screen.getByText('Troubleshooting steps:')).toBeInTheDocument();
    expect(screen.getByText('Check your internet connection')).toBeInTheDocument();
    expect(screen.getByText('Verify the backend server is running')).toBeInTheDocument();
  });

  it('should show troubleshooting steps for database errors', () => {
    render(
      <ErrorDisplay
        message="Database error"
        type="database"
        showTroubleshooting={true}
      />
    );

    expect(screen.getByText('The server is experiencing database issues')).toBeInTheDocument();
    expect(screen.getByText('Data may be temporarily unavailable')).toBeInTheDocument();
  });

  it('should hide troubleshooting steps when showTroubleshooting is false', () => {
    render(
      <ErrorDisplay
        message="Test error"
        type="connection"
        showTroubleshooting={false}
      />
    );

    expect(screen.queryByText('Troubleshooting steps:')).not.toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(
      <ErrorDisplay
        message="Test error"
        type="connection"
        onDismiss={onDismiss}
      />
    );

    const dismissButton = screen.getByLabelText('Dismiss error');
    fireEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should not render dismiss button when onDismiss is not provided', () => {
    render(
      <ErrorDisplay
        message="Test error"
        type="connection"
      />
    );

    expect(screen.queryByLabelText('Dismiss error')).not.toBeInTheDocument();
  });

  it('should apply correct severity styling for error', () => {
    const { container } = render(
      <ErrorDisplay
        message="Test error"
        severity="error"
        type="connection"
      />
    );

    const errorDiv = container.querySelector('[role="alert"]');
    expect(errorDiv).toHaveClass('eva-panel', 'bg-eva-bg-secondary');
  });

  it('should apply correct severity styling for warning', () => {
    const { container } = render(
      <ErrorDisplay
        message="Test warning"
        severity="warning"
        type="connection"
      />
    );

    const errorDiv = container.querySelector('[role="alert"]');
    expect(errorDiv).toHaveClass('eva-panel', 'bg-eva-bg-secondary');
  });

  it('should apply correct severity styling for info', () => {
    const { container } = render(
      <ErrorDisplay
        message="Test info"
        severity="info"
        type="connection"
      />
    );

    const errorDiv = container.querySelector('[role="alert"]');
    expect(errorDiv).toHaveClass('eva-panel', 'bg-eva-bg-secondary');
  });

  it('should have proper accessibility attributes', () => {
    render(
      <ErrorDisplay
        message="Test error"
        type="connection"
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(alert).toHaveAttribute('aria-atomic', 'true');
  });

  it('should show API error troubleshooting steps', () => {
    render(
      <ErrorDisplay
        message="API error"
        type="api"
        showTroubleshooting={true}
      />
    );

    expect(screen.getByText('The API request failed')).toBeInTheDocument();
    expect(screen.getByText('Check if the backend service is running')).toBeInTheDocument();
  });

  it('should show validation error troubleshooting steps', () => {
    render(
      <ErrorDisplay
        message="Validation error"
        type="validation"
        showTroubleshooting={true}
      />
    );

    expect(screen.getByText('Please check your input data')).toBeInTheDocument();
    expect(screen.getByText('Ensure all required fields are filled')).toBeInTheDocument();
  });

  it('should show unknown error troubleshooting steps', () => {
    render(
      <ErrorDisplay
        message="Unknown error"
        type="unknown"
        showTroubleshooting={true}
      />
    );

    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
    expect(screen.getByText('Try refreshing the page')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ErrorDisplay
        message="Test error"
        type="connection"
        className="custom-class"
      />
    );

    const errorDiv = container.querySelector('[role="alert"]');
    expect(errorDiv).toHaveClass('custom-class');
  });
});
