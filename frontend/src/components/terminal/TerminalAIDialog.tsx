/**
 * TerminalAIDialog Component
 * 
 * Terminal-style AI chat interface with command-line aesthetics.
 * Displays as a terminal window at the bottom or right side of the screen.
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7
 * - Terminal window at bottom of screen by default
 * - Support position switching to right side
 * - Command-prompt styling ("> " for user, "< " for AI)
 * - Command-line input with blinking cursor
 * - Terminal-style loading indicator
 * - No floating button overlay
 * - Layout adjustment on position change
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { TerminalWindow } from './TerminalWindow';
import { TerminalInput } from './TerminalInput';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import type { ChatMessage } from '../../types';
import type { AIPosition } from './TerminalLayout';

export interface TerminalAIDialogProps {
  /** AI dialog position */
  position: AIPosition;
  /** Callback when position changes */
  onPositionChange?: (position: AIPosition) => void;
  /** Chat messages */
  messages: ChatMessage[];
  /** Send message handler */
  onSendMessage: (message: string) => void;
  /** Clear chat handler */
  onClearChat?: () => void;
  /** Whether AI is processing */
  isProcessing?: boolean;
  /** Whether AI is configured */
  isConfigured?: boolean;
  /** Show vessel on map handler */
  onShowVesselOnMap?: (mmsi: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/** Spinning characters for loading indicator - Requirements: 13.7 */
const SPINNER_CHARS = ['|', '/', '-', '\\'];

/**
 * Format message with command-prompt prefix
 * Requirements: 13.4
 * - User messages prefixed with "> "
 * - AI messages prefixed with "< "
 */
function formatMessagePrefix(role: 'user' | 'assistant' | 'system'): string {
  switch (role) {
    case 'user':
      return '> ';
    case 'assistant':
      return '< ';
    case 'system':
      return '! ';
    default:
      return '  ';
  }
}

/**
 * Extract MMSI from message content
 */
function extractMMSI(content: string): string | null {
  const mmsiMatch = content.match(/\b\d{9}\b/);
  return mmsiMatch ? mmsiMatch[0] : null;
}

/**
 * TerminalAIDialog Component
 */
export function TerminalAIDialog({
  position,
  onPositionChange,
  messages,
  onSendMessage,
  onClearChat,
  isProcessing = false,
  isConfigured = true,
  onShowVesselOnMap,
  className = '',
  'data-testid': testId,
}: TerminalAIDialogProps): JSX.Element {
  const [inputValue, setInputValue] = useState('');
  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const [animationClass, setAnimationClass] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevPositionRef = useRef(position);
  const prefersReducedMotion = useReducedMotion();

  // State for expansion - Requirements: 13.1
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle click outside to shrink
  useOnClickOutside(containerRef, () => {
    if (isExpanded) {
      setIsExpanded(false);
    }
  });

  // Handle click to expand
  const handleContainerClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  // Handle position change animation - Requirements: 15.3
  useEffect(() => {
    if (position !== prevPositionRef.current && !prefersReducedMotion) {
      // Apply slide animation based on new position
      const slideClass = position === 'right' ? 'terminal-panel-slide-left' : 'terminal-panel-slide-up';
      setAnimationClass(slideClass);

      const timer = setTimeout(() => {
        setAnimationClass('');
      }, 200);

      prevPositionRef.current = position;
      return () => clearTimeout(timer);
    }
    prevPositionRef.current = position;
    return undefined;
  }, [position, prefersReducedMotion]);

  // Scroll to bottom when expanded to ensure input visibility
  useEffect(() => {
    if (isExpanded && messagesEndRef.current) {
      // Small delay to allow transition to start/finish
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  }, [isExpanded]);

  // Animate spinner for loading indicator - Requirements: 13.7
  useEffect(() => {
    if (!isProcessing || prefersReducedMotion) return;

    const interval = setInterval(() => {
      setSpinnerIndex((prev) => (prev + 1) % SPINNER_CHARS.length);
    }, 100);

    return () => clearInterval(interval);
  }, [isProcessing, prefersReducedMotion]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // State for showing help
  const [showHelp, setShowHelp] = useState(false);

  // Available commands
  const COMMANDS = [
    { cmd: '/HELP', desc: 'Show this command list' },
    { cmd: '/CLEAR', desc: 'Clear chat history' },
    { cmd: '/STATUS', desc: 'Show AI connection status' },
    { cmd: '/SEARCH <QUERY>', desc: 'Search for vessel by MMSI, IMO, or name' },
    { cmd: '/VESSELS', desc: 'Query vessels in current view' },
    { cmd: '/TRACK <MMSI>', desc: 'Get track history for vessel' },
    { cmd: '/ANALYZE', desc: 'Analyze navigation safety for vessels in view' },
    { cmd: '/NEARBY <COORDS>', desc: 'List vessels near location or vessel' },
    { cmd: '/COLLISION', desc: 'Check collision risks in the area' },
    { cmd: '/WEATHER <LOCATION>', desc: 'Get weather conditions for location' },
  ];

  // Handle message submission
  const handleSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;

      const upperTrimmed = trimmed.toUpperCase();

      // Handle /HELP command
      if (upperTrimmed === '/HELP') {
        setShowHelp(true);
        setInputValue('');
        return;
      }

      // Handle /CLEAR command
      if (upperTrimmed === '/CLEAR') {
        onClearChat?.();
        setShowHelp(false);
        setInputValue('');
        return;
      }

      // Handle /STATUS command
      if (upperTrimmed === '/STATUS') {
        const statusMsg = isConfigured
          ? 'AI TERMINAL ONLINE - READY FOR COMMANDS'
          : 'AI TERMINAL OFFLINE - SET VITE_LLM_API_KEY TO ENABLE';
        onSendMessage(`/status: ${statusMsg}`);
        setInputValue('');
        return;
      }

      // For other commands or messages, check if AI is configured
      if (isProcessing || !isConfigured) {
        if (!isConfigured) {
          setShowHelp(false);
        }
        return;
      }

      // Convert command shortcuts to natural language for AI
      let messageToSend = trimmed;
      
      if (upperTrimmed.startsWith('/SEARCH ')) {
        messageToSend = `Search for vessel: ${trimmed.slice(8)}`;
      } else if (upperTrimmed.startsWith('/WEATHER ')) {
        messageToSend = `What's the weather in ${trimmed.slice(9)}?`;
      } else if (upperTrimmed.startsWith('/TRACK ')) {
        messageToSend = `Track vessel with MMSI: ${trimmed.slice(7)}`;
      } else if (upperTrimmed.startsWith('/NEARBY ')) {
        messageToSend = `List vessels near coordinates: ${trimmed.slice(8)}`;
      } else if (upperTrimmed === '/ANALYZE') {
        messageToSend = 'Analyze navigation safety for vessels currently in view';
      } else if (upperTrimmed === '/COLLISION') {
        messageToSend = 'Check collision risks for vessels in the current area';
      } else if (upperTrimmed === '/VESSELS') {
        messageToSend = 'List all vessels currently visible on the map';
      }

      setShowHelp(false);
      onSendMessage(messageToSend);
      setInputValue('');
    },
    [isProcessing, isConfigured, onSendMessage, onClearChat]
  );

  // Handle position toggle
  const handlePositionToggle = useCallback(() => {
    const newPosition = position === 'bottom' ? 'right' : 'bottom';
    onPositionChange?.(newPosition);
  }, [position, onPositionChange]);

  // Build title with position indicator
  const title = `AI TERMINAL ${position === 'right' ? '[RIGHT]' : '[BOTTOM]'}`;

  return (
    <TerminalWindow
      title={title}
      className={`terminal-ai-dialog ${animationClass} ${className}`}
      data-testid={testId}
      borderStyle="single"
      innerOverflow={position === 'right' ? 'hidden' : 'auto'}
      innerFlex={position === 'right'}
      style={{
        height: '100%',
        // Don't limit height when on right side - let it fill the full column
        maxHeight: position === 'right' ? undefined : (isExpanded ? 'max(50vh, 300px)' : undefined),
        transition: 'max-height 0.3s ease-in-out',
      }}
    >
      <div
        ref={containerRef}
        className="terminal-ai-dialog-container"
        onClick={handleContainerClick}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          flex: 1,
          padding: position === 'right' ? '0.5rem 0.75rem 0 0.75rem' : undefined,
        }}
      >
        {/* Header with controls */}
        <div
          className="terminal-ai-dialog-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.25rem 0',
            borderBottom: '1px solid var(--terminal-dim)',
            marginBottom: '0.5rem',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {/* Status indicator */}
            <span
              style={{
                color: isConfigured ? 'var(--terminal-success)' : 'var(--terminal-error)',
              }}
            >
              [{isConfigured ? 'ONLINE' : 'OFFLINE'}]
            </span>
            {isProcessing && (
              <span style={{ color: 'var(--terminal-accent)' }}>
                {prefersReducedMotion ? '[PROCESSING...]' : `[${SPINNER_CHARS[spinnerIndex]}]`}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {/* Position toggle button */}
            {onPositionChange && (
              <button
                onClick={handlePositionToggle}
                style={{
                  background: 'none',
                  border: '1px solid var(--terminal-dim)',
                  color: 'var(--terminal-fg)',
                  padding: '0.125rem 0.5rem',
                  fontFamily: 'inherit',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
                title={`Move to ${position === 'bottom' ? 'right' : 'bottom'}`}
              >
                {position === 'bottom' ? '[→]' : '[↓]'}
              </button>
            )}
            {/* Clear button */}
            {onClearChat && (
              <button
                onClick={onClearChat}
                style={{
                  background: 'none',
                  border: '1px solid var(--terminal-dim)',
                  color: 'var(--terminal-fg)',
                  padding: '0.125rem 0.5rem',
                  fontFamily: 'inherit',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
                title="Clear chat"
              >
                [CLR]
              </button>
            )}
          </div>
        </div>

        {/* Configuration warning */}
        {!isConfigured && (
          <div
            className="terminal-ai-dialog-warning"
            style={{
              padding: '0.5rem',
              marginBottom: '0.5rem',
              border: '1px solid var(--terminal-error)',
              color: 'var(--terminal-error)',
              fontSize: '0.75rem',
            }}
          >
            ! AI FEATURES REQUIRE CONFIGURATION
            <br />
            ! SET VITE_LLM_API_KEY IN ENVIRONMENT
          </div>
        )}

        {/* Messages area - Requirements: 13.4 */}
        <div
          ref={scrollContainerRef}
          className="terminal-ai-dialog-messages terminal-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: 0,
            paddingRight: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: messages.length === 0 && !showHelp ? 'center' : 'flex-start',
          }}
        >
          {/* Help display */}
          {showHelp && (
            <div
              style={{
                padding: '0.5rem',
                marginBottom: '0.5rem',
                border: '1px solid var(--terminal-accent)',
                backgroundColor: 'rgba(255, 102, 0, 0.05)',
              }}
            >
              <div style={{ color: 'var(--terminal-accent)', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                [AVAILABLE COMMANDS]
              </div>
              {COMMANDS.map((cmd, idx) => (
                <div key={idx} style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--terminal-fg)', fontWeight: 'bold' }}>{cmd.cmd}</span>
                  <span style={{ color: 'var(--terminal-dim)', marginLeft: '0.5rem' }}>- {cmd.desc}</span>
                </div>
              ))}
              <div style={{ color: 'var(--terminal-dim)', fontSize: '0.7rem', marginTop: '0.5rem' }}>
                // TYPE ANY MESSAGE TO QUERY THE AI ASSISTANT
              </div>
            </div>
          )}

          {messages.length === 0 && isConfigured && !showHelp && (
            <div
              style={{
                color: 'var(--terminal-dim)',
                padding: '1rem 0',
                textAlign: 'center',
              }}
            >
              {'// AWAITING INPUT...'}
              <br />
              {'// TYPE /HELP FOR COMMANDS'}
            </div>
          )}

          {messages.map((message) => (
            <TerminalMessage
              key={message.id}
              message={message}
              onShowVesselOnMap={onShowVesselOnMap}
            />
          ))}

          {/* Loading indicator - Requirements: 13.7 */}
          {isProcessing && (
            <div
              className="terminal-ai-dialog-loading"
              style={{
                color: 'var(--terminal-accent)',
                padding: '0.25rem 0',
              }}
            >
              {'< '}
              {prefersReducedMotion ? (
                'PROCESSING...'
              ) : (
                <>
                  {SPINNER_CHARS[spinnerIndex]} PROCESSING
                  <span className="terminal-loading-dots">...</span>
                </>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area - Requirements: 13.5 */}
        <div
          className="terminal-ai-dialog-input"
          style={{
            marginTop: 'auto',
            paddingTop: '0.5rem',
            flexShrink: 0,
            position: 'relative',
            zIndex: 10,
          }}
        >
          <TerminalInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            placeholder={isConfigured ? 'ENTER COMMAND...' : 'AI NOT CONFIGURED'}
            prompt=">"
            disabled={!isConfigured || isProcessing}
            autoFocus
          />
        </div>
      </div>

      {/* Loading dots animation */}
      <style>{`
        @keyframes terminal-loading-dots {
          0%, 20% { content: '.'; }
          40% { content: '..'; }
          60%, 100% { content: '...'; }
        }
        
        .terminal-loading-dots::after {
          content: '...';
          animation: terminal-loading-dots 1.5s infinite;
        }
      `}</style>
    </TerminalWindow>
  );
}

/**
 * Individual message component with command-prompt styling
 * Requirements: 13.4
 */
interface TerminalMessageProps {
  message: ChatMessage;
  onShowVesselOnMap?: (mmsi: string) => void;
}

function TerminalMessage({ message, onShowVesselOnMap }: TerminalMessageProps): JSX.Element {
  const prefix = formatMessagePrefix(message.role);
  const mmsi = message.role === 'assistant' ? extractMMSI(message.content) : null;

  // Determine message color based on role
  const getMessageColor = () => {
    switch (message.role) {
      case 'user':
        return 'var(--terminal-fg)';
      case 'assistant':
        return 'var(--terminal-accent)';
      case 'system':
        return 'var(--terminal-error)';
      default:
        return 'var(--terminal-fg)';
    }
  };

  return (
    <div
      className="terminal-message"
      style={{
        marginBottom: '0.5rem',
        wordBreak: 'break-word',
      }}
    >
      {/* Timestamp */}
      <div
        style={{
          color: 'var(--terminal-dim)',
          fontSize: '0.7rem',
          marginBottom: '0.125rem',
        }}
      >
        [{message.timestamp.toLocaleTimeString('en-US', { hour12: false })}]
      </div>

      {/* Message content with prefix - Requirements: 13.4 */}
      <div
        style={{
          color: getMessageColor(),
          whiteSpace: 'pre-wrap',
        }}
      >
        <span style={{ color: 'var(--terminal-accent)' }}>{prefix}</span>
        {message.content}
      </div>

      {/* Tool calls display */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div
          style={{
            marginTop: '0.25rem',
            paddingLeft: '1rem',
            borderLeft: '1px solid var(--terminal-dim)',
          }}
        >
          <div style={{ color: 'var(--terminal-dim)', fontSize: '0.7rem' }}>
            [TOOLS EXECUTED]
          </div>
          {message.toolCalls.map((toolCall, idx) => (
            <div
              key={idx}
              style={{
                fontSize: '0.75rem',
                color: toolCall.success ? 'var(--terminal-success)' : 'var(--terminal-error)',
              }}
            >
              {toolCall.success ? '+' : '-'} {toolCall.tool}
            </div>
          ))}
        </div>
      )}

      {/* Show on map button for vessel references */}
      {mmsi && onShowVesselOnMap && (
        <button
          onClick={() => onShowVesselOnMap(mmsi)}
          style={{
            marginTop: '0.25rem',
            background: 'none',
            border: '1px solid var(--terminal-accent)',
            color: 'var(--terminal-accent)',
            padding: '0.25rem 0.5rem',
            fontFamily: 'inherit',
            fontSize: '0.75rem',
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          [SHOW ON MAP: {mmsi}]
        </button>
      )}
    </div>
  );
}

export default TerminalAIDialog;
