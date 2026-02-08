import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

import { logger } from '../../utils/logger.js';
import { STTProvider, STTResult } from './types.js';

export class DeepgramSTTProvider implements STTProvider {
  private client;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = createClient(apiKey);
  }

  async transcribe(audioBuffer: Buffer): Promise<STTResult> {
    const startTime = Date.now();

    try {
      const { result, error } = await this.client.listen.prerecorded.transcribeFile(audioBuffer, {
        model: 'nova-2',
        smart_format: true,
        punctuate: true,
      });

      if (error) {
        throw new Error(`Deepgram transcription error: ${error.message}`);
      }

      const transcript = result.results.channels[0]?.alternatives[0];
      if (!transcript) {
        throw new Error('No transcription result');
      }

      const duration = Date.now() - startTime;

      logger.debug(
        { duration, confidence: transcript.confidence, textLength: transcript.transcript.length },
        'deepgram transcription completed',
      );

      return {
        text: transcript.transcript,
        confidence: transcript.confidence,
        duration,
        metadata: {
          provider: 'deepgram',
          model: 'nova-2',
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'deepgram transcription failed');
      throw error;
    }
  }

  async close(): Promise<void> {
    // Deepgram client doesn't require explicit cleanup
  }
}
