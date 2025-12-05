import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionStatus } from './ConnectionStatus';

describe('ConnectionStatus Component', () => {
  it('should display "CONNECTED" with green indicator when status is connected', () => {
    render(<ConnectionStatus status="connected" />);
    
    const statusText = screen.getByText('CONNECTED');
    expect(statusText).toBeInTheDocument();
    expect(statusText).toHaveClass('text-eva-accent-green');
  });

  it('should display "DISCONNECTED" with red indicator when status is disconnected', () => {
    render(<ConnectionStatus status="disconnected" />);
    
    const statusText = screen.getByText('DISCONNECTED');
    expect(statusText).toBeInTheDocument();
    expect(statusText).toHaveClass('text-eva-accent-red');
  });

  it('should display "CONNECTING..." with orange indicator when status is connecting', () => {
    render(<ConnectionStatus status="connecting" />);
    
    const statusText = screen.getByText('CONNECTING...');
    expect(statusText).toBeInTheDocument();
    expect(statusText).toHaveClass('text-eva-accent-orange');
  });

  it('should display "ERROR" with red indicator when status is error', () => {
    render(<ConnectionStatus status="error" />);
    
    const statusText = screen.getByText('ERROR');
    expect(statusText).toBeInTheDocument();
    expect(statusText).toHaveClass('text-eva-accent-red');
  });

  it('should display error message tooltip when error is provided', () => {
    const error = new Error('Connection failed');
    render(<ConnectionStatus status="error" error={error} />);
    
    const errorIcon = screen.getByLabelText('Error: Connection failed');
    expect(errorIcon).toBeInTheDocument();
  });

  it('should not display error tooltip when status is not error', () => {
    const error = new Error('Connection failed');
    render(<ConnectionStatus status="connected" error={error} />);
    
    const errorIcon = screen.queryByLabelText('Error: Connection failed');
    expect(errorIcon).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ConnectionStatus status="connected" className="custom-class" />
    );
    
    const statusDiv = container.querySelector('.custom-class');
    expect(statusDiv).toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(<ConnectionStatus status="connected" />);
    
    const statusElement = screen.getByRole('status');
    expect(statusElement).toHaveAttribute('aria-live', 'polite');
    expect(statusElement).toHaveAttribute('aria-label', 'Connection status: CONNECTED');
  });

  it('should have pulsing animation for all states', () => {
    const { container } = render(<ConnectionStatus status="connected" />);
    
    const dot = container.querySelector('.animate-eva-pulse');
    expect(dot).toBeInTheDocument();
  });

  it('should have ping animation for all states', () => {
    const { container } = render(<ConnectionStatus status="connecting" />);
    
    const pingDot = container.querySelector('.animate-ping');
    expect(pingDot).toBeInTheDocument();
  });
});
