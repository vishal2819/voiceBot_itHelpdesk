// LiveKit client for IT Help Desk Voice Bot
// Configure these based on your setup
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001' 
  : window.location.origin;

// LiveKit URL will be fetched from the token endpoint
let LIVEKIT_URL = null;
let room = null;
let audioTrack = null;

// DOM elements
const startBtn = document.getElementById('startBtn');
const endBtn = document.getElementById('endBtn');
const participantNameInput = document.getElementById('participantName');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const transcript = document.getElementById('transcript');
const ticketConfirmation = document.getElementById('ticketConfirmation');
const ticketDetails = document.getElementById('ticketDetails');

// Update status UI
function updateStatus(status, color) {
  statusText.textContent = status;
  statusIndicator.className = `w-3 h-3 rounded-full mr-3 bg-${color}-500`;
}

// Add message to transcript
function addTranscriptMessage(role, message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `p-3 rounded-lg ${
    role === 'user'
      ? 'bg-blue-50 border-l-4 border-blue-500 ml-8'
      : 'bg-gray-50 border-l-4 border-gray-400 mr-8'
  }`;

  const roleSpan = document.createElement('span');
  roleSpan.className = 'font-semibold text-sm';
  roleSpan.textContent = role === 'user' ? 'You: ' : 'Assistant: ';

  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;

  messageDiv.appendChild(roleSpan);
  messageDiv.appendChild(messageSpan);

  transcript.appendChild(messageDiv);
  transcript.scrollTop = transcript.scrollHeight;
}

// Request microphone permission
async function requestMicrophonePermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (error) {
    console.error('Microphone permission denied:', error);
    alert('Microphone access is required for voice calls. Please allow microphone access.');
    return false;
  }
}

// Start call
async function startCall() {
  const participantName = participantNameInput.value.trim() || 'Guest User';
  // Use demo-room to match the bot's default room
  const roomName = 'demo-room';

  try {
    updateStatus('Requesting microphone access...', 'yellow');

    // Request microphone permission
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      updateStatus('Microphone access denied', 'red');
      return;
    }

    updateStatus('Connecting...', 'yellow');

    // Get access token from server
    const response = await fetch(`${API_URL}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName, participantName }),
    });

    if (!response.ok) {
      throw new Error('Failed to get access token');
    }

    const { serverUrl, participantToken } = await response.json();
    LIVEKIT_URL = serverUrl;

    // Connect to LiveKit room
    room = new LivekitClient.Room();

    // Set up event handlers
    room.on(LivekitClient.RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(LivekitClient.RoomEvent.Disconnected, handleDisconnected);
    room.on(LivekitClient.RoomEvent.DataReceived, handleDataReceived);

    await room.connect(LIVEKIT_URL, participantToken);

    // Publish microphone
    audioTrack = await LivekitClient.createLocalAudioTrack();
    await room.localParticipant.publishTrack(audioTrack);

    updateStatus('Connected - Speaking with assistant', 'green');
    startBtn.disabled = true;
    endBtn.disabled = false;
    participantNameInput.disabled = true;

    // Clear transcript
    transcript.innerHTML = '';
    addTranscriptMessage(
      'assistant',
      "Hello! I'm here to help you create an IT support ticket. May I have your name please?",
    );
  } catch (error) {
    console.error('Error starting call:', error);
    updateStatus('Connection failed', 'red');
    alert(`Failed to start call: ${error.message}`);
  }
}

// End call
async function endCall() {
  if (room) {
    await room.disconnect();
    room = null;
  }

  if (audioTrack) {
    audioTrack.stop();
    audioTrack = null;
  }

  updateStatus('Call ended', 'gray');
  startBtn.disabled = false;
  endBtn.disabled = true;
  participantNameInput.disabled = false;
}

// Handle subscribed track (bot audio)
function handleTrackSubscribed(track, publication, participant) {
  if (track.kind === LivekitClient.Track.Kind.Audio) {
    console.log('Bot audio track subscribed');
    const audioElement = track.attach();
    document.body.appendChild(audioElement);
  }
}

// Handle disconnection
function handleDisconnected() {
  console.log('Disconnected from room');
  updateStatus('Disconnected', 'red');
  startBtn.disabled = false;
  endBtn.disabled = true;
  participantNameInput.disabled = false;
}

// Handle data received (transcript, ticket info, etc.)
function handleDataReceived(payload, participant) {
  try {
    const data = JSON.parse(new TextDecoder().decode(payload));

    if (data.type === 'transcript') {
      addTranscriptMessage(data.role, data.message);
    } else if (data.type === 'ticket_created') {
      showTicketConfirmation(data);
    }
  } catch (error) {
    console.error('Error parsing data:', error);
  }
}

// Show ticket confirmation
function showTicketConfirmation(data) {
  ticketConfirmation.classList.remove('hidden');
  ticketDetails.innerHTML = `
    <p class="mb-2"><strong>Ticket Number:</strong> ${data.ticketNumber}</p>
    <p class="mb-2"><strong>Issue:</strong> ${data.issueType}</p>
    <p class="mb-2"><strong>Price:</strong> $${data.price}</p>
    <p class="text-sm text-gray-600 mt-3">A confirmation email has been sent to your email address.</p>
  `;
}

// Event listeners
startBtn.addEventListener('click', startCall);
endBtn.addEventListener('click', endCall);

// Check if server is running
fetch(`${API_URL}/health`)
  .then((res) => res.json())
  .then((data) => {
    console.log('Server health:', data);
    updateStatus('Ready to connect', 'blue');
  })
  .catch((error) => {
    console.error('Server not available:', error);
    updateStatus('Server unavailable - Please start the backend server', 'red');
    startBtn.disabled = true;
  });
