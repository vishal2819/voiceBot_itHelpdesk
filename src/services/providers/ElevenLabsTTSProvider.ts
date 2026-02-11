import { logger } from '../../utils/logger.js';
import { TTSProvider, TTSResult } from './types.js';

export class ElevenLabsTTSProvider implements TTSProvider {
  private apiKey: string;
  private voiceId: string;
  private modelId: string;

  // ElevenLabs outputs 24kHz 16-bit mono PCM when using pcm_24000
  static readonly SAMPLE_RATE = 24000;
  static readonly CHANNELS = 1;
  static readonly BITS_PER_SAMPLE = 16;

  constructor(apiKey: string, voiceId = '21m00Tcm4TlvDq8ikWAM', modelId = 'eleven_turbo_v2_5') {
    this.apiKey = apiKey;
    this.voiceId = voiceId;
    this.modelId = modelId;
  }

  async synthesize(text: string): Promise<TTSResult> {
    const startTime = Date.now();

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}?output_format=pcm_24000`,
        {
          method: 'POST',
          headers: {
            Accept: 'audio/pcm',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: this.modelId,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      const duration = Date.now() - startTime;

      logger.debug(
        {
          duration,
          textLength: text.length,
          audioSize: audioBuffer.length,
          format: 'pcm_24khz_16bit_mono',
        },
        'elevenlabs tts synthesis completed',
      );

      return {
        audio: audioBuffer,
        duration,
        metadata: {
          provider: 'elevenlabs',
          model: this.modelId,
          voice: this.voiceId,
          sampleRate: ElevenLabsTTSProvider.SAMPLE_RATE,
          channels: ElevenLabsTTSProvider.CHANNELS,
          format: 'pcm',
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'elevenlabs tts synthesis failed');
      throw error;
    }
  }

  async close(): Promise<void> {
    // ElevenLabs client doesn't require explicit cleanup
  }
}
