import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z.string().min(1),
  LIVEKIT_URL: z.string().url(),
  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(1),
  STT_PROVIDER: z.enum(['deepgram', 'openai', 'whispercpp']).default('whispercpp'),
  STT_MODEL: z.string().default('base'),
  DEEPGRAM_API_KEY: z.string().optional(),
  WHISPER_BASE_URL: z.string().default('http://whispercpp:9000'),
  WHISPER_API_STYLE: z.enum(['whispercpp', 'openai', 'onerahmet']).default('openai'),
  WHISPER_MODEL: z.string().default('base'),
  LLM_PROVIDER: z.enum(['anthropic', 'openai', 'ollama']).default('ollama'),
  LLM_MODEL: z.string().default('llama3.1'),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().default('http://ollama:11434'),
  OLLAMA_MODEL: z.string().default('llama3.1'),
  TTS_PROVIDER: z.enum(['openai', 'elevenlabs', 'piper']).default('piper'),
  TTS_MODEL: z.string().default('tts-1'),
  OPENAI_TTS_VOICE: z.string().default('alloy'),
  PIPER_BASE_URL: z.string().default('http://piper:5002'),
  PIPER_VOICE: z.string().default('en_US-lessac'),
  PIPER_AUDIO_FORMAT: z.enum(['wav', 'mp3']).default('wav'),
  COST_TRACKING_ENABLED: z.coerce.boolean().default(true),
  USAGE_LIMITS_ENABLED: z.coerce.boolean().default(true),
});

export type AppConfig = z.infer<typeof envSchema>;

export const loadEnv = (): AppConfig => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join(', ');
    throw new Error(`Invalid environment configuration: ${message}`);
  }
  return parsed.data;
};
