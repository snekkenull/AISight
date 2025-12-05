/**
 * AIChatOverlay Component
 *
 * Floating AI chat interface with expandable panel
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 6.1, 8.3
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { usePersistedState } from '../hooks/usePersistedState';
import { Card, CardHeader } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import type { ChatMessage } from '../types';

// Command definitions for the chat
interface ChatCommand {
  command: string;
  hint: string;
  description: string;
  example?: string;
}

const CHAT_COMMANDS: ChatCommand[] = [
  {
    command: '/clear',
    hint: 'Clear chat',
    description: 'Wipe the current chat history',
  },
  {
    command: '/search',
    hint: 'Search vessel',
    description: 'Look up a vessel by MMSI, IMO, or name',
    example: '/search 123456789',
  },
  {
    command: '/weather',
    hint: 'Check weather',
    description: 'Get current weather conditions for a location',
    example: '/weather Shanghai',
  },
  {
    command: '/analyze',
    hint: 'Safety analysis',
    description: 'Assess navigation safety for vessels in view',
  },
  {
    command: '/nearby',
    hint: 'Nearby vessels',
    description: 'List vessels near a specific location or vessel',
    example: '/nearby 31.2,121.5',
  },
  {
    command: '/track',
    hint: 'Track vessel',
    description: 'Start tracking a specific vessel',
    example: '/track 123456789',
  },
  {
    command: '/collision',
    hint: 'Collision risk',
    description: 'Check collision risks for vessels in the area',
  },
  {
    command: '/help',
    hint: 'Show help',
    description: 'Display available commands and usage tips',
  },
];

// EVA-styled animation styles for the chat panel
// Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 10.4
const panelAnimationStyles = `
  @keyframes chat-panel-expand {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  @keyframes eva-chat-button-pulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 10px var(--eva-border-glow);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 0 0 25px var(--eva-border-glow), 0 0 40px var(--eva-border-glow);
    }
  }
  
  @keyframes eva-processing-pulse {
    0%, 100% {
      box-shadow: 0 0 10px var(--eva-accent-orange);
    }
    50% {
      box-shadow: 0 0 25px var(--eva-accent-orange), 0 0 40px var(--eva-accent-cyan);
    }
  }
  
  @keyframes message-slide-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .chat-panel-enter {
    animation: chat-panel-expand 0.25s cubic-bezier(0.32, 0.72, 0, 1) forwards;
  }
  
  .eva-chat-button {
    background: var(--eva-bg-secondary) !important;
    border: 2px solid var(--eva-accent-orange) !important;
    color: var(--eva-accent-orange) !important;
    clip-path: polygon(0 15%, 15% 0, 100% 0, 100% 85%, 85% 100%, 0 100%);
    transition: all 0.2s ease-in-out;
  }
  
  .eva-chat-button:hover {
    animation: eva-chat-button-pulse 0.8s ease-in-out infinite;
    background: var(--eva-bg-tertiary) !important;
    color: var(--eva-text-primary) !important;
  }
  
  .eva-chat-button.processing {
    animation: eva-processing-pulse 1s ease-in-out infinite;
  }
  
  .message-animate {
    animation: message-slide-in 0.2s ease-out forwards;
  }
  
  @keyframes command-menu-slide {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .command-menu-enter {
    animation: command-menu-slide 0.15s ease-out forwards;
  }
  
  .command-item {
    transition: background-color 0.1s ease;
  }
  
  .command-item:hover,
  .command-item.selected {
    background-color: var(--eva-bg-tertiary);
  }
  
  /* EVA Chat Panel Styling */
  .eva-chat-panel {
    background: var(--eva-bg-primary) !important;
    border: 2px solid var(--eva-accent-orange) !important;
    clip-path: polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px));
    box-shadow: 0 0 30px var(--eva-border-glow), inset 0 0 20px rgba(255, 102, 0, 0.05);
  }
  
  /* Corner bracket decorations */
  .eva-chat-panel::before,
  .eva-chat-panel::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    border: 2px solid var(--eva-accent-orange);
    z-index: 10;
    pointer-events: none;
  }
  
  .eva-chat-panel::before {
    top: 8px;
    left: 8px;
    border-right: none;
    border-bottom: none;
  }
  
  .eva-chat-panel::after {
    bottom: 8px;
    right: 8px;
    border-left: none;
    border-top: none;
  }
  
  /* EVA Chat Header */
  .eva-chat-header {
    background: linear-gradient(90deg, var(--eva-bg-secondary) 0%, var(--eva-bg-tertiary) 100%);
    border-bottom: 1px solid var(--eva-accent-orange) !important;
  }
  
  /* EVA Input Focus Glow */
  .eva-chat-input:focus {
    box-shadow: 0 0 15px var(--eva-border-glow), inset 0 0 5px rgba(255, 102, 0, 0.1);
    border-color: var(--eva-accent-orange) !important;
  }
  
  /* EVA Message Bubbles */
  .eva-message-user {
    background: linear-gradient(135deg, var(--eva-accent-orange) 0%, #cc5200 100%) !important;
    border: 1px solid var(--eva-accent-orange);
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%);
  }
  
  .eva-message-ai {
    background: var(--eva-bg-secondary) !important;
    border: 1px solid var(--eva-border-default);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 8px 100%, 0 calc(100% - 8px));
  }
  
  .eva-message-system {
    background: rgba(220, 20, 60, 0.1) !important;
    border: 1px solid var(--eva-accent-red);
  }
  
  /* EVA Typing Indicator */
  .eva-typing-dot {
    background: var(--eva-accent-orange);
  }
  
  /* EVA Command Menu */
  .eva-command-menu {
    background: var(--eva-bg-secondary);
    border: 1px solid var(--eva-accent-orange);
    clip-path: polygon(0 5px, 5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%);
    box-shadow: 0 0 20px var(--eva-border-glow);
  }
`;

export interface AIChatOverlayProps {
  isExpanded: boolean;
  onToggle: () => void;
  messages: ChatMessage[];
  isLoading: boolean;
  isConfigured: boolean;
  onSendMessage: (message: string) => void;
  onShowVesselOnMap?: (mmsi: string) => void;
  onClearChat?: () => void;
}

/**
 * AIChatOverlay component for AI chat interface
 * Displays as a floating button that expands to an overlay panel
 * Uses z-index 9999 to ensure it's never obscured by other elements
 */
/**
 * AIChatOverlay component for AI chat interface
 * Displays as a floating button that expands to an overlay panel
 * Uses z-index 9999 to ensure it's never obscured by other elements
 */
export const AIChatOverlay = React.memo(function AIChatOverlay({
  isExpanded,
  onToggle,
  messages,
  isLoading,
  isConfigured,
  onSendMessage,
  onShowVesselOnMap,
  onClearChat,
}: AIChatOverlayProps) {
  const [inputValue, setInputValue] = useState('');
  const [panelHeight, setPanelHeight] = usePersistedState('ais-chat-panel-height', 400);
  const [isResizing, setIsResizing] = useState(false);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const commandMenuRef = useRef<HTMLDivElement>(null);

  // Detect if viewport is mobile (< 768px)
  const [isMobile, setIsMobile] = useState(false);

  // Filter commands based on input
  const filteredCommands = useMemo(() => {
    if (!inputValue.startsWith('/')) return [];
    const query = inputValue.slice(1).toLowerCase();
    if (query === '') return CHAT_COMMANDS;
    return CHAT_COMMANDS.filter(
      (cmd) =>
        cmd.command.slice(1).toLowerCase().includes(query) ||
        cmd.hint.toLowerCase().includes(query)
    );
  }, [inputValue]);

  // Show/hide command menu based on input
  useEffect(() => {
    if (inputValue.startsWith('/') && filteredCommands.length > 0) {
      setShowCommandMenu(true);
      setSelectedCommandIndex(0);
    } else {
      setShowCommandMenu(false);
    }
  }, [inputValue, filteredCommands.length]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check on mount
    checkMobile();

    // Listen for resize events
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resizeStartY = useRef<number>(0);
  const resizeStartHeight = useRef<number>(0);
  const prevMessageCount = useRef<number>(messages.length);

  // Smooth scroll to bottom with easing
  const scrollToBottom = useCallback((instant = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: instant ? 'auto' : 'smooth',
        block: 'end',
      });
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      // Small delay to allow DOM to update
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
    prevMessageCount.current = messages.length;
  }, [messages, scrollToBottom]);

  // Scroll to bottom when panel expands
  useEffect(() => {
    if (isExpanded && messages.length > 0) {
      // Delay to allow animation to start
      const timer = setTimeout(() => scrollToBottom(true), 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isExpanded, messages.length, scrollToBottom]);

  // Focus input when panel expands
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Handle command selection
  const handleCommandSelect = useCallback((command: ChatCommand) => {
    if (command.command === '/clear') {
      onClearChat?.();
      setInputValue('');
      setShowCommandMenu(false);
      return;
    }
    
    if (command.command === '/help') {
      const helpMessage = CHAT_COMMANDS.map(
        (cmd) => `${cmd.command} - ${cmd.hint}: ${cmd.description}`
      ).join('\n');
      onSendMessage(`Show me the available commands:\n${helpMessage}`);
      setInputValue('');
      setShowCommandMenu(false);
      return;
    }

    // For commands with examples, set the command with a space for user to add params
    if (command.example) {
      setInputValue(command.command + ' ');
    } else {
      // For commands without params, convert to natural language query
      const queryMap: Record<string, string> = {
        '/analyze': 'Analyze navigation safety for vessels currently in view',
        '/collision': 'Check collision risks for vessels in the current area',
        '/nearby': 'List nearby vessels',
      };
      const query = queryMap[command.command] || command.description;
      setInputValue(query);
    }
    setShowCommandMenu(false);
    inputRef.current?.focus();
  }, [onClearChat, onSendMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || isLoading || !isConfigured) {
      return;
    }

    // Handle /clear command directly
    if (inputValue.trim() === '/clear') {
      onClearChat?.();
      setInputValue('');
      return;
    }

    // Convert command shortcuts to natural language for AI
    let messageToSend = inputValue;
    if (inputValue.startsWith('/search ')) {
      messageToSend = `Search for vessel: ${inputValue.slice(8)}`;
    } else if (inputValue.startsWith('/weather ')) {
      messageToSend = `What's the weather in ${inputValue.slice(9)}?`;
    } else if (inputValue.startsWith('/track ')) {
      messageToSend = `Track vessel with MMSI: ${inputValue.slice(7)}`;
    } else if (inputValue.startsWith('/nearby ')) {
      messageToSend = `List vessels near coordinates: ${inputValue.slice(8)}`;
    }

    onSendMessage(messageToSend);
    setInputValue('');
    setShowCommandMenu(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle command menu navigation
    if (showCommandMenu && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        handleCommandSelect(filteredCommands[selectedCommandIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommandMenu(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = panelHeight;
  };

  // Handle resize move
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = resizeStartY.current - e.clientY;
      const newHeight = Math.max(200, Math.min(800, resizeStartHeight.current + deltaY));
      setPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setPanelHeight]);

  // Extract MMSI from message content (simple pattern matching)
  const extractMMSI = (content: string): string | null => {
    const mmsiMatch = content.match(/\b\d{9}\b/);
    return mmsiMatch ? mmsiMatch[0] : null;
  };

  // Shared chat content render function with EVA styling
  // Requirements: 2.1, 4.1, 4.3, 4.4, 10.4
  const renderChatContent = () => (
    <>
      {/* EVA-styled Configuration message */}
      {!isConfigured && (
        <div className="px-4 py-3 bg-eva-accent-red/10 border-b border-eva-accent-red">
          <p className="text-sm font-eva-mono font-medium text-eva-accent-red uppercase tracking-eva-tight">
            AI features require configuration.
          </p>
          <p className="text-xs text-eva-text-secondary mt-1 font-eva-mono">
            Please set <code className="text-xs bg-eva-bg-tertiary text-eva-accent-orange px-1 py-0.5 border border-eva-border-default">VITE_LLM_API_KEY</code> in your environment variables.
          </p>
        </div>
      )}

      {/* EVA-styled Messages list */}
      <ScrollArea className="flex-1 px-4 py-3 bg-eva-bg-primary" ref={scrollAreaRef}>
        <div className="space-y-3">
          {messages.length === 0 && isConfigured && (
            <div className="text-center text-eva-text-secondary py-8">
              <p className="text-sm font-eva-mono uppercase tracking-eva-tight">Start a conversation with the AI assistant</p>
              <p className="text-xs mt-2 font-eva-mono text-eva-text-secondary/70">
                Ask about vessels, collision risks, or nearby traffic
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setInputValue('/search ')}
                  className="text-xs px-2 py-1 bg-eva-bg-secondary text-eva-accent-orange border border-eva-border-default hover:border-eva-accent-orange hover:shadow-eva-glow-sm transition-all font-eva-mono eva-clip-corner-sm"
                >
                  /search
                </button>
                <button
                  type="button"
                  onClick={() => setInputValue('/weather ')}
                  className="text-xs px-2 py-1 bg-eva-bg-secondary text-eva-accent-orange border border-eva-border-default hover:border-eva-accent-orange hover:shadow-eva-glow-sm transition-all font-eva-mono eva-clip-corner-sm"
                >
                  /weather
                </button>
                <button
                  type="button"
                  onClick={() => setInputValue('/analyze')}
                  className="text-xs px-2 py-1 bg-eva-bg-secondary text-eva-accent-orange border border-eva-border-default hover:border-eva-accent-orange hover:shadow-eva-glow-sm transition-all font-eva-mono eva-clip-corner-sm"
                >
                  /analyze
                </button>
                <button
                  type="button"
                  onClick={() => setInputValue('/')}
                  className="text-xs px-2 py-1 bg-eva-accent-orange/10 text-eva-accent-orange border border-eva-accent-orange hover:bg-eva-accent-orange/20 hover:shadow-eva-glow-sm transition-all font-eva-mono eva-clip-corner-sm"
                >
                  / more...
                </button>
              </div>
              <p className="text-xs mt-3 text-eva-text-secondary/50 font-eva-mono">
                Type <kbd className="px-1 py-0.5 bg-eva-bg-tertiary text-eva-accent-orange border border-eva-border-default text-[10px] font-eva-mono">/</kbd> to see all commands
              </p>
            </div>
          )}

          {/* EVA-styled message bubbles - Requirements: 2.1 */}
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex message-animate ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
            >
              <div
                className={`max-w-[85%] px-3 py-2 overflow-hidden font-eva-mono ${message.role === 'user'
                  ? 'eva-message-user text-eva-text-primary'
                  : message.role === 'system'
                    ? 'eva-message-system text-eva-accent-red'
                    : 'eva-message-ai text-eva-text-primary'
                  }`}
              >
                <div className="text-sm break-words overflow-wrap-anywhere prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-2 prose-pre:overflow-x-auto prose-code:break-all">
                  {message.role === 'user' ? (
                    <p className="whitespace-pre-wrap m-0 text-eva-text-primary">{message.content}</p>
                  ) : (
                    <ReactMarkdown
                      components={{
                        pre: ({ children }) => (
                          <pre className="bg-eva-bg-tertiary border border-eva-border-default p-2 overflow-x-auto text-xs text-eva-accent-green">
                            {children}
                          </pre>
                        ),
                        code: ({ children, className }) => {
                          const isInline = !className;
                          return isInline ? (
                            <code className="bg-eva-bg-tertiary text-eva-accent-cyan px-1 py-0.5 text-xs break-all border border-eva-border-default">
                              {children}
                            </code>
                          ) : (
                            <code className="break-all text-eva-accent-green">{children}</code>
                          );
                        },
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  )}
                </div>
                <p
                  className={`text-xs mt-1 font-eva-mono ${message.role === 'user'
                    ? 'text-eva-text-primary/70'
                    : 'text-eva-text-secondary'
                    }`}
                >
                  [{message.timestamp.toLocaleTimeString('en-US', { hour12: false })}]
                </p>

                {/* EVA-styled Tool calls display */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-eva-border-default">
                    <p className="text-xs text-eva-text-secondary mb-1 uppercase tracking-eva-tight">Tools used:</p>
                    {message.toolCalls.map((toolCall, idx) => (
                      <div
                        key={idx}
                        className="text-xs bg-eva-bg-tertiary border border-eva-border-default px-2 py-1 mt-1 eva-clip-corner-sm"
                      >
                        <span className="font-medium text-eva-accent-cyan">{toolCall.tool}</span>
                        {toolCall.success ? (
                          <span className="text-eva-accent-green ml-2">✓</span>
                        ) : (
                          <span className="text-eva-accent-red ml-2">✗</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* EVA-styled Show on Map button for vessel references */}
                {message.role === 'assistant' && onShowVesselOnMap && extractMMSI(message.content) && (
                  <Button
                    size="sm"
                    className="mt-2 min-h-[44px] bg-eva-bg-secondary text-eva-accent-orange border border-eva-accent-orange hover:bg-eva-accent-orange hover:text-eva-bg-primary eva-clip-corner-sm transition-all"
                    onClick={() => {
                      const mmsi = extractMMSI(message.content);
                      if (mmsi) {
                        onShowVesselOnMap(mmsi);
                      }
                    }}
                  >
                    Show on Map
                  </Button>
                )}
              </div>
            </div>
          ))}

          {/* EVA-styled Typing indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-eva-bg-secondary text-eva-text-primary border border-eva-border-default px-3 py-2 eva-clip-corner-sm">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-eva-accent-orange animate-bounce" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}></div>
                    <div className="w-2 h-2 bg-eva-accent-orange animate-bounce" style={{ animationDelay: '0.1s', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}></div>
                    <div className="w-2 h-2 bg-eva-accent-orange animate-bounce" style={{ animationDelay: '0.2s', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}></div>
                  </div>
                  <span className="text-sm text-eva-text-secondary font-eva-mono uppercase tracking-eva-tight">Processing...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* EVA-styled Input area - Requirements: 4.3, 10.4 */}
      <div className="border-t border-eva-accent-orange p-4 bg-eva-bg-secondary relative">
        {/* EVA-styled Command suggestions menu */}
        {showCommandMenu && filteredCommands.length > 0 && (
          <div
            ref={commandMenuRef}
            className="absolute bottom-full left-4 right-4 mb-2 eva-command-menu overflow-hidden command-menu-enter"
          >
            <div className="py-1 max-h-[200px] overflow-y-auto">
              {filteredCommands.map((cmd, index) => (
                <button
                  key={cmd.command}
                  type="button"
                  className={`command-item w-full px-3 py-2 text-left flex items-start gap-3 transition-colors ${
                    index === selectedCommandIndex ? 'selected bg-eva-bg-tertiary border-l-2 border-eva-accent-orange' : 'border-l-2 border-transparent'
                  }`}
                  onClick={() => handleCommandSelect(cmd)}
                  onMouseEnter={() => setSelectedCommandIndex(index)}
                >
                  <span className="font-eva-mono text-sm font-medium text-eva-accent-orange min-w-[80px]">
                    {cmd.command}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-eva-text-primary font-eva-mono uppercase tracking-eva-tight">
                      {cmd.hint}
                    </span>
                    <p className="text-xs text-eva-text-secondary truncate font-eva-mono">
                      {cmd.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-3 py-1.5 bg-eva-bg-tertiary border-t border-eva-border-default text-xs text-eva-text-secondary flex items-center gap-2 font-eva-mono">
              <kbd className="px-1.5 py-0.5 bg-eva-bg-primary border border-eva-border-default text-eva-accent-orange text-[10px]">↑↓</kbd>
              <span>navigate</span>
              <kbd className="px-1.5 py-0.5 bg-eva-bg-primary border border-eva-border-default text-eva-accent-orange text-[10px] ml-2">Tab</kbd>
              <span>select</span>
              <kbd className="px-1.5 py-0.5 bg-eva-bg-primary border border-eva-border-default text-eva-accent-orange text-[10px] ml-2">Esc</kbd>
              <span>close</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isConfigured
                ? 'Type / for commands or ask about vessels...'
                : 'AI not configured'
            }
            disabled={isLoading || !isConfigured}
            className="flex-1 min-h-[44px] bg-eva-bg-primary border-eva-border-default text-eva-text-primary placeholder:text-eva-text-secondary/50 font-eva-mono eva-chat-input focus:border-eva-accent-orange focus:ring-eva-accent-orange/20"
            autoComplete="off"
            autoFocus={false}
          />
          <Button
            type="submit"
            disabled={isLoading || !isConfigured || !inputValue.trim()}
            className="min-h-[44px] min-w-[60px] bg-eva-accent-orange text-eva-bg-primary hover:bg-eva-accent-orange/80 disabled:bg-eva-bg-tertiary disabled:text-eva-text-secondary disabled:border-eva-border-default font-eva-display uppercase tracking-eva-tight eva-clip-corner-sm border border-eva-accent-orange transition-all hover:shadow-eva-glow-sm"
          >
            Send
          </Button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Inject animation styles */}
      <style>{panelAnimationStyles}</style>

      {/* EVA-styled Floating Chat Button - Requirements: 4.2, 5.1 */}
      {!isExpanded && (
        <Button
          onClick={onToggle}
          size="icon"
          className={`fixed bottom-6 right-6 w-14 h-14 shadow-lg z-[9999] focus:outline-none focus:ring-2 focus:ring-eva-accent-orange focus:ring-offset-2 focus:ring-offset-eva-bg-primary eva-chat-button transition-all duration-300 ${isLoading ? 'processing' : ''}`}
          style={{ zIndex: 9999 }}
          aria-label="Open AI chat"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          {!isConfigured && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-eva-accent-red rounded-full border-2 border-eva-bg-primary animate-eva-pulse"></div>
          )}
        </Button>
      )}

      {/* Mobile: EVA-styled Full-width bottom sheet - Requirements: 4.1, 4.4 */}
      {isMobile && isExpanded && (
        <Sheet open={isExpanded} onOpenChange={onToggle}>
          <SheetContent
            side="bottom"
            className="h-[70vh] p-0 flex flex-col z-[9999] bg-eva-bg-primary border-t-2 border-eva-accent-orange"
            style={{ zIndex: 9999, borderRadius: 0, clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)' }}
          >
            <SheetHeader className="px-4 py-3 eva-chat-header">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 bg-eva-accent-orange ${isLoading ? 'animate-eva-pulse' : ''}`} style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}></div>
                <SheetTitle className="text-base font-eva-display text-eva-text-primary uppercase tracking-eva-normal">AI Assistant</SheetTitle>
                {!isConfigured && (
                  <span className="text-xs text-eva-accent-red bg-eva-accent-red/10 px-2 py-1 eva-clip-corner-sm border border-eva-accent-red">
                    Not Configured
                  </span>
                )}
              </div>
              <SheetDescription className="sr-only">
                Chat with the AI assistant about vessels
              </SheetDescription>
            </SheetHeader>

            {/* EVA-styled Drag handle indicator */}
            <div className="flex justify-center py-2 bg-eva-bg-secondary">
              <div className="w-12 h-1 bg-eva-accent-orange/50"></div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden bg-eva-bg-primary">
              {renderChatContent()}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop: EVA-styled Expandable Chat Panel - Requirements: 4.1, 4.4 */}
      {!isMobile && isExpanded && (
        <Card
          className="fixed bottom-6 right-6 w-[400px] shadow-2xl flex flex-col z-[9999] chat-panel-enter eva-chat-panel"
          style={{ height: `${panelHeight}px`, zIndex: 9999 }}
        >
          {/* Resize Handle */}
          <div
            className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-eva-accent-orange transition-colors"
            onMouseDown={handleResizeStart}
          />

          {/* EVA-styled Header - Requirements: 4.4 */}
          <CardHeader className="flex flex-row items-center justify-between px-4 py-3 eva-chat-header space-y-0">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 bg-eva-accent-orange ${isLoading ? 'animate-eva-pulse' : ''}`} style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}></div>
              <span className="font-eva-display text-eva-text-primary uppercase tracking-eva-normal text-sm">AI Assistant</span>
              {!isConfigured && (
                <span className="text-xs text-eva-accent-red bg-eva-accent-red/10 px-2 py-1 eva-clip-corner-sm border border-eva-accent-red">
                  Not Configured
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="min-w-[44px] min-h-[44px] text-eva-accent-orange hover:text-eva-text-primary hover:bg-eva-bg-tertiary border border-transparent hover:border-eva-accent-orange transition-all"
              aria-label="Close chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          </CardHeader>

          <div className="flex-1 flex flex-col overflow-hidden bg-eva-bg-primary">
            {renderChatContent()}
          </div>
        </Card>
      )}
    </>
  );
});
