import Anthropic from '@anthropic-ai/sdk';

import { logger } from '../../utils/logger.js';
import {
  CircuitBreaker,
  DEFAULT_RETRY_CONFIG,
  LLMError,
  RetryConfig,
  withRetry,
  withTimeout,
} from './LLMErrorHandler.js';
import {
  LLMMessage,
  LLMOptions,
  LLMProvider,
  LLMResult,
  ToolCall,
  ToolDefinition,
} from './types.js';

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

export class AnthropicLLMProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;
  private circuitBreaker: CircuitBreaker;
  private retryConfig: RetryConfig;
  private timeoutMs: number;

  constructor(
    apiKey: string,
    model = 'claude-3-haiku-20240307',
    options?: {
      retryConfig?: Partial<RetryConfig>;
      timeoutMs?: number;
      circuitBreaker?: CircuitBreaker;
    },
  ) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options?.retryConfig };
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.circuitBreaker = options?.circuitBreaker ?? new CircuitBreaker();
  }

  async complete(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResult> {
    const startTime = Date.now();

    // Use circuit breaker and retry logic
    return this.circuitBreaker.execute(() =>
      withRetry(
        () => withTimeout(this.executeRequest(messages, options, startTime), this.timeoutMs),
        this.retryConfig,
      ),
    );
  }

  private async executeRequest(
    messages: LLMMessage[],
    options: LLMOptions | undefined,
    startTime: number,
  ): Promise<LLMResult> {
    try {
      // Separate system message from conversation
      const systemMessage = messages.find((m) => m.role === 'system');
      const conversationMessages = messages.filter((m) => m.role !== 'system');

      // Convert to Anthropic format
      const anthropicMessages = conversationMessages.map((m) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
      }));

      // Build request
      const requestParams: Anthropic.MessageCreateParamsNonStreaming = {
        model: this.model,
        max_tokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.7,
        system: systemMessage?.content,
        messages: anthropicMessages,
      };

      // Add tools if provided
      if (options?.tools && options.tools.length > 0) {
        requestParams.tools = options.tools.map((t) => ({
          name: t.function.name,
          description: t.function.description,
          input_schema: t.function.parameters as Anthropic.Tool.InputSchema,
        }));
      }

      const response = await this.client.messages.create(requestParams);

      const duration = Date.now() - startTime;

      // Extract content and tool calls
      let content = '';
      const toolCalls: ToolCall[] = [];

      for (const block of response.content) {
        if (block.type === 'text') {
          content += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            type: 'function',
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input),
            },
          });
        }
      }

      logger.debug(
        {
          duration,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          toolCalls: toolCalls.length,
        },
        'anthropic completion',
      );

      return {
        content,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason: response.stop_reason === 'tool_use' ? 'tool_calls' : 'stop',
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        metadata: {
          provider: 'anthropic',
          model: this.model,
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'anthropic completion failed');
      throw LLMError.fromError(error);
    }
  }

  async close(): Promise<void> {
    // Anthropic client doesn't require explicit cleanup
  }
}
