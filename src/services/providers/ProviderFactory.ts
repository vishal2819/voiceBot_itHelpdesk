import { loadEnv } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

import { AnthropicLLMProvider } from './AnthropicLLMProvider.js';
import { DeepgramSTTProvider } from './DeepgramSTTProvider.js';
import { ElevenLabsTTSProvider } from './ElevenLabsTTSProvider.js';
import { OllamaLLMProvider } from './OllamaLLMProvider.js';
import { OpenAITTSProvider } from './OpenAITTSProvider.js';
import { PiperTTSProvider } from './PiperTTSProvider.js';
import { WhisperCppSTTProvider } from './WhisperCppSTTProvider.js';
import { LLMProvider, STTProvider, TTSProvider } from './types.js';

/**
 * Provider factory for creating STT, LLM, and TTS instances
 * Supports easy switching between providers via environment config
 */
export class ProviderFactory {
  private static config = loadEnv();

  /**
   * Create STT provider based on configuration
   */
  static createSTTProvider(): STTProvider {
    const provider = this.config.STT_PROVIDER;

    switch (provider) {
      case 'deepgram':
        if (!this.config.DEEPGRAM_API_KEY) {
          throw new Error('DEEPGRAM_API_KEY is required for Deepgram STT');
        }
        logger.info('initializing Deepgram STT provider');
        return new DeepgramSTTProvider(this.config.DEEPGRAM_API_KEY);

      case 'openai':
        if (!this.config.OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY is required for OpenAI STT');
        }
        logger.info('initializing OpenAI Whisper STT provider (not implemented)');
        throw new Error('OpenAI STT provider not implemented yet');

      case 'whispercpp':
        logger.info(
          { baseUrl: this.config.WHISPER_BASE_URL, apiStyle: this.config.WHISPER_API_STYLE },
          'initializing Whisper.cpp STT provider',
        );
        return new WhisperCppSTTProvider(
          this.config.WHISPER_BASE_URL,
          this.config.WHISPER_MODEL,
          this.config.WHISPER_API_STYLE,
        );

      default:
        throw new Error(`Unsupported STT provider: ${provider}`);
    }
  }

  /**
   * Create LLM provider based on configuration
   */
  static createLLMProvider(): LLMProvider {
    const provider = this.config.LLM_PROVIDER;

    switch (provider) {
      case 'anthropic':
        if (!this.config.ANTHROPIC_API_KEY) {
          throw new Error('ANTHROPIC_API_KEY is required for Anthropic LLM');
        }
        logger.info({ model: this.config.LLM_MODEL }, 'initializing Anthropic LLM provider');
        return new AnthropicLLMProvider(this.config.ANTHROPIC_API_KEY, this.config.LLM_MODEL);

      case 'openai':
        if (!this.config.OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY is required for OpenAI LLM');
        }
        logger.info('initializing OpenAI LLM provider (not implemented)');
        throw new Error('OpenAI LLM provider not implemented yet');

      case 'ollama':
        logger.info(
          { model: this.config.OLLAMA_MODEL, baseUrl: this.config.OLLAMA_BASE_URL },
          'initializing Ollama LLM provider',
        );
        return new OllamaLLMProvider(this.config.OLLAMA_BASE_URL, this.config.OLLAMA_MODEL);

      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  /**
   * Create TTS provider based on configuration
   */
  static createTTSProvider(): TTSProvider {
    const provider = this.config.TTS_PROVIDER;

    switch (provider) {
      case 'openai':
        if (!this.config.OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY is required for OpenAI TTS');
        }
        logger.info(
          { model: this.config.TTS_MODEL, voice: this.config.OPENAI_TTS_VOICE },
          'initializing OpenAI TTS provider',
        );
        return new OpenAITTSProvider(
          this.config.OPENAI_API_KEY,
          this.config.TTS_MODEL,
          this.config.OPENAI_TTS_VOICE,
        );

      case 'elevenlabs':
        if (!this.config.ELEVENLABS_API_KEY) {
          throw new Error('ELEVENLABS_API_KEY is required for ElevenLabs TTS');
        }
        logger.info(
          { voice: this.config.ELEVENLABS_VOICE_ID, model: this.config.ELEVENLABS_MODEL_ID },
          'initializing ElevenLabs TTS provider',
        );
        return new ElevenLabsTTSProvider(
          this.config.ELEVENLABS_API_KEY,
          this.config.ELEVENLABS_VOICE_ID,
          this.config.ELEVENLABS_MODEL_ID,
        );

      case 'piper':
        logger.info(
          { baseUrl: this.config.PIPER_BASE_URL, voice: this.config.PIPER_VOICE },
          'initializing Piper TTS provider',
        );
        return new PiperTTSProvider(
          this.config.PIPER_BASE_URL,
          this.config.PIPER_VOICE,
          this.config.PIPER_AUDIO_FORMAT,
        );

      default:
        throw new Error(`Unsupported TTS provider: ${provider}`);
    }
  }

  /**
   * Create all providers at once
   */
  static createAllProviders(): {
    stt: STTProvider;
    llm: LLMProvider;
    tts: TTSProvider;
  } {
    return {
      stt: this.createSTTProvider(),
      llm: this.createLLMProvider(),
      tts: this.createTTSProvider(),
    };
  }
}
