import io from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';
const ROOM_ID = 'test-room-webrtc-999';

console.log('--- Starting WebRTC Signaling & Room Membership Verification ---');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runSignalingTest() {
  const results = {
    joinAck1: false,
    joinAck2: false,
    userJoinedBroadcast: false,
    existingParticipantsList: false,
    offerExchange: false,
    answerExchange: false,
    iceCandidateExchange: false,
    chatBroadcast: false,
    mediaStatusToggle: false,
    reconnectCleanup: false,
    endCallBroadcast: false,
  };

  // 1. Participant 1 (Doctor) connects and joins room
  console.log('[Test] 1. Doctor connecting...');
  const docSocket = io(SERVER_URL, { transports: ['websocket'] });
  
  await new Promise((resolve) => {
    docSocket.on('connect', () => {
      console.log('  -> Doctor connected with socket ID:', docSocket.id);
      docSocket.emit(
        'join-room',
        {
          roomId: ROOM_ID,
          userId: 'doc-user-001',
          userName: 'Dr. Ananya Sharma',
          userRole: 'doctor',
        },
        (ack) => {
          console.log('  -> Doctor join-room ack:', ack);
          if (ack && ack.success && ack.roomId === ROOM_ID) {
            results.joinAck1 = true;
          }
          resolve();
        }
      );
    });
  });

  // 2. Participant 2 (Patient) connects and joins room
  console.log('[Test] 2. Patient connecting...');
  const patientSocket = io(SERVER_URL, { transports: ['websocket'] });

  let patientReceivedOffer = null;
  let doctorReceivedAnswer = null;
  let patientReceivedCandidate = null;

  // Set up listeners on Doctor socket
  docSocket.on('user-joined', (data) => {
    console.log('  -> Doctor received user-joined:', data);
    results.userJoinedBroadcast = true;

    // Doctor initiates offer to Patient
    console.log('  -> Doctor sending webrtc-offer to patient...');
    docSocket.emit('webrtc-offer', {
      targetSocketId: data.socketId,
      sdp: { type: 'offer', sdp: 'v=0\r\no=Doctor 1234 5678 IN IP4 127.0.0.1\r\ns=Test\r\nt=0 0\r\n' },
      callerInfo: { userName: 'Dr. Ananya Sharma', userRole: 'doctor' },
    });
  });

  docSocket.on('webrtc-answer', (data) => {
    console.log('  -> Doctor received webrtc-answer from:', data.senderSocketId);
    doctorReceivedAnswer = data;
    results.answerExchange = true;

    // Doctor sends ICE candidate
    console.log('  -> Doctor sending ICE candidate to patient...');
    docSocket.emit('webrtc-ice-candidate', {
      targetSocketId: data.senderSocketId,
      candidate: { candidate: 'candidate:1 1 UDP 2122252543 192.168.1.100 50000 typ host', sdpMid: '0', sdpMLineIndex: 0 },
    });
  });

  docSocket.on('chat-message', (msg) => {
    if (msg.text === 'Hello Doctor, I am feeling unwell.') {
      results.chatBroadcast = true;
    }
  });

  docSocket.on('peer-media-status-changed', (status) => {
    if (status.isAudioMuted === true) {
      results.mediaStatusToggle = true;
    }
  });

  docSocket.on('call-ended', (data) => {
    console.log('  -> Doctor received call-ended event:', data);
    results.endCallBroadcast = true;
  });

  // Set up listeners on Patient socket
  patientSocket.on('existing-participants', (data) => {
    console.log('  -> Patient received existing-participants:', data);
    if (data.participants && data.participants.length > 0) {
      results.existingParticipantsList = true;
    }
  });

  patientSocket.on('webrtc-offer', (data) => {
    console.log('  -> Patient received webrtc-offer from:', data.senderSocketId);
    patientReceivedOffer = data;
    results.offerExchange = true;

    // Patient returns answer
    console.log('  -> Patient returning webrtc-answer to doctor...');
    patientSocket.emit('webrtc-answer', {
      targetSocketId: data.senderSocketId,
      sdp: { type: 'answer', sdp: 'v=0\r\no=Patient 5678 1234 IN IP4 127.0.0.1\r\ns=Test\r\nt=0 0\r\n' },
    });
  });

  patientSocket.on('webrtc-ice-candidate', (data) => {
    console.log('  -> Patient received ICE candidate:', data.candidate.candidate);
    patientReceivedCandidate = data.candidate;
    results.iceCandidateExchange = true;
  });

  await new Promise((resolve) => {
    patientSocket.on('connect', () => {
      console.log('  -> Patient connected with socket ID:', patientSocket.id);
      patientSocket.emit(
        'join-room',
        {
          roomId: ROOM_ID,
          userId: 'patient-user-002',
          userName: 'Kavita Devi',
          userRole: 'patient',
        },
        (ack) => {
          console.log('  -> Patient join-room ack:', ack);
          if (ack && ack.success && ack.roomId === ROOM_ID) {
            results.joinAck2 = true;
          }
          resolve();
        }
      );
    });
  });

  // Wait for signaling to complete
  await delay(1500);

  // 3. Test Chat Message Exchange
  console.log('[Test] 3. Testing real-time chat...');
  patientSocket.emit('send-chat-message', {
    roomId: ROOM_ID,
    message: { sender: 'Kavita Devi', senderRole: 'patient', text: 'Hello Doctor, I am feeling unwell.' },
  });

  // 4. Test Media Status Toggle
  console.log('[Test] 4. Testing media status toggle...');
  patientSocket.emit('toggle-media-status', {
    roomId: ROOM_ID,
    isAudioMuted: true,
    isVideoMuted: false,
  });

  await delay(500);

  // 5. Test Reconnection & Ghost Socket Cleanup
  console.log('[Test] 5. Testing reconnection and ghost socket cleanup...');
  // Patient reconnects on a new socket without explicit disconnect (simulating page reload)
  const patientSocket2 = io(SERVER_URL, { transports: ['websocket'] });
  let ghostSocketCleanupVerified = false;

  await new Promise((resolve) => {
    patientSocket2.on('connect', () => {
      console.log('  -> Patient reloaded page, new socket ID:', patientSocket2.id);
      patientSocket2.emit(
        'join-room',
        {
          roomId: ROOM_ID,
          userId: 'patient-user-002',
          userName: 'Kavita Devi',
          userRole: 'patient',
        },
        (ack) => {
          console.log('  -> Patient reconnect join-room ack:', ack);
          if (ack && ack.success) {
            // Check that old socket ID was removed and Doctor is still in room
            const docInRoom = ack.participants.some((p) => p.socketId === docSocket.id);
            const oldPatientInRoom = ack.participants.some((p) => p.socketId === patientSocket.id);
            if (docInRoom && !oldPatientInRoom) {
              ghostSocketCleanupVerified = true;
              results.reconnectCleanup = true;
              console.log('  -> Ghost socket cleanup VERIFIED: Old socket purged, active doctor preserved!');
            }
          }
          resolve();
        }
      );
    });
  });

  await delay(500);

  // 6. Test Call End Broadcast
  console.log('[Test] 6. Testing end-call broadcast...');
  docSocket.emit('end-call', {
    roomId: ROOM_ID,
    endedBy: 'Dr. Ananya Sharma',
    notes: 'Rest and hydration prescribed.',
  });

  await delay(500);

  // Cleanup all sockets
  docSocket.disconnect();
  patientSocket.disconnect();
  patientSocket2.disconnect();

  console.log('\n--- WebRTC Signaling & Room Verification Results ---');
  console.table(results);

  const allPassed = Object.values(results).every(Boolean);
  if (allPassed) {
    console.log('✅ ALL WebRTC Signaling & Room Membership tests PASSED successfully!');
    process.exit(0);
  } else {
    console.error('❌ Some tests FAILED:', results);
    process.exit(1);
  }
}

runSignalingTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
