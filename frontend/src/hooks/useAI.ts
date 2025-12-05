/**
 * useAI Hook
 *
 * React hook for managing AI chat state and interactions
 */

import { useState, useCallback, useRef } from 'react';
import { aiService } from '../services/AIService';
import type { ChatMessage, ChatContext, AIError, LookupVesselOutput } from '../types';

/**
 * Chat state interface
 */
interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

/**
 * AI action callbacks
 */
export interface AIActionCallbacks {
  onVesselLookup?: (vessel: LookupVesselOutput['vessel']) => void;
  onVisualizationsAdded?: (visualizations: ChatMessage['visualizations']) => void;
}

/**
 * useAI hook return type
 */
interface UseAIReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  isConfigured: boolean;
  sendMessage: (message: string, context?: ChatContext) => Promise<void>;
  clearChat: () => void;
}

/**
 * Custom hook for AI chat functionality
 */
export function useAI(callbacks?: AIActionCallbacks): UseAIReturn {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });

  const messageIdCounter = useRef(0);
  const callbacksRef = useRef(callbacks);
  
  // Update callbacks ref when they change
  callbacksRef.current = callbacks;

  /**
   * Check if AI is configured
   */
  const isConfigured = aiService.isConfigured();

  /**
   * Generate unique message ID
   */
  const generateMessageId = useCallback((): string => {
    messageIdCounter.current += 1;
    return `msg-${Date.now()}-${messageIdCounter.current}`;
  }, []);

  /**
   * Send a message to the AI
   */
  const sendMessage = useCallback(
    async (message: string, context?: ChatContext): Promise<void> => {
      if (!isConfigured) {
        setState((prev) => ({
          ...prev,
          error: 'AI features require configuration. Please set VITE_LLM_API_KEY.',
        }));
        return;
      }

      if (!message.trim()) {
        return;
      }

      // Add user message to state
      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'user',
        content: message,
        timestamp: new Date(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        isLoading: true,
        error: null,
      }));

      try {
        // Send message to AI service
        const response = await aiService.sendMessage(message, context);

        // Handle tool-specific actions
        if (response.toolCalls && response.toolCalls.length > 0) {
          for (const toolCall of response.toolCalls) {
            // Handle lookupVessel tool - center map on vessel
            if (toolCall.tool === 'lookupVessel' && toolCall.success) {
              const output = toolCall.output as unknown as LookupVesselOutput;
              if (output.found && output.vessel && callbacksRef.current?.onVesselLookup) {
                callbacksRef.current.onVesselLookup(output.vessel);
              }
            }
          }
        }

        // Handle visualizations
        if (response.visualizations && response.visualizations.length > 0) {
          if (callbacksRef.current?.onVisualizationsAdded) {
            callbacksRef.current.onVisualizationsAdded(response.visualizations);
          }
        }

        // Add assistant response to state
        const assistantMessage: ChatMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
          toolCalls: response.toolCalls,
          visualizations: response.visualizations,
        };

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, assistantMessage],
          isLoading: false,
        }));
      } catch (error) {
        console.error('Error sending message to AI:', error);

        let errorMessage = 'An error occurred while communicating with the AI.';

        if (error && typeof error === 'object' && 'message' in error) {
          const aiError = error as AIError;
          errorMessage = aiError.message;
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));

        // Add error message to chat
        const errorChatMessage: ChatMessage = {
          id: generateMessageId(),
          role: 'system',
          content: `Error: ${errorMessage}`,
          timestamp: new Date(),
        };

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, errorChatMessage],
        }));
      }
    },
    [isConfigured, generateMessageId]
  );

  /**
   * Clear chat history
   */
  const clearChat = useCallback((): void => {
    setState({
      messages: [],
      isLoading: false,
      error: null,
    });
    aiService.clearHistory();
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    isConfigured,
    sendMessage,
    clearChat,
  };
}
