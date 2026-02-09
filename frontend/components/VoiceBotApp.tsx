'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  BarVisualizer,
  DisconnectButton,
  useRoomContext,
  useLocalParticipant,
} from '@livekit/components-react';
import { Toaster, toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function VoiceBotApp() {
  const [connectionDetails, setConnectionDetails] = useState<{
    serverUrl: string;
    roomName: string;
    participantToken: string;
  } | null>(null);
  const [participantName, setParticipantName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = async () => {
    if (!participantName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setIsConnecting(true);

    try {
      const response = await fetch('/api/connection-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName: participantName.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to get connection details');
      }

      const details = await response.json();
      setConnectionDetails(details);
      toast.success('Connected successfully!');
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect. Please try again.');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setConnectionDetails(null);
    setIsConnecting(false);
    toast.info('Disconnected from session');
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              IT Help Desk Voice Bot
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (connectionDetails) {
    return (
      <>
        <LiveKitRoom
          serverUrl={connectionDetails.serverUrl}
          token={connectionDetails.participantToken}
          connect={true}
          audio={true}
          video={false}
          onDisconnected={handleDisconnect}
          className="h-screen"
        >
          <VoiceBotSession participantName={participantName} />
          <RoomAudioRenderer />
        </LiveKitRoom>
        <Toaster position="top-center" richColors />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-800">
        <div className="w-full max-w-md space-y-8">
          {/* Animated Header */}
          <div className="text-center space-y-4">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 opacity-20 blur-3xl rounded-full" />
              <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                <span className="text-6xl">🎧</span>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              IT Help Desk Voice Bot
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Speak naturally - I&apos;ll help create your support ticket
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>AI-Powered Voice Assistant</span>
            </div>
          </div>

          {/* Welcome Card with gradient */}
          <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 space-y-6 border border-gray-200 dark:border-gray-700">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-bl-full" />
            
            <div className="relative">
              <label
                htmlFor="name"
                className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3"
              >
                <span className="mr-2">👤</span>
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500/50 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all shadow-sm"
                disabled={isConnecting}
              />
            </div>

            <button
              onClick={handleConnect}
              disabled={isConnecting || !participantName.trim()}
              className="group relative w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 disabled:hover:scale-100 focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-lg hover:shadow-2xl overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity" />
              <span className="relative flex items-center justify-center space-x-2">
                <span className="text-2xl">🎤</span>
                <span>{isConnecting ? 'Connecting...' : 'Start Voice Call'}</span>
              </span>
            </button>

            {/* Features List */}
            <div className="pt-4 border-t-2 border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <span className="mr-2">⚡</span>
                What You&apos;ll Experience
              </h3>
              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Real-time voice conversation with AI</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>Visual feedback during conversation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  <span>Instant ticket creation and confirmation</span>
                </div>
              </div>
            </div>

            {/* Services Info with hover effects */}
            <div className="pt-4 border-t-2 border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <span className="mr-2">🛠️</span>
                Available Services
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <ServiceItem icon="📶" name="Wi-Fi Issues" price="$20" />
                <ServiceItem icon="📧" name="Email Login" price="$15" />
                <ServiceItem icon="💻" name="Slow Laptop" price="$25" />
                <ServiceItem icon="🖨️" name="Printer Problems" price="$10" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toaster position="top-center" richColors />
    </>
  );
}

function ServiceItem({ icon, name, price }: { icon: string; name: string; price: string }) {
  return (
    <div className="group flex items-center space-x-2 p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-default border border-gray-200 dark:border-gray-600">
      <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white truncate">{name}</p>
        <p className="text-emerald-600 dark:text-emerald-400 font-bold">{price}</p>
      </div>
    </div>
  );
}

function VoiceBotSession({ participantName }: { participantName: string }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const animationFrameRef = useRef<number | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Add initial greeting
    setMessages([
      {
        role: 'assistant',
        content: `Hello ${participantName}! I'm here to help you create an IT support ticket. What issue are you experiencing today?`,
      },
    ]);
  }, [participantName]);

  // Handle incoming TTS audio data messages
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant: any, kind: any) => {
      // Only process TTS audio data
      if (kind?.topic !== 'tts-audio') return;

      try {
        // Convert the audio data to a blob and play it
        const audioBlob = new Blob([new Uint8Array(payload)], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);

        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          // Play audio and clean up the URL after playing
          audioRef.current.play().then(() => {
            // Clean up the object URL after a delay to ensure it played
            setTimeout(() => URL.revokeObjectURL(audioUrl), 1000);
          }).catch(err => {
            console.error('Failed to play TTS audio:', err);
            URL.revokeObjectURL(audioUrl); // Clean up on error too
          });
        }
      } catch (error) {
        console.error('Error handling TTS audio data:', error);
      }
    };

    room.on('dataReceived', handleDataReceived);

    return () => {
      room.off('dataReceived', handleDataReceived);
    };
  }, [room]);

  // Monitor room connection state
  useEffect(() => {
    if (!room) return;

    const handleConnected = () => setConnectionState('connected');
    const handleDisconnected = () => setConnectionState('disconnected');

    room.on('connected', handleConnected);
    room.on('disconnected', handleDisconnected);

    if (room.state === 'connected') {
      setConnectionState('connected');
    }

    return () => {
      room.off('connected', handleConnected);
      room.off('disconnected', handleDisconnected);
    };
  }, [room]);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-800">
      {/* Header with animated background */}
      <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-lg p-4 flex justify-between items-center border-b-2 border-gradient-to-r from-blue-500 to-purple-500">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ${isSpeaking ? 'animate-pulse' : ''}`}>
              <span className="text-2xl">🤖</span>
            </div>
            {isSpeaking && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">IT Help Desk AI</h2>
            <div className="flex items-center space-x-2 mt-1">
              <div
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isSpeaking
                    ? 'bg-green-500 animate-pulse'
                    : connectionState === 'connected'
                      ? 'bg-blue-500'
                      : 'bg-gray-400'
                }`}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                {isSpeaking ? '🎤 Listening...' : connectionState === 'connected' ? '✨ Ready' : '🔄 Connecting...'}
              </span>
            </div>
          </div>
        </div>
        <DisconnectButton className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-6 py-2 rounded-full transition-all transform hover:scale-105 shadow-lg">
          End Call
        </DisconnectButton>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-6 p-6">
        {/* Agent Visualizer with Voice Detection */}
        <div className="lg:w-1/3 flex items-center justify-center">
          <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-sm border border-gray-200 dark:border-gray-700">
            {/* Voice Input Detection Indicator */}
            {isSpeaking && (
              <div className="absolute top-4 right-4 flex items-center space-x-2 bg-green-500/20 px-3 py-1 rounded-full border border-green-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                <span className="text-xs font-semibold text-green-700 dark:text-green-300">Voice Detected</span>
              </div>
            )}

            <div className="flex flex-col items-center space-y-6">
              {/* Animated Microphone Icon */}
              <div className="relative">
                <div
                  className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isSpeaking
                      ? 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-2xl shadow-green-500/50'
                      : connectionState === 'connected'
                        ? 'bg-gradient-to-br from-blue-400 to-purple-600 shadow-2xl shadow-blue-500/50'
                        : 'bg-gradient-to-br from-gray-400 to-gray-600 shadow-xl'
                  }`}
                  style={{
                    transform: isSpeaking ? `scale(${1 + audioLevel})` : 'scale(1)',
                  }}
                >
                  <span className="text-7xl">
                    {isSpeaking ? '🎤' : '🤖'}
                  </span>
                </div>

                {/* Ripple effect when speaking */}
                {isSpeaking && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30" />
                    <div className="absolute inset-0 rounded-full bg-green-400 animate-pulse opacity-20" />
                  </>
                )}
              </div>

              {/* State Description */}
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  {isSpeaking ? (
                    <span className="text-green-600 dark:text-green-400">
                      🎧 I&apos;m listening...
                    </span>
                  ) : connectionState === 'connected' ? (
                    <span className="text-gray-600 dark:text-gray-400">
                      ⭐ Ready to help
                    </span>
                  ) : (
                    <span className="text-yellow-600 dark:text-yellow-400">
                      🔄 Connecting...
                    </span>
                  )}
                </p>
                
                {isSpeaking && (
                  <div className="flex items-center justify-center space-x-2 text-sm text-green-600 dark:text-green-400 animate-pulse">
                    <span className="inline-block w-1 h-1 bg-green-500 rounded-full animate-bounce" />
                    <span className="inline-block w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="inline-block w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="font-semibold ml-2">Capturing your voice</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Conversation Transcript with enhanced styling */}
        <div className="lg:w-2/3 flex flex-col">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-2xl p-6 flex-1 overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <span className="mr-2">💬</span>
                Conversation Transcript
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                {messages.length} messages
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`group transform transition-all duration-300 hover:scale-[1.02] ${
                    msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'
                  }`}
                >
                  <div
                    className={`relative max-w-[80%] p-4 rounded-2xl shadow-md ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-br-none'
                        : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      <span className="text-xl flex-shrink-0">
                        {msg.role === 'user' ? '👤' : '🤖'}
                      </span>
                      <div className="flex-1">
                        <span className="font-bold text-xs uppercase tracking-wider opacity-80 block mb-1">
                          {msg.role === 'user' ? 'You' : 'AI Assistant'}
                        </span>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                    
                    {/* Message tail */}
                    <div
                      className={`absolute bottom-0 w-4 h-4 ${
                        msg.role === 'user'
                          ? 'right-0 bg-purple-600'
                          : 'left-0 bg-gray-200 dark:bg-gray-800'
                      }`}
                      style={{
                        clipPath: msg.role === 'user' 
                          ? 'polygon(0 0, 100% 0, 100% 100%)' 
                          : 'polygon(0 0, 100% 0, 0 100%)'
                      }}
                    />
                  </div>
                </div>
              ))}
              
              {/* Connection status indicator */}
              {connectionState === 'connecting' && (
                <div className="flex justify-center">
                  <div className="bg-blue-100 dark:bg-blue-900 rounded-2xl px-6 py-4 shadow-md">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-blue-500 rounded-full animate-spin" />
                      <span className="text-blue-700 dark:text-blue-300">Connecting to voice bot...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden audio element for TTS playback */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}
