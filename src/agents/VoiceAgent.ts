import { AudioFrame, AudioSource, AudioStream, LocalAudioTrack, Room, RoomEvent, Track, TrackKind } from '@livekit/rtc-node';
import { AccessToken } from 'livekit-server-sdk';

import { loadEnv } from '../config/env.js';
import { ConversationLogRepository } from '../data/repositories/ConversationLogRepository.js';
import { ConversationManager } from '../domain/conversation/ConversationManager.js';
import { ConversationState } from '../domain/conversation/state.js';
import { IssueClassifier } from '../domain/issue/IssueClassifier.js';
import { costTracker } from '../services/providers/CostTracker.js';
import { ProviderFactory } from '../services/providers/ProviderFactory.js';
import { getSystemPrompt } from '../services/prompts/systemPrompt.js';
import { toolDefinitions, ToolExecutor } from '../services/tools/ToolExecutor.js';
import { logger } from '../utils/logger.js';
import {
  extractEmail,
  extractPhone,
  validateAddress,
  validateEmail,
  validateIssue,
  validateName,
  validatePhone,
} from '../utils/validation.js';

const config = loadEnv();

// TTS audio format: 24kHz, 16-bit mono PCM (standard for OpenAI and ElevenLabs)
const TTS_SAMPLE_RATE = 24000;
const TTS_CHANNELS = 1;
const TTS_EXPECTED_FORMAT = 'pcm';

/**
 * LiveKit Voice Agent for IT Help Desk
 * Handles real-time voice conversation flow with STT → LLM → TTS pipeline
 */
export class VoiceAgent {
  private room: Room;
  private conversation: ConversationManager;
  private providers;
  private toolExecutor: ToolExecutor;
  private issueClassifier: IssueClassifier;
  private conversationLogger: ConversationLogRepository;
  private isProcessing = false;
  private conversationHistory: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> =
    [];

  // Audio output for TTS playback
  private audioSource: AudioSource | null = null;
  private audioTrack: LocalAudioTrack | null = null;
  private isSpeaking = false;

  constructor(roomName: string, participantIdentity: string) {
    this.room = new Room();
    this.conversation = new ConversationManager();
    this.providers = ProviderFactory.createAllProviders();
    this.toolExecutor = new ToolExecutor();
    this.issueClassifier = new IssueClassifier();
    this.conversationLogger = new ConversationLogRepository();

    // Initialize conversation history with system prompt
    this.conversationHistory.push({
      role: 'system',
      content: getSystemPrompt(),
    });

    logger.info(
      { sessionId: this.conversation.getContext().sessionId, roomName },
      'voice agent initialized',
    );
  }

  /**
   * Connect to LiveKit room and start processing
   */
  async connect(token: string): Promise<void> {
    await this.room.connect(config.LIVEKIT_URL, token);

    logger.info({ roomName: this.room.name }, 'connected to LiveKit room');

    // Set up event handlers BEFORE initializing audio (to catch track events)
    this.setupEventHandlers();

    // Handle any existing participants' audio tracks
    for (const participant of this.room.remoteParticipants.values()) {
      logger.info({ participantId: participant.identity }, 'found existing participant');
      for (const publication of participant.trackPublications.values()) {
        if (publication.track && publication.track.kind === TrackKind.KIND_AUDIO) {
          logger.info({ participantId: participant.identity }, 'subscribing to existing audio track');
          await this.handleAudioTrack(publication.track);
        }
      }
    }

    // Initialize audio output for TTS
    await this.initializeAudioOutput();

    // Send initial greeting
    await this.sendResponse(
      "Hello! I'm here to help you create an IT support ticket. May I have your name please?",
    );
  }

  /**
   * Initialize audio source and track for TTS output
   */
  private async initializeAudioOutput(): Promise<void> {
    try {
      // TTS providers return 24kHz, 16-bit mono PCM
      const sampleRate = TTS_SAMPLE_RATE;
      const channels = TTS_CHANNELS;

      this.audioSource = new AudioSource(sampleRate, channels);
      this.audioTrack = LocalAudioTrack.createAudioTrack('agent-voice', this.audioSource);

      if (!this.room.localParticipant) {
        throw new Error('Local participant not available');
      }

      // Publish track with default audio settings
      // LiveKit SDK handles optimal audio settings internally
      const publication = await this.room.localParticipant.publishTrack(this.audioTrack);

      // CRITICAL: Wait for at least one subscriber before sending audio
      // Without this, audio frames will be dropped
      await publication.waitForSubscription();

      logger.info(
        { sampleRate, channels, trackSid: this.audioTrack.sid },
        'audio output track published and subscribed',
      );
    } catch (error) {
      logger.error({ err: error }, 'failed to initialize audio output');
      throw error;
    }
  }

  /**
   * Set up LiveKit event handlers
   */
  private setupEventHandlers(): void {
    this.room.on(RoomEvent.TrackSubscribed, async (track, publication, participant) => {
      if (track.kind === TrackKind.KIND_AUDIO) {
        logger.info({ participantId: participant.identity }, 'audio track subscribed');
        await this.handleAudioTrack(track);
      }
    });

    this.room.on(RoomEvent.Disconnected, () => {
      logger.info('disconnected from room');
      this.cleanup();
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      logger.info({ participantId: participant.identity }, 'participant disconnected');
    });
  }

  /**
   * Handle incoming audio track (streaming STT)
   */
  private async handleAudioTrack(track: Track): Promise<void> {
    logger.info('starting audio stream processing');

    try {
      // Create audio stream from track
      const audioStream = new AudioStream(track, 16000, 1); // 16kHz mono
      let audioFrames: AudioFrame[] = [];
      let silentFrameCount = 0;
      let speechFrameCount = 0;
      let totalFramesReceived = 0;
      const SILENCE_THRESHOLD = 50; // Very low threshold for better sensitivity
      const SILENCE_FRAMES_REQUIRED = 20; // ~400ms of silence at 16kHz with 20ms frames
      const MIN_SPEECH_FRAMES = 3; // Minimum speech frames before processing
      const MIN_SPEECH_DURATION_MS = 200; // Minimum 200ms of audio to process

      logger.info({ sampleRate: 16000, channels: 1, silenceThreshold: SILENCE_THRESHOLD }, 'audio stream created, starting to process frames with VAD');

      // Process audio frames asynchronously
      (async () => {
        try {
          for await (const frame of audioStream) {
            totalFramesReceived++;
            
            // Calculate RMS energy of the frame for VAD
            const rms = this.calculateRMS(frame);
            
            // Log every 50th frame to show we're receiving audio + RMS values (debug level)
            if (totalFramesReceived % 50 === 1) {
              logger.debug({ 
                totalFrames: totalFramesReceived, 
                rms: Math.round(rms),
                threshold: SILENCE_THRESHOLD,
                isSpeech: rms >= SILENCE_THRESHOLD,
                speechFrameCount,
                silentFrameCount,
                bufferedFrames: audioFrames.length
              }, 'audio frame stats');
            }
            const isSilent = rms < SILENCE_THRESHOLD;

            if (isSilent) {
              silentFrameCount++;
              
              // If we have speech and enough silence follows, process it
              if (speechFrameCount >= MIN_SPEECH_FRAMES && silentFrameCount >= SILENCE_FRAMES_REQUIRED) {
                const totalDuration = audioFrames.reduce(
                  (sum, f) => sum + (f.samplesPerChannel * 1000) / f.sampleRate,
                  0,
                );

                if (totalDuration >= MIN_SPEECH_DURATION_MS) {
                  logger.info(
                    { frameCount: audioFrames.length, duration: totalDuration, speechFrames: speechFrameCount },
                    'speech ended (silence detected), processing',
                  );

                  // Convert audio frames to buffer for STT
                  const audioData = this.audioFramesToBuffer(audioFrames);
                  
                  logger.info({ audioBufferSize: audioData.length }, 'sending audio to STT');
                  
                  // Reset for next utterance
                  audioFrames = [];
                  silentFrameCount = 0;
                  speechFrameCount = 0;

                  // Transcribe
                  try {
                    logger.info('calling STT transcribe...');
                    const result = await this.providers.stt.transcribe(audioData);
                    logger.info({ resultText: result.text, resultConfidence: result.confidence }, 'STT returned');

                    if (result.text && result.text.trim().length > 0) {
                      logger.info({ transcript: result.text, confidence: result.confidence }, 'user speech transcribed');
                      await this.processUserInput(result.text);
                    } else {
                      logger.info('empty transcript from STT, ignoring');
                    }
                  } catch (error) {
                    logger.error({ err: error }, 'STT error');
                  }
                } else {
                  logger.debug({ duration: totalDuration }, 'audio too short, ignoring');
                  audioFrames = [];
                  silentFrameCount = 0;
                  speechFrameCount = 0;
                }
              }
            } else {
              // Speech detected
              silentFrameCount = 0;
              speechFrameCount++;
              audioFrames.push(frame);
              
              if (speechFrameCount === 1) {
                logger.info({ rms, threshold: SILENCE_THRESHOLD }, 'speech started');
              }
            }
          }

          logger.info({ totalFramesReceived }, 'audio stream ended');
        } catch (error) {
          logger.error({ err: error }, 'error in audio stream processing loop');
        }
      })();
    } catch (error) {
      logger.error({ err: error }, 'error setting up audio track handler');
    }
  }

  /**
   * Calculate RMS (Root Mean Square) energy of an audio frame for VAD
   */
  private calculateRMS(frame: AudioFrame): number {
    let sum = 0;
    for (let i = 0; i < frame.data.length; i++) {
      const sample = frame.data[i] ?? 0;
      sum += sample * sample;
    }
    return Math.sqrt(sum / frame.data.length);
  }

  /**
   * Convert audio frames to Buffer for STT
   */
  private audioFramesToBuffer(frames: AudioFrame[]): Buffer {
    const totalSamples = frames.reduce((sum, f) => sum + f.data.length, 0);
    const buffer = Buffer.allocUnsafe(totalSamples * 2); // Int16 = 2 bytes per sample
    let offset = 0;

    for (const frame of frames) {
      for (let i = 0; i < frame.data.length; i++) {
        const sample = frame.data[i];
        if (sample !== undefined) {
          buffer.writeInt16LE(sample, offset);
        }
        offset += 2;
      }
    }

    return buffer;
  }

  /**
   * Process user input (from transcribed speech)
   */
  async processUserInput(userMessage: string): Promise<void> {
    if (this.isProcessing) {
      logger.warn('already processing, skipping input');
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      logger.info({ userMessage, state: this.conversation.getState() }, 'processing user input');

      // Publish user transcript to room
      if (this.room.localParticipant) {
        const transcriptData = JSON.stringify({
          type: 'transcript',
          role: 'user',
          message: userMessage,
          timestamp: new Date().toISOString(),
        });
        await this.room.localParticipant.publishData(
          new TextEncoder().encode(transcriptData),
          { topic: 'transcript' },
        );
      }

      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage,
      });

      // Update conversation context based on current state
      await this.updateContextFromUserInput(userMessage);

      // If we're in TICKET_CREATION state, add collected context to help LLM create ticket
      if (this.conversation.getState() === ConversationState.TICKET_CREATION) {
        const context = this.conversation.getContext();
        const contextSummary = `COLLECTED CUSTOMER INFORMATION:
Name: ${context.name || 'Not provided'}
Email: ${context.email || 'Not provided'}
Phone: ${context.phone || 'Not provided'}
Address: ${context.address || 'Not provided'}
Issue: ${context.issue || 'Not provided'}
Issue Type: ${context.issueType || 'Not classified'}
Price: $${context.price || 'Not set'}

Please create the ticket using the create_ticket tool with these exact values.`;
        
        this.conversationHistory.push({
          role: 'system',
          content: contextSummary,
        });
      }

      // Get LLM response with tools
      logger.info('calling LLM...');
      const llmResponse = await this.providers.llm.complete(this.conversationHistory, {
        temperature: 0.7,
        maxTokens: 300,
        tools: toolDefinitions,
        toolChoice: 'auto',
      });
      logger.info({ 
        hasContent: !!llmResponse.content, 
        contentLength: llmResponse.content?.length,
        toolCallsCount: llmResponse.toolCalls?.length || 0,
        tokens: llmResponse.usage.totalTokens 
      }, 'LLM responded');

      // Handle tool calls if any
      if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
        for (const toolCall of llmResponse.toolCalls) {
          const toolResult = await this.toolExecutor.execute(
            toolCall.function.name,
            toolCall.function.arguments,
          );
          logger.info({ tool: toolCall.function.name, result: toolResult }, 'tool executed');

          // Update context based on tool result
          await this.handleToolResult(toolCall.function.name, toolResult);
        }
      }

      // Add assistant response to history
      if (llmResponse.content) {
        this.conversationHistory.push({
          role: 'assistant',
          content: llmResponse.content,
        });

        // Publish assistant transcript to room
        if (this.room.localParticipant) {
          const transcriptData = JSON.stringify({
            type: 'transcript',
            role: 'assistant',
            message: llmResponse.content,
            timestamp: new Date().toISOString(),
          });
          await this.room.localParticipant.publishData(
            new TextEncoder().encode(transcriptData),
            { topic: 'transcript' },
          );
        }

        // Send TTS response
        logger.info({ responseText: llmResponse.content.substring(0, 100) }, 'sending TTS response');
        await this.sendResponse(llmResponse.content);
        logger.info('TTS response sent');
      } else {
        logger.warn('LLM returned no content, nothing to say');
      }

      // Track usage
      const duration = (Date.now() - startTime) / 1000;
      costTracker.track({
        sttDuration: duration * 0.3, // Rough estimate
        llmTokens: llmResponse.usage.totalTokens,
        ttsDuration: duration * 0.3,
        timestamp: new Date(),
      });

      // Log conversation turn
      await this.conversationLogger.createLog({
        sessionId: this.conversation.getContext().sessionId,
        conversationState: this.conversation.getState(),
        userMessage,
        botResponse: llmResponse.content,
        toolCalls: llmResponse.toolCalls as never,
        metadata: {
          duration,
          tokens: llmResponse.usage.totalTokens,
        } as never,
      });
    } catch (error) {
      logger.error({ err: error }, 'error processing user input');
      await this.sendResponse("I'm sorry, I encountered an error. Could you please repeat that?");
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Update conversation context based on user input and current state
   */
  private async updateContextFromUserInput(userMessage: string): Promise<void> {
    const state = this.conversation.getState();
    const context = this.conversation.getContext();

    switch (state) {
      case ConversationState.GREETING:
      case ConversationState.COLLECTING_NAME:
        // Try to extract name
        if (!context.name) {
          const nameValidation = validateName(userMessage);
          if (nameValidation.isValid) {
            this.conversation.updateField('name', nameValidation.sanitized);
            this.conversation.advanceToNextState();
          }
        }
        break;

      case ConversationState.COLLECTING_EMAIL:
        // Try to extract email
        const extractedEmail = extractEmail(userMessage);
        if (extractedEmail) {
          const emailValidation = validateEmail(extractedEmail);
          if (emailValidation.isValid) {
            this.conversation.updateField('email', emailValidation.sanitized);
            this.conversation.advanceToNextState();
          }
        }
        break;

      case ConversationState.COLLECTING_PHONE:
        // Try to extract phone
        const extractedPhone = extractPhone(userMessage);
        if (extractedPhone) {
          const phoneValidation = validatePhone(extractedPhone);
          if (phoneValidation.isValid) {
            this.conversation.updateField('phone', phoneValidation.sanitized);
            this.conversation.advanceToNextState();
          }
        }
        break;

      case ConversationState.COLLECTING_ADDRESS:
        // Validate address
        const addressValidation = validateAddress(userMessage);
        if (addressValidation.isValid) {
          this.conversation.updateField('address', addressValidation.sanitized);
          this.conversation.advanceToNextState();
        }
        break;

      case ConversationState.COLLECTING_ISSUE:
        // Validate and classify issue
        const issueValidation = validateIssue(userMessage);
        if (issueValidation.isValid) {
          this.conversation.updateField('issue', issueValidation.sanitized);
          const classification = await this.issueClassifier.classify(userMessage);
          if (classification.confidence !== 'low') {
            this.conversation.updateField('issueType', classification.issueType);
            this.conversation.updateField('price', classification.price);
            this.conversation.advanceToNextState();
          }
        }
        break;

      case ConversationState.CONFIRMING_DETAILS:
        // Handle confirmation or correction
        if (/yes|correct|confirm|that's right/i.test(userMessage)) {
          this.conversation.advanceToNextState();
        }
        break;
    }
  }

  /**
   * Handle tool execution results
   */
  private async handleToolResult(toolName: string, result: string): Promise<void> {
    try {
      const parsed = JSON.parse(result);

      switch (toolName) {
        case 'validate_email':
          if (parsed.isValid) {
            this.conversation.updateField('email', parsed.email);
            logger.debug({ email: parsed.email }, 'email validated and stored');
          }
          break;

        case 'validate_phone':
          if (parsed.isValid) {
            this.conversation.updateField('phone', parsed.phone);
            logger.debug({ phone: parsed.phone }, 'phone validated and stored');
          }
          break;

        case 'classify_issue':
          if (!parsed.needsClarification) {
            this.conversation.updateField('issueType', parsed.issueType);
            this.conversation.updateField('price', parsed.price);
            logger.debug({ issueType: parsed.issueType }, 'issue classified');
          }
          break;

        case 'create_ticket':
          if (parsed.success) {
            this.conversation.updateField('ticketId', parsed.ticketId);
            this.conversation.updateField('ticketNumber', parsed.ticketNumber);
            this.conversation.transitionTo(ConversationState.CONFIRMATION);
            logger.info({ ticketNumber: parsed.ticketNumber }, 'ticket created successfully');

            // Publish ticket creation event to room
            if (this.room.localParticipant) {
              const ticketData = JSON.stringify({
                type: 'ticket_created',
                ticketNumber: parsed.ticketNumber,
                ticketId: parsed.ticketId,
                issueType: this.conversation.getContext().issueType,
                price: this.conversation.getContext().price,
                timestamp: new Date().toISOString(),
              });
              await this.room.localParticipant.publishData(
                new TextEncoder().encode(ticketData),
                { topic: 'ticket' },
              );
            }
          }
          break;
      }
    } catch (error) {
      logger.error({ err: error, toolName }, 'failed to parse tool result');
    }
  }

  /**
   * Send TTS response to room via audio track
   */
  private async sendResponse(text: string): Promise<void> {
    if (!this.audioSource) {
      logger.error('audio source not initialized, cannot send response');
      return;
    }

    try {
      this.isSpeaking = true;
      logger.debug({ text }, 'synthesizing TTS response');

      const ttsResult = await this.providers.tts.synthesize(text);

      // Validate that the TTS provider returns PCM format
      // If format is undefined, we assume PCM (for backward compatibility)
      // If format is explicitly set to non-PCM (e.g., 'wav', 'mp3'), reject it
      const format = ttsResult.metadata?.format;
      if (format && typeof format === 'string' && format.toLowerCase() !== TTS_EXPECTED_FORMAT) {
        logger.error(
          { provider: ttsResult.metadata?.provider, format },
          'TTS provider returned non-PCM format. Audio track output requires PCM. Please configure a TTS provider that returns raw PCM (e.g., OpenAI, ElevenLabs).',
        );
        throw new Error(
          `Unsupported TTS format: ${format}. Audio track output requires PCM format.`,
        );
      }

      // Convert PCM buffer to audio frames and push to audio source
      const sampleRate = (ttsResult.metadata?.sampleRate as number) || TTS_SAMPLE_RATE;
      const channels = (ttsResult.metadata?.channels as number) || TTS_CHANNELS;
      const audioFrames = this.pcmBufferToAudioFrames(ttsResult.audio, sampleRate, channels);

      logger.info(
        { textLength: text.length, audioSize: ttsResult.audio.length, frameCount: audioFrames.length },
        'publishing TTS audio frames',
      );

      // Push each frame to the audio source
      for (const frame of audioFrames) {
        await this.audioSource.captureFrame(frame);
      }

      // Wait for all audio to be played before marking as done
      await this.audioSource.waitForPlayout();

      logger.debug('TTS audio playback complete');
    } catch (error) {
      logger.error({ err: error }, 'failed to send TTS response');
      // Don't throw - TTS failure shouldn't crash the bot
    } finally {
      this.isSpeaking = false;
    }
  }

  /**
   * Convert PCM buffer to AudioFrame objects
   * PCM format: 16-bit signed little-endian
   */
  private pcmBufferToAudioFrames(
    pcmBuffer: Buffer,
    sampleRate: number,
    channels: number,
  ): AudioFrame[] {
    const frames: AudioFrame[] = [];
    const bytesPerSample = 2; // 16-bit = 2 bytes
    const samplesPerFrame = Math.floor(sampleRate * 0.02); // 20ms frames
    const bytesPerFrame = samplesPerFrame * bytesPerSample * channels;

    for (let offset = 0; offset < pcmBuffer.length; offset += bytesPerFrame) {
      const frameBytes = Math.min(bytesPerFrame, pcmBuffer.length - offset);
      const frameSamples = Math.floor(frameBytes / (bytesPerSample * channels));

      if (frameSamples === 0) break;

      // Create Int16Array from PCM data
      const samples = new Int16Array(frameSamples * channels);
      for (let i = 0; i < frameSamples * channels; i++) {
        const byteOffset = offset + i * bytesPerSample;
        if (byteOffset + 1 < pcmBuffer.length) {
          samples[i] = pcmBuffer.readInt16LE(byteOffset);
        }
      }

      frames.push(new AudioFrame(samples, sampleRate, channels, frameSamples));
    }

    return frames;
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    logger.info({ sessionId: this.conversation.getContext().sessionId }, 'cleaning up agent');

    // Unpublish audio track
    if (this.audioTrack && this.room.localParticipant) {
      try {
        await this.room.localParticipant.unpublishTrack(this.audioTrack.sid);
      } catch (error) {
        logger.warn({ err: error }, 'failed to unpublish audio track');
      }
    }

    await this.providers.stt.close();
    await this.providers.llm.close();
    await this.providers.tts.close();

    await this.room.disconnect();
  }

  /**
   * Generate LiveKit access token for client
   */
  static async generateToken(roomName: string, participantName: string): Promise<string> {
    const token = new AccessToken(config.LIVEKIT_API_KEY, config.LIVEKIT_API_SECRET, {
      identity: participantName,
      ttl: '1h',
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    return await token.toJwt();
  }
}
