import { AudioFrame, AudioStream, Room, RoomEvent, Track, TrackKind } from '@livekit/rtc-node';
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

    // Set up event handlers
    this.setupEventHandlers();

    // Send initial greeting
    await this.sendResponse(
      "Hello! I'm here to help you create an IT support ticket. May I have your name please?",
    );
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
      const SILENCE_THRESHOLD = 500; // Audio amplitude threshold for silence detection
      const SILENCE_FRAMES_REQUIRED = 25; // ~1.5 seconds of silence at 16kHz
      const MIN_SPEECH_FRAMES = 8; // Minimum speech frames before processing
      const MIN_SPEECH_DURATION_MS = 500; // Minimum 500ms of audio to process

      logger.info('audio stream created, starting to process frames with VAD');

      // Process audio frames asynchronously
      (async () => {
        try {
          for await (const frame of audioStream) {
            // Calculate RMS energy of the frame for VAD
            const rms = this.calculateRMS(frame);
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
                  
                  // Reset for next utterance
                  audioFrames = [];
                  silentFrameCount = 0;
                  speechFrameCount = 0;

                  // Transcribe
                  try {
                    const result = await this.providers.stt.transcribe(audioData);

                    if (result.text && result.text.trim().length > 0) {
                      logger.info({ transcript: result.text, confidence: result.confidence }, 'user speech transcribed');
                      await this.processUserInput(result.text);
                    } else {
                      logger.debug('empty transcript, ignoring');
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
                logger.debug({ rms }, 'speech started');
              }
            }
          }

          logger.info('audio stream ended');
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

      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage,
      });

      // Update conversation context based on current state
      await this.updateContextFromUserInput(userMessage);

      // Get LLM response with tools
      const llmResponse = await this.providers.llm.complete(this.conversationHistory, {
        temperature: 0.7,
        maxTokens: 300,
        tools: toolDefinitions,
        toolChoice: 'auto',
      });

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

        // Send TTS response
        await this.sendResponse(llmResponse.content);
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
          }
          break;
      }
    } catch (error) {
      logger.error({ err: error, toolName }, 'failed to parse tool result');
    }
  }

  /**
   * Send TTS response to room
   */
  private async sendResponse(text: string): Promise<void> {
    try {
      logger.debug({ text }, 'sending TTS response');

      const ttsResult = await this.providers.tts.synthesize(text);

      // In production, publish audio to room
      // await this.room.localParticipant.publishData(ttsResult.audio);

      logger.info({ textLength: text.length, audioSize: ttsResult.audio.length }, 'response sent');
    } catch (error) {
      logger.error({ err: error }, 'failed to send response');
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    logger.info({ sessionId: this.conversation.getContext().sessionId }, 'cleaning up agent');

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
