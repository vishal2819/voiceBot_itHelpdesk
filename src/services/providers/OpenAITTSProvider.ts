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

  // OpenAI TTS returns PCM audio at 24kHz, 16-bit mono
  static readonly SAMPLE_RATE = 24000;
  static readonly CHANNELS = 1;
  static readonly BITS_PER_SAMPLE = 16;

  async synthesize(text: string): Promise<TTSResult> {
    const startTime = Date.now();

    try {
      const response = await this.client.audio.speech.create({
        model: this.model,
        voice: this.voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
        input: text,
        response_format: 'pcm', // Raw PCM: 24kHz, 16-bit signed little-endian mono
      });

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const duration = Date.now() - startTime;

      logger.debug(
        { duration, textLength: text.length, audioSize: audioBuffer.length, format: 'pcm_24khz_16bit_mono' },
        'openai tts synthesis completed',
      );

      return {
        audio: audioBuffer,
        duration,
        metadata: {
          provider: 'openai',
          model: this.model,
          voice: this.voice,
          sampleRate: OpenAITTSProvider.SAMPLE_RATE,
          channels: OpenAITTSProvider.CHANNELS,
          format: 'pcm',
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
