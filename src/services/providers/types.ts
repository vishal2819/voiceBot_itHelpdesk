/**
 * Speech-to-Text provider interface
 */
export interface STTProvider {
  transcribe(audioBuffer: Buffer): Promise<STTResult>;
  close(): Promise<void>;
}

export interface STTResult {
  text: string;
  confidence?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Text-to-Speech provider interface
 */
export interface TTSProvider {
  synthesize(text: string): Promise<TTSResult>;
  close(): Promise<void>;
}

export interface TTSResult {
  audio: Buffer;
  duration?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Language Model provider interface
 */
export interface LLMProvider {
  complete(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResult>;
  close(): Promise<void>;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'required' | { type: 'function'; function: { name: string } };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMResult {
  content: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, unknown>;
}
