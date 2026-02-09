import { logger } from '../../utils/logger.js';
import { LLMMessage, LLMOptions, LLMProvider, LLMResult, ToolCall } from './types.js';

type OllamaToolCall = {
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: Record<string, unknown> | string;
  };
};

type OllamaResponse = {
  message?: {
    content?: string;
    tool_calls?: OllamaToolCall[];
  };
  prompt_eval_count?: number;
  eval_count?: number;
  done_reason?: string;
};

export class OllamaLLMProvider implements LLMProvider {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
  }

  async complete(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResult> {
    try {
      const payload = {
        model: this.model,
        stream: false,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content,
          tool_calls: message.toolCalls,
        })),
        tools: options?.tools,
        options: {
          temperature: options?.temperature,
          num_predict: options?.maxTokens,
        },
      };

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama chat error: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as OllamaResponse;
      const content = data.message?.content ?? '';
      const toolCalls = this.normalizeToolCalls(data.message?.tool_calls ?? []);

      logger.debug(
        { model: this.model, toolCalls: toolCalls.length },
        'ollama completion completed',
      );

      return {
        content,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
        usage: {
          promptTokens: data.prompt_eval_count ?? 0,
          completionTokens: data.eval_count ?? 0,
          totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
        },
        metadata: {
          provider: 'ollama',
          model: this.model,
          doneReason: data.done_reason,
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'ollama completion failed');
      throw error;
    }
  }

  async close(): Promise<void> {
    // Ollama HTTP client doesn't require explicit cleanup
  }

  private normalizeToolCalls(toolCalls: OllamaToolCall[]): ToolCall[] {
    return toolCalls
      .map((call, index) => {
        let args = call.function?.arguments ?? '{}';
        if (typeof args !== 'string') {
            args = JSON.stringify(args);
        }
        
        return {
            id: call.id ?? `ollama-tool-${index}`,
            type: 'function' as const,
            function: {
            name: call.function?.name ?? 'unknown',
            arguments: args,
            },
        };
      })
      .filter((call) => call.function.name !== 'unknown');
  }
}
