import { logger } from '../../utils/logger.js';
import { STTProvider, STTResult } from './types.js';

type WhisperCppResponse = {
  text?: string;
};

type OpenAIWhisperResponse = {
  text?: string;
};

export class WhisperCppSTTProvider implements STTProvider {
  private baseUrl: string;
  private model: string;
  private apiStyle: 'whispercpp' | 'openai';

  constructor(baseUrl: string, model: string, apiStyle: 'whispercpp' | 'openai') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
    this.apiStyle = apiStyle;
  }

  async transcribe(audioBuffer: Buffer): Promise<STTResult> {
    try {
      const wavBuffer = this.buildWavBuffer(audioBuffer, 16000, 1);
      const form = new FormData();
      form.append('file', new Blob([wavBuffer], { type: 'audio/wav' }), 'audio.wav');

      let url = `${this.baseUrl}/inference`;
      if (this.apiStyle === 'openai') {
        url = `${this.baseUrl}/v1/audio/transcriptions`;
        form.append('model', this.model);
      }

      const response = await fetch(url, {
        method: 'POST',
        body: form,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Whisper STT error: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as WhisperCppResponse | OpenAIWhisperResponse;
      const text = data.text ?? '';

      logger.debug({ provider: 'whispercpp', apiStyle: this.apiStyle }, 'whisper transcription completed');

      return {
        text,
        metadata: {
          provider: 'whispercpp',
          apiStyle: this.apiStyle,
          model: this.model,
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'whisper transcription failed');
      throw error;
    }
  }

  async close(): Promise<void> {
    // No cleanup needed
  }

  private buildWavBuffer(pcmBuffer: Buffer, sampleRate: number, channels: number): Buffer {
    const byteRate = sampleRate * channels * 2;
    const blockAlign = channels * 2;
    const dataSize = pcmBuffer.length;
    const headerSize = 44;
    const buffer = Buffer.alloc(headerSize + dataSize);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(16, 34); // bits per sample
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    pcmBuffer.copy(buffer, headerSize);
    return buffer;
  }
}
