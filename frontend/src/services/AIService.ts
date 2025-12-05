/**
 * AI Service
 *
 * Manages communication with LLM provider (OpenAI-compatible API)
 * Handles tool calling and response processing
 */

import OpenAI from 'openai';
import { AI_CONFIG, isAIConfigured } from '../config';
import type {
  AIResponse,
  AIError,
  ChatContext,
  ToolDefinition,
  ToolCallResult,
  LookupVesselInput,
  FindNearbyVesselsInput,
  AnalyzeCollisionRiskInput,
  AnalyzeNavigationSafetyInput,
  GetSeaConditionsInput,
  GetWeatherForecastInput,
  MapVisualization,
  FindNearbyVesselsOutput,
  AnalyzeCollisionRiskOutput,
} from '../types';
import { lookupVessel, findNearbyVessels, analyzeCollisionRisk, analyzeVesselBehavior, analyzeNavigationSafety, getSeaConditions, getWeatherForecast } from './AITools';

/**
 * AIService class for managing LLM interactions
 */
export class AIService {
  private client: OpenAI | null = null;
  private conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  constructor() {
    if (isAIConfigured()) {
      this.initializeClient();
    }
  }

  /**
   * Initialize OpenAI client with configuration
   */
  private initializeClient(): void {
    try {
      this.client = new OpenAI({
        apiKey: AI_CONFIG.apiKey,
        baseURL: AI_CONFIG.apiBaseUrl,
        dangerouslyAllowBrowser: true, // Required for browser usage
      });
    } catch (error) {
      console.error('Failed to initialize AI client:', error);
      this.client = null;
    }
  }

  /**
   * Check if AI service is configured and ready
   */
  public isConfigured(): boolean {
    return this.client !== null && isAIConfigured();
  }

  /**
   * Validate connection to LLM provider
   */
  public async validateConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      // Send a simple test message
      const response = await this.client!.chat.completions.create({
        model: AI_CONFIG.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
      });

      return response.choices.length > 0;
    } catch (error) {
      console.error('AI connection validation failed:', error);
      return false;
    }
  }

  /**
   * Send a message to the AI and get a response
   */
  public async sendMessage(
    message: string,
    context?: ChatContext
  ): Promise<AIResponse> {
    if (!this.isConfigured()) {
      throw this.createError(
        'CONFIG_ERROR',
        'AI features require configuration. Please set VITE_LLM_API_KEY.',
        false
      );
    }

    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: message,
      });

      // Build system message with context if provided
      const systemMessage = this.buildSystemMessage(context);

      // Create messages array with system message and history
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemMessage },
        ...this.conversationHistory,
      ];

      // Get available tools
      const tools = this.getAvailableTools();

      // Call LLM
      const response = await this.client!.chat.completions.create({
        model: AI_CONFIG.model,
        messages,
        tools: tools.length > 0 ? tools.map(this.toolToOpenAIFormat) : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
      });

      const choice = response.choices[0];
      const assistantMessage = choice.message;

      // Add assistant response to history
      this.conversationHistory.push(assistantMessage);

      // Process tool calls if any
      const toolCalls: ToolCallResult[] = [];
      const visualizations: MapVisualization[] = [];
      
      // Check for proper API tool calls first
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        for (const toolCall of assistantMessage.tool_calls) {
          const result = await this.executeToolCall(toolCall, context);
          toolCalls.push(result);

          // Generate visualizations based on tool results
          const toolVisualizations = this.generateVisualizationsFromToolResult(result);
          visualizations.push(...toolVisualizations);

          // Add tool result to conversation history
          this.conversationHistory.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result.output),
          });
        }

        // Get final response after tool execution
        const finalResponse = await this.client!.chat.completions.create({
          model: AI_CONFIG.model,
          messages: [
            { role: 'system', content: systemMessage },
            ...this.conversationHistory,
          ],
        });

        const finalChoice = finalResponse.choices[0];
        this.conversationHistory.push(finalChoice.message);

        return {
          message: this.cleanResponseMessage(finalChoice.message.content || ''),
          toolCalls,
          visualizations,
        };
      }

      // Check for text-based tool calls (some models output tool calls as text)
      const textToolCalls = this.parseTextToolCalls(assistantMessage.content || '');
      if (textToolCalls.length > 0 && context) {
        console.log('Detected text-based tool calls:', textToolCalls);
        
        for (const textToolCall of textToolCalls) {
          const result = await this.executeTextToolCall(textToolCall, context);
          toolCalls.push(result);

          // Generate visualizations based on tool results
          const toolVisualizations = this.generateVisualizationsFromToolResult(result);
          visualizations.push(...toolVisualizations);
        }

        // Build tool results summary for the LLM
        const toolResultsSummary = toolCalls.map(tc => {
          return `Tool: ${tc.tool}\nInput: ${JSON.stringify(tc.input)}\nResult: ${JSON.stringify(tc.output, null, 2)}`;
        }).join('\n\n');

        // Add tool results to conversation and ask for summary
        this.conversationHistory.push({
          role: 'assistant',
          content: `I executed the following tools:\n\n${toolResultsSummary}`,
        });

        // Get final summary response
        const summaryResponse = await this.client!.chat.completions.create({
          model: AI_CONFIG.model,
          messages: [
            { role: 'system', content: systemMessage + '\n\nBased on the tool results above, provide a clear, concise analysis summary for the user. Do NOT output any tool calls - just provide the analysis.' },
            ...this.conversationHistory,
            { role: 'user', content: 'Please summarize the analysis results above in a clear, helpful way.' },
          ],
        });

        const summaryChoice = summaryResponse.choices[0];
        const summaryMessage = this.cleanResponseMessage(summaryChoice.message.content || '');
        
        this.conversationHistory.push({
          role: 'assistant',
          content: summaryMessage,
        });

        return {
          message: summaryMessage,
          toolCalls,
          visualizations,
        };
      }

      return {
        message: this.cleanResponseMessage(assistantMessage.content || ''),
        toolCalls: [],
        visualizations: [],
      };
    } catch (error) {
      console.error('AI sendMessage error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw this.createError(
            'TIMEOUT',
            'AI is taking longer than expected. Please try again.',
            true
          );
        }
        if (error.message.includes('rate limit')) {
          throw this.createError(
            'API_ERROR',
            'Too many requests. Please wait a moment.',
            true
          );
        }
      }

      throw this.createError(
        'API_ERROR',
        'Unable to complete the request. Please try again.',
        true
      );
    }
  }

  /**
   * Build system message with context
   */
  private buildSystemMessage(context?: ChatContext): string {
    let systemMessage = `You are a maritime AI assistant for the Smart AIS system. 
You help users query vessel information, analyze collision risks, understand maritime traffic, and provide weather/sea conditions data.

IMPORTANT: Use plain text only. Do NOT use emojis or pictographic Unicode characters in your responses. The terminal interface requires ASCII-compatible text only.

You have access to tools to:
- Look up vessel information by MMSI or IMO number
- Find vessels near a location
- Analyze collision risks between vessels (enhanced with Rate of Turn data)
- Analyze vessel behavior patterns (transiting, anchored, fishing, maneuvering, etc.)
- Perform comprehensive navigation safety analysis (combines collision risk, weather impact, and vessel status)
- Get current sea conditions (wind, waves, visibility, temperature) at any location or vessel position
- Get weather forecasts for maritime locations

When users ask about safety, navigation risks, or voyage planning, use the analyzeNavigationSafety tool for comprehensive analysis.
When users ask about vessels, weather, or sea conditions, use the appropriate tools to get accurate data.
Be concise and helpful in your responses.`;

    if (context) {
      systemMessage += `\n\nCurrent context:`;
      systemMessage += `\n- Total vessels in view: ${context.vessels.size}`;
      if (context.selectedVessel) {
        systemMessage += `\n- Selected vessel MMSI: ${context.selectedVessel}`;
      }
      systemMessage += `\n- Map bounds: ${JSON.stringify(context.mapBounds)}`;
    }

    return systemMessage;
  }

  /**
   * Get available tool definitions
   */
  public getAvailableTools(): ToolDefinition[] {
    return [
      {
        name: 'lookupVessel',
        description: 'Look up vessel information by MMSI (9-digit Maritime Mobile Service Identity) or IMO number (7-digit International Maritime Organization number). Returns vessel details including name, type, position, speed, and course.',
        parameters: {
          type: 'object',
          properties: {
            mmsi: {
              type: 'string',
              description: 'The 9-digit MMSI identifier of the vessel (use this OR imo, not both)',
              pattern: '^\\d{9}$',
            },
            imo: {
              type: 'string',
              description: 'The 7-digit IMO number of the vessel (use this OR mmsi, not both)',
              pattern: '^\\d{7}$',
            },
          },
          required: [],
        },
      },
      {
        name: 'findNearbyVessels',
        description: 'Find all vessels within a specified radius of a geographic location. Returns vessels with their distances and bearings from the search point.',
        parameters: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Latitude of the search center in decimal degrees',
              minimum: -90,
              maximum: 90,
            },
            longitude: {
              type: 'number',
              description: 'Longitude of the search center in decimal degrees',
              minimum: -180,
              maximum: 180,
            },
            radiusNm: {
              type: 'number',
              description: 'Search radius in nautical miles',
              minimum: 0.1,
              maximum: 500,
            },
          },
          required: ['latitude', 'longitude', 'radiusNm'],
        },
      },
      {
        name: 'analyzeCollisionRisk',
        description: 'Analyze potential collision risks between vessels by calculating CPA (Closest Point of Approach) and TCPA (Time to CPA). Enhanced with Rate of Turn data for more accurate predictions.',
        parameters: {
          type: 'object',
          properties: {
            mmsi: {
              type: 'string',
              description: 'Optional: MMSI of specific vessel to analyze. If omitted, analyzes all vessels.',
              pattern: '^\\d{9}$',
            },
            cpaThresholdNm: {
              type: 'number',
              description: 'CPA threshold in nautical miles (default: 0.5)',
              minimum: 0.1,
              maximum: 10,
            },
            tcpaThresholdMin: {
              type: 'number',
              description: 'TCPA threshold in minutes (default: 30)',
              minimum: 1,
              maximum: 120,
            },
          },
          required: [],
        },
      },
      {
        name: 'analyzeVesselBehavior',
        description: 'Analyze vessel behavior patterns based on navigational status, speed, and rate of turn. Classifies vessels as transiting, anchored, moored, fishing, maneuvering, drifting, or stationary.',
        parameters: {
          type: 'object',
          properties: {
            mmsi: {
              type: 'string',
              description: 'Optional: MMSI of specific vessel to analyze. If omitted, analyzes all vessels.',
              pattern: '^\\d{9}$',
            },
            behaviorType: {
              type: 'string',
              description: 'Filter by behavior type',
              enum: ['all', 'anchored', 'fishing', 'maneuvering', 'drifting'],
            },
          },
          required: [],
        },
      },
      {
        name: 'analyzeNavigationSafety',
        description: 'Comprehensive navigation safety analysis that combines collision risk assessment, weather/sea conditions impact, and vessel status. Returns overall risk level, specific safety factors, and actionable recommendations. Best tool for voyage planning and safety assessments.',
        parameters: {
          type: 'object',
          properties: {
            mmsi: {
              type: 'string',
              description: 'Optional: MMSI of specific vessel to analyze. If omitted, analyzes up to 20 vessels.',
              pattern: '^\\d{9}$',
            },
            includeWeather: {
              type: 'boolean',
              description: 'Include weather impact analysis (default: true)',
            },
          },
          required: [],
        },
      },
      {
        name: 'getSeaConditions',
        description: 'Get current sea and weather conditions at a specific location. Returns wind speed/direction (with Beaufort scale), wave height/period, visibility, sea state (Douglas scale), air and sea temperature, and atmospheric pressure. Can also get conditions at a vessel\'s current position by providing its MMSI.',
        parameters: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Latitude of the location in decimal degrees (-90 to 90). Required unless mmsi is provided.',
              minimum: -90,
              maximum: 90,
            },
            longitude: {
              type: 'number',
              description: 'Longitude of the location in decimal degrees (-180 to 180). Required unless mmsi is provided.',
              minimum: -180,
              maximum: 180,
            },
            mmsi: {
              type: 'string',
              description: 'Optional: MMSI of a vessel to get conditions at its current position. If provided, latitude/longitude are ignored.',
              pattern: '^\\d{9}$',
            },
          },
          required: [],
        },
      },
      {
        name: 'getWeatherForecast',
        description: 'Get weather forecast for a maritime location. Returns predicted wind, waves, visibility, and precipitation for the next 24-48 hours in 3-hour intervals. Useful for voyage planning.',
        parameters: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Latitude of the location in decimal degrees (-90 to 90)',
              minimum: -90,
              maximum: 90,
            },
            longitude: {
              type: 'number',
              description: 'Longitude of the location in decimal degrees (-180 to 180)',
              minimum: -180,
              maximum: 180,
            },
            hours: {
              type: 'number',
              description: 'Number of hours to forecast (default: 24, max: 144)',
              minimum: 3,
              maximum: 144,
            },
          },
          required: ['latitude', 'longitude'],
        },
      },
    ];
  }

  /**
   * Convert tool definition to OpenAI format
   */
  private toolToOpenAIFormat(tool: ToolDefinition): OpenAI.Chat.ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    };
  }

  /**
   * Execute a tool call
   * Requirements: 11.3, 11.4
   */
  private async executeToolCall(
    toolCall: OpenAI.Chat.ChatCompletionMessageToolCall,
    context?: ChatContext
  ): Promise<ToolCallResult> {
    // Type guard to ensure we have a function tool call
    if (toolCall.type !== 'function') {
      return {
        tool: 'unknown',
        input: {},
        output: { message: 'Unsupported tool call type' },
        success: false,
        error: 'Unsupported tool call type',
      };
    }

    const toolName = toolCall.function.name;
    let toolArgs: Record<string, unknown>;

    try {
      toolArgs = JSON.parse(toolCall.function.arguments);
    } catch (error) {
      console.error(`Failed to parse tool arguments for ${toolName}:`, error);
      return {
        tool: toolName,
        input: {},
        output: { message: 'Invalid tool arguments' },
        success: false,
        error: 'Failed to parse tool arguments',
      };
    }

    console.log(`Executing tool: ${toolName}`, toolArgs);

    // Ensure we have context with vessels
    if (!context || !context.vessels) {
      return {
        tool: toolName,
        input: toolArgs,
        output: { message: 'No vessel data available' },
        success: false,
        error: 'Context with vessel data is required',
      };
    }

    try {
      // Execute the appropriate tool
      switch (toolName) {
        case 'lookupVessel': {
          const input = toolArgs as unknown as LookupVesselInput;
          const output = await lookupVessel(input, context.vessels);
          return {
            tool: toolName,
            input: toolArgs,
            output: output as unknown as Record<string, unknown>,
            success: output.found,
            error: output.error,
          };
        }

        case 'findNearbyVessels': {
          const input = toolArgs as unknown as FindNearbyVesselsInput;
          const output = findNearbyVessels(input, context.vessels);
          return {
            tool: toolName,
            input: toolArgs,
            output: output as unknown as Record<string, unknown>,
            success: true,
          };
        }

        case 'analyzeCollisionRisk': {
          const input = toolArgs as unknown as AnalyzeCollisionRiskInput;
          const output = analyzeCollisionRisk(input, context.vessels);
          return {
            tool: toolName,
            input: toolArgs,
            output: output as unknown as Record<string, unknown>,
            success: true,
          };
        }

        case 'analyzeVesselBehavior': {
          const input = toolArgs as { mmsi?: string; behaviorType?: string };
          const output = analyzeVesselBehavior(input, context.vessels);
          return {
            tool: toolName,
            input: toolArgs,
            output: output as unknown as Record<string, unknown>,
            success: true,
          };
        }

        case 'analyzeNavigationSafety': {
          const input = toolArgs as unknown as AnalyzeNavigationSafetyInput;
          const output = analyzeNavigationSafety(input, context.vessels);
          return {
            tool: toolName,
            input: toolArgs,
            output: output as unknown as Record<string, unknown>,
            success: output.success,
            error: output.error,
          };
        }

        case 'getSeaConditions': {
          const input = toolArgs as unknown as GetSeaConditionsInput;
          const output = getSeaConditions(input, context.vessels);
          return {
            tool: toolName,
            input: toolArgs,
            output: output as unknown as Record<string, unknown>,
            success: output.success,
            error: output.error,
          };
        }

        case 'getWeatherForecast': {
          const input = toolArgs as unknown as GetWeatherForecastInput;
          const output = getWeatherForecast(input);
          return {
            tool: toolName,
            input: toolArgs,
            output: output as unknown as Record<string, unknown>,
            success: output.success,
            error: output.error,
          };
        }

        default:
          return {
            tool: toolName,
            input: toolArgs,
            output: { message: `Unknown tool: ${toolName}` },
            success: false,
            error: `Tool ${toolName} is not implemented`,
          };
      }
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      return {
        tool: toolName,
        input: toolArgs,
        output: { message: 'Tool execution failed' },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate map visualizations from tool results
   * Requirements: 8.3, 8.5, 9.3
   */
  private generateVisualizationsFromToolResult(
    toolResult: ToolCallResult
  ): MapVisualization[] {
    const visualizations: MapVisualization[] = [];

    if (!toolResult.success) {
      return visualizations;
    }

    try {
      switch (toolResult.tool) {
        case 'findNearbyVessels': {
          const output = toolResult.output as unknown as FindNearbyVesselsOutput;
          
          // Create circle visualization for search radius
          const radiusMeters = output.searchRadiusNm * 1852; // Convert nautical miles to meters
          
          visualizations.push({
            id: `search-radius-${Date.now()}`,
            type: 'circle',
            data: {
              center: {
                latitude: output.searchCenter.latitude,
                longitude: output.searchCenter.longitude,
              },
              radiusMeters,
            },
            style: {
              color: '#3b82f6', // Blue
              opacity: 0.6,
              weight: 2,
              fillColor: '#3b82f6',
              fillOpacity: 0.1,
            },
            label: `Search radius: ${output.searchRadiusNm} nm`,
          });
          break;
        }

        case 'analyzeCollisionRisk': {
          const output = toolResult.output as unknown as AnalyzeCollisionRiskOutput;
          
          // Create visualizations for each collision risk
          output.risks.forEach((risk, index) => {
            // Vessel 1 path
            if (risk.vessel1Path && risk.vessel1Path.length > 0) {
              visualizations.push({
                id: `collision-path-v1-${Date.now()}-${index}`,
                type: 'line',
                data: {
                  points: risk.vessel1Path,
                },
                style: {
                  color: '#ef4444', // Red
                  opacity: 0.8,
                  weight: 3,
                },
                label: `${risk.vessel1.name} projected path`,
              });
            }

            // Vessel 2 path
            if (risk.vessel2Path && risk.vessel2Path.length > 0) {
              visualizations.push({
                id: `collision-path-v2-${Date.now()}-${index}`,
                type: 'line',
                data: {
                  points: risk.vessel2Path,
                },
                style: {
                  color: '#f59e0b', // Amber
                  opacity: 0.8,
                  weight: 3,
                },
                label: `${risk.vessel2.name} projected path`,
              });
            }

            // CPA point marker - terminal style without emoji
            visualizations.push({
              id: `cpa-point-${Date.now()}-${index}`,
              type: 'point',
              data: {
                position: {
                  latitude: risk.cpaPoint.latitude,
                  longitude: risk.cpaPoint.longitude,
                },
                icon: 'CPA',
              },
              style: {
                color: '#ef4444', // Red
                opacity: 1,
              },
              label: `CPA: ${risk.cpaNm} nm in ${risk.tcpaMinutes} min`,
            });
          });
          break;
        }

        default:
          // No visualizations for other tools
          break;
      }
    } catch (error) {
      console.error('Error generating visualizations from tool result:', error);
    }

    return visualizations;
  }

  /**
   * Parse text-based tool calls from message content
   * Some models output tool calls as text instead of using proper API format
   */
  private parseTextToolCalls(content: string): Array<{ name: string; args: Record<string, unknown> }> {
    const toolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
    
    if (!content) return toolCalls;

    // Pattern 1: functions.toolName:N<|tool_call_argument_begin|>{...}<|tool_call_argument_end|>
    const pattern1 = /functions\.(\w+):\d+<\|tool_call_argument_begin\|>(\{[\s\S]*?\})<\|tool_call_argument_end\|>/g;
    let match1: RegExpExecArray | null;
    
    while ((match1 = pattern1.exec(content)) !== null) {
      try {
        const args = JSON.parse(match1[2]);
        toolCalls.push({ name: match1[1], args });
      } catch (e) {
        console.error('Failed to parse tool call arguments:', e);
      }
    }

    // Pattern 2: <|tool_call_begin|>functions.toolName:N<|tool_call_argument_begin|>{...}<|tool_call_argument_end|><|tool_call_end|>
    const pattern2 = /<\|tool_call_begin\|>functions\.(\w+):\d+<\|tool_call_argument_begin\|>(\{[\s\S]*?\})<\|tool_call_argument_end\|><\|tool_call_end\|>/g;
    let match2: RegExpExecArray | null;
    
    while ((match2 = pattern2.exec(content)) !== null) {
      try {
        const args = JSON.parse(match2[2]);
        const toolName = match2[1];
        // Avoid duplicates
        if (!toolCalls.some(tc => tc.name === toolName && JSON.stringify(tc.args) === JSON.stringify(args))) {
          toolCalls.push({ name: toolName, args });
        }
      } catch (e) {
        console.error('Failed to parse tool call arguments:', e);
      }
    }

    // Pattern 3: Look for findVesselsNearLocation which maps to findNearbyVessels
    const pattern3 = /findVesselsNearLocation[^{]*(\{[^}]+\})/g;
    let match3: RegExpExecArray | null;
    while ((match3 = pattern3.exec(content)) !== null) {
      try {
        const args = JSON.parse(match3[1]);
        // Convert findVesselsNearLocation args to findNearbyVessels format
        if (args.minLat !== undefined && args.maxLat !== undefined) {
          const centerLat = (args.minLat + args.maxLat) / 2;
          const centerLon = (args.minLon + args.maxLon) / 2;
          const radiusNm = Math.max(
            Math.abs(args.maxLat - args.minLat) * 60 / 2,
            Math.abs(args.maxLon - args.minLon) * 60 * Math.cos(centerLat * Math.PI / 180) / 2
          );
          toolCalls.push({
            name: 'findNearbyVessels',
            args: { latitude: centerLat, longitude: centerLon, radiusNm: Math.max(radiusNm, 5) }
          });
        }
      } catch (e) {
        console.error('Failed to parse findVesselsNearLocation arguments:', e);
      }
    }

    return toolCalls;
  }

  /**
   * Execute a text-based tool call
   */
  private async executeTextToolCall(
    toolCall: { name: string; args: Record<string, unknown> },
    context: ChatContext
  ): Promise<ToolCallResult> {
    const { name: toolName, args: toolArgs } = toolCall;
    
    console.log(`Executing text tool call: ${toolName}`, toolArgs);

    if (!context.vessels) {
      return {
        tool: toolName,
        input: toolArgs,
        output: { message: 'No vessel data available' },
        success: false,
        error: 'Context with vessel data is required',
      };
    }

    try {
      switch (toolName) {
        case 'lookupVessel': {
          const input = toolArgs as unknown as LookupVesselInput;
          const output = await lookupVessel(input, context.vessels);
          return {
            tool: toolName,
            input: toolArgs,
            output: output as unknown as Record<string, unknown>,
            success: output.found,
            error: output.error,
          };
        }

        case 'findNearbyVessels': {
          const input = toolArgs as unknown as FindNearbyVesselsInput;
          const output = findNearbyVessels(input, context.vessels);
          return {
            tool: toolName,
            input: toolArgs,
            output: output as unknown as Record<string, unknown>,
            success: true,
          };
        }

        case 'analyzeCollisionRisk': {
          const input = toolArgs as unknown as AnalyzeCollisionRiskInput;
          const output = analyzeCollisionRisk(input, context.vessels);
          return {
            tool: toolName,
            input: toolArgs,
            output: output as unknown as Record<string, unknown>,
            success: true,
          };
        }

        case 'analyzeVesselBehavior': {
          const input = toolArgs as { mmsi?: string; behaviorType?: string };
          const output = analyzeVesselBehavior(input, context.vessels);
          return {
            tool: toolName,
            input: toolArgs,
            output: output as unknown as Record<string, unknown>,
            success: true,
          };
        }

        case 'analyzeNavigationSafety': {
          const input = toolArgs as unknown as AnalyzeNavigationSafetyInput;
          const output = analyzeNavigationSafety(input, context.vessels);
          return {
            tool: toolName,
            input: toolArgs,
            output: output as unknown as Record<string, unknown>,
            success: output.success,
            error: output.error,
          };
        }

        case 'getSeaConditions': {
          const input = toolArgs as unknown as GetSeaConditionsInput;
          const output = getSeaConditions(input, context.vessels);
          return {
            tool: toolName,
            input: toolArgs,
            output: output as unknown as Record<string, unknown>,
            success: output.success,
            error: output.error,
          };
        }

        case 'getWeatherForecast': {
          const input = toolArgs as unknown as GetWeatherForecastInput;
          const output = getWeatherForecast(input);
          return {
            tool: toolName,
            input: toolArgs,
            output: output as unknown as Record<string, unknown>,
            success: output.success,
            error: output.error,
          };
        }

        default:
          return {
            tool: toolName,
            input: toolArgs,
            output: { message: `Unknown tool: ${toolName}` },
            success: false,
            error: `Tool ${toolName} is not implemented`,
          };
      }
    } catch (error) {
      console.error(`Error executing text tool ${toolName}:`, error);
      return {
        tool: toolName,
        input: toolArgs,
        output: { message: 'Tool execution failed' },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clean response message by removing raw tool call syntax and emojis
   * Some models output tool calls as text instead of using proper API format
   */
  private cleanResponseMessage(message: string): string {
    if (!message) return message;
    
    // Remove raw tool call syntax patterns that some models output as text
    // Pattern: <|tool_calls_section_begin|>...<|tool_calls_section_end|>
    let cleaned = message.replace(
      /<\|tool_calls_section_begin\|>[\s\S]*?<\|tool_calls_section_end\|>/g,
      ''
    );
    
    // Pattern: <|tool_call_begin|>...<|tool_call_end|>
    cleaned = cleaned.replace(
      /<\|tool_call_begin\|>[\s\S]*?<\|tool_call_end\|>/g,
      ''
    );
    
    // Pattern: functions.toolName:...<|tool_call_argument_begin|>...<|tool_call_argument_end|>
    cleaned = cleaned.replace(
      /functions\.\w+:\d+<\|tool_call_argument_begin\|>[\s\S]*?<\|tool_call_argument_end\|>/g,
      ''
    );
    
    // Remove any remaining tool call markers
    cleaned = cleaned.replace(/<\|tool_call[^|]*\|>/g, '');
    cleaned = cleaned.replace(/<\|tool_calls[^|]*\|>/g, '');
    
    // Remove emojis and pictographic Unicode characters for terminal compatibility
    // This regex matches emoji ranges including supplementary characters
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{231A}\u{231B}\u{2328}\u{23CF}\u{23E9}-\u{23FF}\u{24C2}\u{25AA}\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2600}-\u{2604}\u{260E}\u{2611}\u{2614}\u{2615}\u{2618}\u{261D}\u{2620}\u{2622}\u{2623}\u{2626}\u{262A}\u{262E}\u{262F}\u{2638}-\u{263A}\u{2640}\u{2642}\u{2648}-\u{2653}\u{2660}\u{2663}\u{2665}\u{2666}\u{2668}\u{267B}\u{267F}\u{2692}-\u{2697}\u{2699}\u{269B}\u{269C}\u{26A0}\u{26A1}\u{26AA}\u{26AB}\u{26B0}\u{26B1}\u{26BD}\u{26BE}\u{26C4}\u{26C5}\u{26C8}\u{26CE}\u{26CF}\u{26D1}\u{26D3}\u{26D4}\u{26E9}\u{26EA}\u{26F0}-\u{26F5}\u{26F7}-\u{26FA}\u{26FD}\u{2702}\u{2705}\u{2708}-\u{270D}\u{270F}\u{2712}\u{2714}\u{2716}\u{271D}\u{2721}\u{2728}\u{2733}\u{2734}\u{2744}\u{2747}\u{274C}\u{274E}\u{2753}-\u{2755}\u{2757}\u{2763}\u{2764}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27BF}\u{2934}\u{2935}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]/gu, '');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    // If the message is now empty after cleaning, provide a default response
    if (!cleaned) {
      return 'I\'m analyzing the vessel data. Please wait for the results...';
    }
    
    return cleaned;
  }

  /**
   * Clear conversation history
   */
  public clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Create an AI error
   */
  private createError(
    code: AIError['code'],
    message: string,
    recoverable: boolean
  ): AIError {
    return {
      code,
      message,
      recoverable,
    };
  }
}

// Export singleton instance
export const aiService = new AIService();
