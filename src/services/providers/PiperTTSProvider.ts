import { logger } from '../../utils/logger.js';
import { TTSProvider, TTSResult } from './types.js';

type PiperJsonResponse = {
  audio?: string;
  format?: string;
};

export class PiperTTSProvider implements TTSProvider {
  private baseUrl: string;
  private voice: string;
  private format: string;

  constructor(baseUrl: string, voice: string, format: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.voice = voice;
    this.format = format;
  }

  async synthesize(text: string): Promise<TTSResult> {
    try {
      const response = await fetch(`${this.baseUrl}/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: this.voice, format: this.format }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Piper TTS error: ${response.status} ${errorText}`);
      }

      const contentType = response.headers.get('content-type') ?? '';
      let audioBuffer: Buffer;

      if (contentType.includes('application/json')) {
        const data = (await response.json()) as PiperJsonResponse;
        if (!data.audio) {
          throw new Error('Piper TTS response missing audio data');
        }
        audioBuffer = Buffer.from(data.audio, 'base64');
      } else {
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = Buffer.from(arrayBuffer);
      }

      logger.debug({ voice: this.voice, format: this.format }, 'piper tts synthesis completed');

      return {
        audio: audioBuffer,
        metadata: {
          provider: 'piper',
          voice: this.voice,
          format: this.format,
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'piper tts synthesis failed');
      throw error;
    }
  }

  async close(): Promise<void> {
    // No cleanup needed
  }
}
