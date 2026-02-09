import { NextResponse } from 'next/server';
import { AccessToken, type VideoGrant } from 'livekit-server-sdk';

type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

// Disable caching for this endpoint
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    if (!LIVEKIT_URL) {
      throw new Error('LIVEKIT_URL is not defined');
    }
    if (!API_KEY) {
      throw new Error('LIVEKIT_API_KEY is not defined');
    }
    if (!API_SECRET) {
      throw new Error('LIVEKIT_API_SECRET is not defined');
    }

    const body = await req.json();
    const { participantName } = body;

    if (!participantName) {
      return NextResponse.json(
        { error: 'participantName is required' },
        { status: 400 }
      );
    }

    // Generate unique room and participant
    const participantIdentity = `helpdesk_user_${Math.floor(Math.random() * 10_000)}`;
    const roomName = 'demo-room'; // FIXED: Use static room for manual demo

    // Create access token
    const at = new AccessToken(API_KEY, API_SECRET, {
      identity: participantIdentity,
      name: participantName,
      ttl: '15m',
    });

    const grant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    };

    at.addGrant(grant);

    const participantToken = await at.toJwt();

    const connectionDetails: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantName,
      participantToken,
    };

    return NextResponse.json(connectionDetails);
  } catch (error) {
    console.error('Error generating connection details:', error);
    return NextResponse.json(
      { error: 'Failed to generate connection details' },
      { status: 500 }
    );
  }
}
