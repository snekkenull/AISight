/**
 * AIChatOverlay Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AIChatOverlay } from './AIChatOverlay';
import type { ChatMessage } from '../types';

describe('AIChatOverlay', () => {
  // Mock window.innerWidth to simulate desktop viewport
  const originalInnerWidth = window.innerWidth;
  
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024, // Desktop width
    });
  });
  
  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });
  const mockMessages: ChatMessage[] = [
    {
      id: '1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date('2024-01-01T12:00:00Z'),
    },
    {
      id: '2',
      role: 'assistant',
      content: 'Hi! How can I help you?',
      timestamp: new Date('2024-01-01T12:00:05Z'),
    },
  ];

  it('renders floating button when collapsed', () => {
    render(
      <AIChatOverlay
        isExpanded={false}
        onToggle={vi.fn()}
        messages={[]}
        isLoading={false}
        isConfigured={true}
        onSendMessage={vi.fn()}
      />
    );

    const button = screen.getByLabelText('Open AI chat');
    expect(button).toBeInTheDocument();
  });

  it('renders chat panel when expanded', () => {
    render(
      <AIChatOverlay
        isExpanded={true}
        onToggle={vi.fn()}
        messages={mockMessages}
        isLoading={false}
        isConfigured={true}
        onSendMessage={vi.fn()}
      />
    );

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi! How can I help you?')).toBeInTheDocument();
  });

  it('calls onToggle when button is clicked', () => {
    const onToggle = vi.fn();
    render(
      <AIChatOverlay
        isExpanded={false}
        onToggle={onToggle}
        messages={[]}
        isLoading={false}
        isConfigured={true}
        onSendMessage={vi.fn()}
      />
    );

    const button = screen.getByLabelText('Open AI chat');
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onSendMessage when form is submitted', async () => {
    const onSendMessage = vi.fn();
    render(
      <AIChatOverlay
        isExpanded={true}
        onToggle={vi.fn()}
        messages={[]}
        isLoading={false}
        isConfigured={true}
        onSendMessage={onSendMessage}
      />
    );

    const input = screen.getByPlaceholderText('Type / for commands or ask about vessels...') as HTMLInputElement;

    // Change input value
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Test message' } });
    });
    
    // Verify the input value was set
    expect(input.value).toBe('Test message');
    
    // Click the send button to submit
    const sendButton = screen.getByRole('button', { name: 'Send' });
    await act(async () => {
      fireEvent.click(sendButton);
    });

    expect(onSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('displays typing indicator when loading', () => {
    render(
      <AIChatOverlay
        isExpanded={true}
        onToggle={vi.fn()}
        messages={[]}
        isLoading={true}
        isConfigured={true}
        onSendMessage={vi.fn()}
      />
    );

    // EVA-styled typing indicator shows "Processing..." instead of "AI is thinking..."
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('displays configuration warning when not configured', () => {
    render(
      <AIChatOverlay
        isExpanded={true}
        onToggle={vi.fn()}
        messages={[]}
        isLoading={false}
        isConfigured={false}
        onSendMessage={vi.fn()}
      />
    );

    expect(screen.getByText('AI features require configuration.')).toBeInTheDocument();
    expect(screen.getByText('Not Configured')).toBeInTheDocument();
  });

  it('displays "Show on Map" button for messages with MMSI', () => {
    const onShowVesselOnMap = vi.fn();
    const messageWithMMSI: ChatMessage = {
      id: '3',
      role: 'assistant',
      content: 'Vessel 123456789 is located at...',
      timestamp: new Date(),
    };

    render(
      <AIChatOverlay
        isExpanded={true}
        onToggle={vi.fn()}
        messages={[messageWithMMSI]}
        isLoading={false}
        isConfigured={true}
        onSendMessage={vi.fn()}
        onShowVesselOnMap={onShowVesselOnMap}
      />
    );

    const showOnMapButton = screen.getByText('Show on Map');
    expect(showOnMapButton).toBeInTheDocument();

    fireEvent.click(showOnMapButton);
    expect(onShowVesselOnMap).toHaveBeenCalledWith('123456789');
  });

  it('disables input when not configured', () => {
    render(
      <AIChatOverlay
        isExpanded={true}
        onToggle={vi.fn()}
        messages={[]}
        isLoading={false}
        isConfigured={false}
        onSendMessage={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('AI not configured');
    expect(input).toBeDisabled();
  });

  it('disables input when loading', () => {
    render(
      <AIChatOverlay
        isExpanded={true}
        onToggle={vi.fn()}
        messages={[]}
        isLoading={true}
        isConfigured={true}
        onSendMessage={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Type / for commands or ask about vessels...');
    expect(input).toBeDisabled();
  });

  it('displays tool calls in messages', () => {
    const messageWithTools: ChatMessage = {
      id: '4',
      role: 'assistant',
      content: 'Found the vessel',
      timestamp: new Date(),
      toolCalls: [
        {
          tool: 'lookupVessel',
          input: { mmsi: '123456789' },
          output: { found: true },
          success: true,
        },
      ],
    };

    render(
      <AIChatOverlay
        isExpanded={true}
        onToggle={vi.fn()}
        messages={[messageWithTools]}
        isLoading={false}
        isConfigured={true}
        onSendMessage={vi.fn()}
      />
    );

    expect(screen.getByText('Tools used:')).toBeInTheDocument();
    expect(screen.getByText('lookupVessel')).toBeInTheDocument();
  });
});
