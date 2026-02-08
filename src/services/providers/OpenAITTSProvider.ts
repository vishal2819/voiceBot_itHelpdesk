import OpenAI from 'openai';

import { logger } from '../../utils/logger.js';
import { TTSProvider, TTSResult } from './types.js';

export class OpenAITTSProvider implements TTSProvider {
  private client: OpenAI;
  private model: string;
  private voice: string;

  constructor(apiKey: string, model = 'tts-1', voice = 'alloy') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.voice = voice;
  }

  async synthesize(text: string): Promise<TTSResult> {
    const startTime = Date.now();

    try {
      const response = await this.client.audio.speech.create({
        model: this.model,
        voice: this.voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
        input: text,
        response_format: 'mp3',
      });

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const duration = Date.now() - startTime;

      logger.debug(
        { duration, textLength: text.length, audioSize: audioBuffer.length },
        'openai tts synthesis completed',
      );

      return {
        audio: audioBuffer,
        duration,
        metadata: {
          provider: 'openai',
          model: this.model,
          voice: this.voice,
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'openai tts synthesis failed');
      throw error;
    }
  }

  async close(): Promise<void> {
    // OpenAI client doesn't require explicit cleanup
  }
}
