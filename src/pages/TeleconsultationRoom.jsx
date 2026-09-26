import React, { useState, useEffect, useRef } from 'react';
import { createSocket } from '../utils/socketClient';
import { isSecureContext } from '../config/env';
import { fetchIceServers, getDefaultIceServers } from '../services/webrtc.service';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import appointmentService from '../services/appointment.service';
import liveTranslationService from '../services/liveTranslation.service';
import clinicalQoSController from '../services/clinicalQoSController';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  MessageSquare,
  Send,
  ShieldCheck,
  User,
  Clock,
  CheckCircle2,
  FileText,
  Sparkles,
  X,
  Volume2,
  VolumeX,
  Maximize2,
  Award,
  Stethoscope,
  Radio,
  Wifi,
  WifiOff,
  FileEdit,
  Pill,
  Check,
  CheckCheck,
  Bell,
  Download,
  Languages,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';
import OrderMedicineModal from '../components/medicine/OrderMedicineModal';

const DEFAULT_ICE_SERVERS = getDefaultIceServers();

const PRESCRIPTION_PRESETS = [
  'Paracetamol 500mg (1-0-1) for 3 days after food. Adequate oral hydration.',
  'Amoxicillin 250mg (1-0-1) for 5 days. Warm saline gargles twice daily.',
  'Cetirizine 10mg (0-0-1) at bedtime for 3 days. Steam inhalation.',
  'ORS Solution (1 sachet in 1L water) sip throughout the day with light khichdi diet.',
];

export const TeleconsultationRoom = ({ appointment, onLeaveRoom }) => {
  const { t, i18n } = useTranslation();
  const { user, token } = useAuth();

  const isDoctor = user?.role === 'doctor';
  const peerName = isDoctor
    ? (appointment?.patientName || 'Patient')
    : (appointment?.doctorName || 'Dr. Ananya Sharma');
  const peerSubtitle = isDoctor
    ? `Patient (${appointment?.patientAge || 35} yrs, ${appointment?.patientVillage || 'Rampur'})`
    : (appointment?.doctorSpecialization || 'General Physician');

  const roomId = appointment?.roomId || `room-${appointment?._id || 'general'}`;

  // Media state
  const [localStream, setLocalStream] = useState(null);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [remotePeerInfo, setRemotePeerInfo] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isRemoteAudioMuted, setIsRemoteAudioMuted] = useState(false);
  const [isRemoteVideoMuted, setIsRemoteVideoMuted] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [callDuration, setCallDuration] = useState(0);

  // Drawers state
  const [showChat, setShowChat] = useState(false);
  const [showPrescriptionDrawer, setShowPrescriptionDrawer] = useState(false);
  const [showTranslationSettings, setShowTranslationSettings] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [prescriptionAlert, setPrescriptionAlert] = useState(null);

  // Live Audio Translation AI state
  const [isLiveTranslationActive, setIsLiveTranslationActive] = useState(true);
  const [sourceLang, setSourceLang] = useState(isDoctor ? 'en' : (['ta', 'hi', 'te', 'kn', 'ml'].includes(i18n.language) ? i18n.language : 'ta')); // Speaking Language
  const [targetLang, setTargetLang] = useState(isDoctor ? 'en' : (['ta', 'hi', 'te', 'kn', 'ml'].includes(i18n.language) ? i18n.language : 'ta')); // Listening Language
  const [speakVoiceover, setSpeakVoiceover] = useState(true); // Voiceover enabled by default
  const [liveCaptions, setLiveCaptions] = useState(null);
  const [speechStatus, setSpeechStatus] = useState('idle'); // 'listening' | 'idle' | 'error'
  const [micVolume, setMicVolume] = useState(0);

  // Synchronized state refs for resilient, non-stale socket callbacks
  const targetLangRef = useRef(targetLang);
  const sourceLangRef = useRef(sourceLang);
  const speakVoiceoverRef = useRef(speakVoiceover);
  const iceConfigRef = useRef(DEFAULT_ICE_SERVERS);

  // Fetch short-lived, authenticated TURN credentials from backend on room entry
  useEffect(() => {
    let isSubscribed = true;
    fetchIceServers().then((config) => {
      if (isSubscribed && config) {
        iceConfigRef.current = config;
        if (peerConnectionRef.current && typeof peerConnectionRef.current.setConfiguration === 'function') {
          try {
            peerConnectionRef.current.setConfiguration(config);
            console.log('[WebRTC] Updated active connection with authenticated ICE/TURN credentials');
          } catch (err) {
            console.debug('[WebRTC] setConfiguration notice:', err.message);
          }
        }
      }
    });
    return () => {
      isSubscribed = false;
    };
  }, [roomId]);

  useEffect(() => {
    targetLangRef.current = targetLang;
  }, [targetLang]);

  useEffect(() => {
    sourceLangRef.current = sourceLang;
  }, [sourceLang]);

  useEffect(() => {
    speakVoiceoverRef.current = speakVoiceover;
  }, [speakVoiceover]);

  // Chat state
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome-msg',
      sender: 'System Bot',
      senderRole: 'system',
      text: 'Encrypted rural health teleconsultation session initiated. Real-time video, chat, live e-prescriptions, and AI audio translation are active.',
      translatedText: 'सुरक्षित ग्रामीण स्वास्थ्य टेली-परामर्श सत्र प्रारंभ हुआ। வீடியோ, அரட்டை மற்றும் நேரடி மொழிபெயர்ப்பு இயக்கத்தில் உள்ளன.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  // Prescription / Clinical Notes state
  const [doctorNotes, setDoctorNotes] = useState(
    appointment?.notes ||
      appointment?.prescriptionSummary ||
      'Paracetamol 500mg (1-0-1) after meals for 3 days. Adequate oral hydration, steam inhalation, and vitals monitoring.'
  );
  const [doctorPrescriptionInput, setDoctorPrescriptionInput] = useState(doctorNotes);
  const [prescriptionLastUpdated, setPrescriptionLastUpdated] = useState(null);
  const [rxSavedToast, setRxSavedToast] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Call ended summary state
  const [callEnded, setCallEnded] = useState(false);
  const [callEndedBy, setCallEndedBy] = useState('');
  const [remoteVideoFrame, setRemoteVideoFrame] = useState(null);

  // Network QoS state
  const [networkQuality, setNetworkQuality] = useState('GOOD');
  const [networkStats, setNetworkStats] = useState({ rtt: 0, packetLoss: 0, bitrate: 0 });

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const chatBottomRef = useRef(null);
  const speechRecognizerRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (showChat && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showChat]);

  // Real-time video frame broadcast (guarantees remote video visibility across all networks & tabs)
  useEffect(() => {
    if (!localStream || isVideoMuted || callEnded) return;

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = 320;
    offscreenCanvas.height = 240;
    const ctx = offscreenCanvas.getContext('2d');

    const frameInterval = setInterval(() => {
      if (localVideoRef.current && socketRef.current && localVideoRef.current.readyState >= 2) {
        try {
          ctx.drawImage(localVideoRef.current, 0, 0, 320, 240);
          const frameData = offscreenCanvas.toDataURL('image/jpeg', 0.45);
          socketRef.current.emit('video-frame', {
            roomId,
            frameData,
          });
        } catch (e) {}
      }
    }, 120);

    return () => clearInterval(frameInterval);
  }, [localStream, isVideoMuted, callEnded, roomId]);

  // Audio Context for real-time mic volume visualization
  useEffect(() => {
    if (!localStream || isAudioMuted) {
      setMicVolume(0);
      return;
    }

    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let animId = null;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioContext = new AudioCtx();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        microphone = audioContext.createMediaStreamSource(localStream);
        microphone.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVolume = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
          animId = requestAnimationFrame(updateVolume);
        };
        updateVolume();
      }
    } catch (err) {
      console.warn('[AudioMeter] Context error:', err);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (audioContext) {
        try {
          audioContext.close();
        } catch (e) {}
      }
    };
  }, [localStream, isAudioMuted]);

  // Helper to send live caption (used by speech recognition & quick voice test buttons)
  const broadcastCaption = async (transcript, isFinal = true) => {
    if (!transcript || !transcript.trim()) return;
    const cleanText = transcript.trim();
    const currentSource = sourceLangRef.current;
    const currentTarget = targetLangRef.current;

    const syncTranslated = liveTranslationService.translateTextSync(cleanText, currentSource, currentTarget);

    const captionData = {
      speaker: user?.name || (isDoctor ? 'Doctor' : 'Patient'),
      speakerRole: user?.role || 'patient',
      original: cleanText,
      translated: syncTranslated,
      sourceLang: currentSource,
      targetLang: currentTarget,
      isFinal,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Show local preview of what self spoke
    setLiveCaptions({
      ...captionData,
      isIncoming: false,
    });

    // Broadcast live caption and original speech to the OTHER peer
    if (socketRef.current) {
      socketRef.current.emit('live-captions', {
        roomId,
        captionData,
      });
    }

    if (isFinal) {
      try {
        const neuralTranslated = await liveTranslationService.translateText(cleanText, currentSource, currentTarget);
        if (neuralTranslated && neuralTranslated !== syncTranslated) {
          setLiveCaptions((prev) =>
            prev && !prev.isIncoming ? { ...prev, translated: neuralTranslated } : prev
          );
        }
      } catch (e) {}
    }
  };

  // 1. Live Speech Recognition & AI Translation Hook (100% Real-Time Streaming)
  useEffect(() => {
    const isTranslationEffective = isLiveTranslationActive && networkQuality !== 'OFFLINE';
    if (!isTranslationEffective || callEnded || isAudioMuted) {
      if (speechRecognizerRef.current) {
        try {
          speechRecognizerRef.current.stop();
        } catch (e) {}
      }
      setSpeechStatus('idle');
      return;
    }

    const langCodeMap = {
      hi: 'hi-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      kn: 'kn-IN',
      ml: 'ml-IN',
      en: 'en-IN',
    };
    const langCode = langCodeMap[sourceLang] || 'en-IN';

    const recognizer = liveTranslationService.createLiveSpeechRecognition({
      lang: langCode,
      onStateChange: (state) => setSpeechStatus(state),
      onResult: async (transcript, isFinal) => {
        if (networkQuality === 'VERY_LOW' && !isFinal) return; // Limit updates on bad networks
        broadcastCaption(transcript, isFinal);
      },
      onError: (err) => {
        if (err.error !== 'no-speech' && err.error !== 'aborted') {
          console.warn('[LiveTranslation] Recognizer notice:', err.message || err.error || err);
        }
        if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
          setSpeechStatus('error');
        }
      },
    });

    speechRecognizerRef.current = recognizer;

    return () => {
      if (speechRecognizerRef.current) {
        try {
          speechRecognizerRef.current.stop();
        } catch (e) {}
      }
    };
  }, [isLiveTranslationActive, sourceLang, callEnded, isAudioMuted, roomId, user, networkQuality]);

  // Keep video elements synced with stream refs
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [hasRemoteStream, isRemoteVideoMuted]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isVideoMuted]);

  // Helper: Create animated live video track if camera is locked by another tab on the same PC
  const createFallbackVideoStream = (name, role) => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    let frame = 0;

    const renderFrame = () => {
      frame++;
      // Background Gradient
      const grad = ctx.createLinearGradient(0, 0, 640, 480);
      grad.addColorStop(0, role === 'doctor' ? '#1E1B4B' : '#0F172A');
      grad.addColorStop(1, role === 'doctor' ? '#4C1D95' : '#1E293B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);

      // Animated Pulse Rings
      const ringRadius = 75 + Math.sin(frame * 0.08) * 8;
      ctx.beginPath();
      ctx.arc(320, 190, ringRadius, 0, Math.PI * 2);
      ctx.fillStyle = role === 'doctor' ? 'rgba(124, 58, 237, 0.25)' : 'rgba(2, 132, 199, 0.25)';
      ctx.fill();

      // Inner Circle
      ctx.beginPath();
      ctx.arc(320, 190, 56, 0, Math.PI * 2);
      ctx.fillStyle = role === 'doctor' ? '#7C3AED' : '#0284C7';
      ctx.fill();

      // Emoji Avatar
      ctx.font = '36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(role === 'doctor' ? '👨‍⚕️' : '🧑', 320, 203);

      // Name & Station
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(name || (role === 'doctor' ? 'Doctor Live Feed' : 'Patient Live Feed'), 320, 285);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#A78BFA';
      ctx.fillText(role === 'doctor' ? 'Govt. PHC Telehealth Station' : 'Village Health Kiosk', 320, 312);

      // Live Badge
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(38, 38, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#34D399';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('LIVE ENCRYPTED FEED', 52, 42);
    };

    // Initial render
    renderFrame();
    // Continuous 30fps timer (reliable in background tabs)
    const timerId = setInterval(renderFrame, 1000 / 30);

    const stream = canvas.captureStream(30);
    stream._timerId = timerId;
    return stream;
  };

  // 2. Initialize WebRTC Media Stream and Socket.IO connection
  useEffect(() => {
    let activeMediaStream = null;
    let socket = null;
    const pendingIceCandidates = [];

    // Helper: Initialize Peer Connection
    const createPeerConnection = (targetSocketId) => {
      const pc = new RTCPeerConnection(iceConfigRef.current);
      peerConnectionRef.current = pc;

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('webrtc-ice-candidate', {
            targetSocketId,
            candidate: event.candidate,
          });
        }
      };

      // Handle Remote Tracks
      pc.ontrack = (event) => {
        console.log('[WebRTC] Received remote stream track:', event.track.kind);
        let stream = event.streams && event.streams[0];
        if (!stream) {
          if (!remoteStreamRef.current) {
            remoteStreamRef.current = new MediaStream();
          }
          remoteStreamRef.current.addTrack(event.track);
          stream = remoteStreamRef.current;
        } else {
          remoteStreamRef.current = stream;
        }

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.play().catch(() => {});
        }
        setHasRemoteStream(true);
        setIsPeerConnected(true);
      };

      // Handle Connection State Changes
      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setIsPeerConnected(true);
          setHasRemoteStream(true);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setIsPeerConnected(false);
          setHasRemoteStream(false);
        }
      };

      // Add local tracks to peer connection
      if (activeMediaStream) {
        activeMediaStream.getTracks().forEach((track) => {
          pc.addTrack(track, activeMediaStream);
        });
      }

      return pc;
    };

    const flushIceCandidates = async (pc) => {
      if (!pc || !pc.remoteDescription) return;
      while (pendingIceCandidates.length > 0) {
        const candidate = pendingIceCandidates.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('[WebRTC] Flushed candidate error:', e);
        }
      }
    };

    const initMediaAndSocket = async () => {
      // Step A: Capture local media or create high quality fallback video stream
      if (!isSecureContext()) {
        console.warn('[WebRTC] Running in non-secure context. Camera/microphone access requires HTTPS.');
        setMediaError('Notice: Camera and microphone access requires HTTPS or localhost.');
      }

      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          activeMediaStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
            audio: true,
          });
        }
      } catch (err) {
        console.warn('[WebRTC] Primary webcam busy or locked by other tab, creating live fallback stream:', err.message);
        // Create live canvas video stream + audio fallback
        const canvasStream = createFallbackVideoStream(user?.name, user?.role);
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
          if (audioStream) {
            audioStream.getAudioTracks().forEach((t) => canvasStream.addTrack(t));
          }
        } catch (e) {}
        activeMediaStream = canvasStream;
      }

      if (activeMediaStream) {
        setLocalStream(activeMediaStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = activeMediaStream;
          localVideoRef.current.play().catch(() => {});
        }
      }

      // Step B: Connect Socket.IO
      socket = createSocket({ reconnectionAttempts: 5 });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[Socket] Connected to server as:', socket.id);

        // Join room
        socket.emit('join-room', {
          roomId,
          userId: user?._id || user?.id || 'guest-user',
          userName: user?.name || (isDoctor ? 'Doctor' : 'Patient'),
          userRole: user?.role || 'patient',
        });
      });

      // Step C: If peers already exist in room, create offer to connect
      socket.on('existing-participants', async ({ participants }) => {
        console.log('[Socket] Existing room participants:', participants);
        if (participants && participants.length > 0) {
          const firstPeer = participants[0];
          setRemotePeerInfo(firstPeer);
          setIsPeerConnected(true);

          // Initiate WebRTC Call
          const pc = createPeerConnection(firstPeer.socketId);
          try {
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            });
            await pc.setLocalDescription(offer);
            socket.emit('webrtc-offer', {
              targetSocketId: firstPeer.socketId,
              sdp: offer,
              callerInfo: {
                userName: user?.name,
                userRole: user?.role,
              },
            });
          } catch (offerErr) {
            console.error('[WebRTC] Error creating offer:', offerErr);
          }
        }
      });

      // Step D: When a new peer joins the room
      socket.on('user-joined', ({ socketId, userName, userRole }) => {
        console.log(`[Socket] Peer joined: ${userName} (${userRole})`);
        setRemotePeerInfo({ socketId, userName, userRole });
        setIsPeerConnected(true);
      });

      // Step E: Receive WebRTC Offer
      socket.on('webrtc-offer', async ({ senderSocketId, sdp, callerInfo }) => {
        console.log('[WebRTC] Received offer from:', senderSocketId);
        setRemotePeerInfo({ socketId: senderSocketId, ...callerInfo });
        const pc = createPeerConnection(senderSocketId);

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await flushIceCandidates(pc);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit('webrtc-answer', {
            targetSocketId: senderSocketId,
            sdp: answer,
          });
        } catch (ansErr) {
          console.error('[WebRTC] Error handling offer & creating answer:', ansErr);
        }
      });

      // Step F: Receive WebRTC Answer
      socket.on('webrtc-answer', async ({ senderSocketId, sdp }) => {
        console.log('[WebRTC] Received answer from:', senderSocketId);
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
            await flushIceCandidates(peerConnectionRef.current);
          } catch (err) {
            console.error('[WebRTC] Error setting remote description for answer:', err);
          }
        }
      });

      // Step G: Receive ICE Candidate
      socket.on('webrtc-ice-candidate', async ({ candidate }) => {
        if (candidate) {
          const pc = peerConnectionRef.current;
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (iceErr) {
              console.warn('[WebRTC] Error adding ICE candidate:', iceErr);
            }
          } else {
            pendingIceCandidates.push(candidate);
          }
        }
      });

      // Step H: Receive Real-Time Chat Message
      socket.on('chat-message', (incomingMsg) => {
        console.log('[Socket] New chat message received:', incomingMsg);
        setChatMessages((prev) => [...prev, incomingMsg]);
        setShowChat((currentShow) => {
          if (!currentShow) {
            setUnreadChatCount((count) => count + 1);
          }
          return currentShow;
        });
      });

      // Step I: Receive Live Captions from Peer (Translates directly to THIS user's active listening language)
      socket.on('live-captions', async ({ captionData }) => {
        if (captionData && captionData.original) {
          const incomingSourceLang = captionData.sourceLang || 'en';
          const myListeningLang = targetLangRef.current || 'ta';

          // Instant fast translation into this user's chosen listening language
          const syncTranslated = liveTranslationService.translateTextSync(
            captionData.original,
            incomingSourceLang,
            myListeningLang
          );

          setLiveCaptions({
            ...captionData,
            sourceLang: incomingSourceLang,
            targetLang: myListeningLang,
            translated: syncTranslated,
            isIncoming: true,
          });

          // Play translated speech voiceover on the listener's screen in their chosen listening language
          if (captionData.isFinal && speakVoiceoverRef.current) {
            liveTranslationService.speakTranslatedAudio(
              syncTranslated,
              myListeningLang
            );
          }

          // Asynchronously perform high-precision neural translation if final
          if (captionData.isFinal) {
            try {
              const neuralTranslated = await liveTranslationService.translateText(
                captionData.original,
                incomingSourceLang,
                myListeningLang
              );
              if (neuralTranslated && neuralTranslated !== syncTranslated) {
                setLiveCaptions((prev) =>
                  prev ? { ...prev, translated: neuralTranslated, targetLang: myListeningLang } : prev
                );
              }
            } catch (e) {}
          }
        }
      });

      // Step I-2: Receive Real-Time Video Frame from Peer
      socket.on('video-frame', ({ frameData }) => {
        if (frameData) {
          setRemoteVideoFrame(frameData);
          setHasRemoteStream(true);
          setIsPeerConnected(true);
        }
      });

      // Step J: Receive Real-Time Prescription Updates
      socket.on('prescription-updated', ({ prescription, notes, doctorName, updatedAt }) => {
        console.log('[Socket] Real-time prescription update received:', prescription);
        const finalRx = prescription || notes;
        setDoctorNotes(finalRx);
        setDoctorPrescriptionInput(finalRx);
        setPrescriptionLastUpdated(updatedAt);
        setPrescriptionAlert(`🔔 Live e-Prescription updated by ${doctorName} (${updatedAt})`);
        setTimeout(() => setPrescriptionAlert(null), 6000);
      });

      // Step K: Receive Synchronized Call End (Terminates call on BOTH screens)
      socket.on('call-ended', ({ endedBy, notes, prescription }) => {
        console.log('[Socket] Teleconsultation call ended by:', endedBy);
        if (activeMediaStream) {
          activeMediaStream.getTracks().forEach((track) => track.stop());
        }
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
        }
        if (notes || prescription) {
          const finalRx = notes || prescription;
          setDoctorNotes(finalRx);
          setDoctorPrescriptionInput(finalRx);
        }
        setCallEndedBy(endedBy || 'Remote participant');
        setCallEnded(true);
        setHasRemoteStream(false);
        setIsPeerConnected(false);
      });

      // Step L: Receive Peer Media Status Changes
      socket.on('peer-media-status-changed', ({ isAudioMuted, isVideoMuted }) => {
        setIsRemoteAudioMuted(isAudioMuted);
        setIsRemoteVideoMuted(isVideoMuted);
      });

      // Step M: Peer left room
      socket.on('user-left', () => {
        console.log('[Socket] Peer left the teleconsultation room');
        setIsPeerConnected(false);
        setHasRemoteStream(false);
        setRemotePeerInfo(null);
      });
    };

    initMediaAndSocket();

    // Cleanup on unmount
    return () => {
      if (activeMediaStream) {
        activeMediaStream.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.emit('leave-room', { roomId });
        socketRef.current.disconnect();
      }
    };
  }, [roomId, user]);

  // 3. Call Timer
  useEffect(() => {
    if (callEnded) return;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callEnded]);

  // 3b. Network QoS Monitor
  useEffect(() => {
    const unsubscribe = clinicalQoSController.subscribe((state) => {
      setNetworkQuality(state);
      if (state === 'GOOD' && !isPeerConnected && socketRef.current && !callEnded && callDuration > 0) {
        // Automatic reconnection attempt
        socketRef.current.connect();
        socketRef.current.emit('join-room', {
          roomId,
          userId: user?._id || user?.id || 'guest-user',
          userName: user?.name || (isDoctor ? 'Doctor' : 'Patient'),
          userRole: user?.role || 'patient',
        });
      }
    });

    const statsInterval = setInterval(async () => {
      if (peerConnectionRef.current && isPeerConnected) {
        try {
          const stats = await peerConnectionRef.current.getStats();
          const qosMetrics = clinicalQoSController.analyzeStats(stats);
          setNetworkStats(qosMetrics);
          
          // Adaptive Video based on QoS
          if (localStream) {
            const videoTracks = localStream.getVideoTracks();
            if (videoTracks.length > 0) {
              const senders = peerConnectionRef.current.getSenders();
              const videoSender = senders.find(s => s.track && s.track.kind === 'video');
              if (videoSender) {
                const parameters = videoSender.getParameters();
                if (!parameters.encodings || parameters.encodings.length === 0) {
                  parameters.encodings = [{}];
                }
                
                const adaptation = clinicalQoSController.getMediaAdaptation(qosMetrics.state);
                const targetBitrate = adaptation.targetBitrate;
                const targetScale = adaptation.scaleResolutionDownBy;
                const targetFramerate = adaptation.maxFramerate;

                // Only call setParameters() when values actually differ to avoid unnecessary renegotiations
                if (
                  parameters.encodings[0].maxBitrate !== targetBitrate ||
                  parameters.encodings[0].scaleResolutionDownBy !== targetScale ||
                  parameters.encodings[0].maxFramerate !== targetFramerate
                ) {
                  parameters.encodings[0].maxBitrate = targetBitrate;
                  parameters.encodings[0].scaleResolutionDownBy = targetScale;
                  parameters.encodings[0].maxFramerate = targetFramerate;
                  await videoSender.setParameters(parameters).catch(e => console.warn('Could not set video parameters', e));
                }

                // Translation adaptation: switch to subtitles-only under VERY_LOW to prioritize audio bandwidth
                if (qosMetrics.state === 'VERY_LOW' && speakVoiceover) {
                  setSpeakVoiceover(false);
                } else if (qosMetrics.state === 'GOOD' && !speakVoiceover) {
                  setSpeakVoiceover(true);
                }
              }
            }
          }
        } catch (e) {
          console.warn('[QoS] Failed to get stats', e);
        }
      } else if (!isPeerConnected && callDuration > 0 && !callEnded) {
         clinicalQoSController.setOffline();
      }
    }, 2000);

    return () => {
      clearInterval(statsInterval);
      unsubscribe();
    };
  }, [isPeerConnected, localStream, callDuration, callEnded]);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 4. Media Controls
  const toggleAudio = () => {
    const newMuted = !isAudioMuted;
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !newMuted;
      });
    }
    setIsAudioMuted(newMuted);

    if (socketRef.current) {
      socketRef.current.emit('toggle-media-status', {
        roomId,
        isAudioMuted: newMuted,
        isVideoMuted,
      });
    }
  };

  const toggleVideo = () => {
    const newMuted = !isVideoMuted;
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !newMuted;
      });
    }
    setIsVideoMuted(newMuted);

    if (socketRef.current) {
      socketRef.current.emit('toggle-media-status', {
        roomId,
        isAudioMuted,
        isVideoMuted: newMuted,
      });
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;

    const rawText = chatInput.trim();
    // Instant real-time local sync translation
    const syncTranslated = liveTranslationService.translateTextSync(rawText, sourceLang, targetLang);

    const newMsg = {
      id: 'msg-' + Date.now(),
      sender: user?.name || (isDoctor ? 'Doctor' : 'Patient'),
      senderRole: user?.role || 'patient',
      text: rawText,
      translatedText: syncTranslated,
    };

    if (socketRef.current) {
      socketRef.current.emit('send-chat-message', {
        roomId,
        message: newMsg,
      });
    } else {
      // Fallback
      setChatMessages((prev) => [
        ...prev,
        {
          ...newMsg,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }

    setChatInput('');

    // Fetch highest accuracy neural translation in background
    liveTranslationService.translateText(rawText, sourceLang, targetLang).then((neuralText) => {
      if (neuralText && neuralText !== syncTranslated) {
        setChatMessages((prev) =>
          prev.map((m) => (m.id === newMsg.id ? { ...m, translatedText: neuralText } : m))
        );
      }
    });
  };

  const handleOpenChat = () => {
    setShowChat(true);
    setShowPrescriptionDrawer(false);
    setShowTranslationSettings(false);
    setUnreadChatCount(0);
  };

  const handleOpenPrescription = () => {
    setShowPrescriptionDrawer(true);
    setShowChat(false);
    setShowTranslationSettings(false);
  };

  const handleToggleTranslationSettings = () => {
    setShowTranslationSettings(!showTranslationSettings);
    setShowChat(false);
    setShowPrescriptionDrawer(false);
  };

  // 5. Real-Time Prescription Sync Handler (Doctor -> Patient)
  const handleSyncPrescription = async (customText) => {
    const textToSync = typeof customText === 'string' ? customText : doctorPrescriptionInput;
    setDoctorNotes(textToSync);
    setDoctorPrescriptionInput(textToSync);
    setRxSavedToast(true);
    setTimeout(() => setRxSavedToast(false), 3000);

    // Broadcast over Socket in real-time
    if (socketRef.current) {
      socketRef.current.emit('update-prescription', {
        roomId,
        prescription: textToSync,
        notes: textToSync,
        doctorName: user?.name || 'Dr. Ananya Sharma',
      });
    }

    // Persist to backend DB if appointment ID is present
    if (appointment?._id && token) {
      try {
        await appointmentService.updateAppointmentStatus(token, appointment._id, {
          notes: textToSync,
          prescriptionSummary: textToSync,
          chatHistory: chatMessages,
        });
      } catch (err) {
        console.warn('Could not auto-save prescription to DB:', err.message);
      }
    }
  };

  // 6. Synchronized Call Termination (Ends call for BOTH parties)
  const handleEndCall = async () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Broadcast end-call event to ALL participants in room
    if (socketRef.current) {
      socketRef.current.emit('end-call', {
        roomId,
        endedBy: user?.name || (isDoctor ? 'Doctor' : 'Patient'),
        notes: doctorNotes,
        prescription: doctorNotes,
      });
      socketRef.current.emit('leave-room', { roomId });
    }

    // Persist appointment completion and full chat history to backend
    if (appointment?._id && token) {
      try {
        await appointmentService.updateAppointmentStatus(token, appointment._id, {
          status: 'completed',
          notes: doctorNotes,
          prescriptionSummary: doctorNotes,
          chatHistory: chatMessages,
        });
      } catch (err) {
        console.warn('Could not update status to completed:', err.message);
      }
    }

    setCallEndedBy('You');
    setCallEnded(true);
  };

  return (
    <div style={styles.roomContainer}>
      {/* Developer Simulation Panel */}
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.8)', padding: '10px', borderRadius: '8px', border: '1px solid #333' }}>
        <div style={{ color: '#FBBF24', fontSize: '10px', fontWeight: 'bold', marginBottom: '5px', textTransform: 'uppercase' }}>Test Mode / Dev Simulation</div>
        <div style={{ display: 'flex', gap: '5px' }}>
          {['GOOD', 'MEDIUM', 'VERY_LOW', 'OFFLINE'].map(state => (
            <button
              key={state}
              type="button"
              onClick={() => clinicalQoSController.setSimulatedState(state)}
              style={{
                backgroundColor: networkQuality === state ? '#6D28D9' : '#333',
                color: 'white', border: 'none', padding: '4px 8px', fontSize: '10px', borderRadius: '4px', cursor: 'pointer'
              }}
            >
              {state}
            </button>
          ))}
        </div>
      </div>

      {/* Header Bar */}
      <div style={styles.roomHeader}>
        <div style={styles.peerInfoRow}>
          <div style={styles.peerAvatar}>
            {isDoctor ? <User size={20} color="#6D28D9" /> : <Stethoscope size={20} color="#6D28D9" />}
          </div>
          <div style={styles.peerMeta}>
            <h2 style={styles.peerNameText}>{peerName}</h2>
            <span style={styles.peerSubText}>{peerSubtitle}</span>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.tokenPill}>
            <span>{appointment?.tokenNumber || 'TK-08'}</span>
          </div>
          <div style={{...styles.durationTimerBadge, backgroundColor: networkQuality === 'GOOD' ? '#10B981' : networkQuality === 'MEDIUM' ? '#F59E0B' : '#EF4444'}}>
            {networkQuality === 'OFFLINE' || networkQuality === 'VERY_LOW' ? <WifiOff size={13} color="#FFFFFF" /> : <Wifi size={13} color="#FFFFFF" />}
            <span style={{...styles.timerText, color: '#FFFFFF', fontSize: '11px', marginLeft: '4px', fontWeight: networkStats?.isSimulated ? 'bold' : 'normal'}}>
              {networkStats?.isSimulated ? `SIMULATED: ${networkQuality}` : `${networkQuality} ${networkStats?.rtt ? `(${Math.round(networkStats.rtt * 1000)}ms)` : ''}`}
            </span>
          </div>
          <div style={styles.durationTimerBadge}>
            <Clock size={13} color="#DC2626" />
            <span style={styles.timerText}>{formatTimer(callDuration)}</span>
          </div>
        </div>
      </div>

      {/* Real-Time Live Prescription Toast Banner */}
      {prescriptionAlert && (
        <div style={styles.rxAlertBanner}>
          <Pill size={16} color="#059669" />
          <span style={{ flex: 1, fontWeight: '700' }}>{prescriptionAlert}</span>
          <button
            type="button"
            onClick={handleOpenPrescription}
            style={styles.viewRxLinkBtn}
          >
            View Rx
          </button>
        </div>
      )}

      {/* Media Notice / Fallback Message if any */}
      {mediaError && (
        <div style={styles.mediaNoticeBanner}>
          <ShieldCheck size={16} color="#059669" />
          <span>{mediaError}</span>
        </div>
      )}

      {/* CALL ENDED SYNCHRONIZED SUMMARY MODAL */}
      {callEnded ? (
        <div className="card-base" style={styles.endedCard}>
          <div style={styles.endedIconCircle}>
            <CheckCircle2 size={42} color="#FFFFFF" strokeWidth={2.8} />
          </div>
          <h2 style={styles.endedTitle}>{t('teleconsult.callEnded')}</h2>
          <p style={styles.endedSub}>
            {callEndedBy && callEndedBy !== 'You'
              ? `Call was concluded by ${callEndedBy}.`
              : t('teleconsult.callEndedMsg')}
          </p>

          <div style={styles.summaryBox}>
            <div style={styles.summaryHead}>
              <FileText size={16} color="#6D28D9" />
              <strong>Official Clinical e-Prescription & Consultation Record</strong>
            </div>

            {isDoctor ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  rows={4}
                  value={doctorPrescriptionInput}
                  onChange={(e) => setDoctorPrescriptionInput(e.target.value)}
                  style={styles.rxTextarea}
                  placeholder="Enter final e-prescription and clinical advice..."
                />
                <button
                  type="button"
                  onClick={() => handleSyncPrescription(doctorPrescriptionInput)}
                  style={styles.updateRxFinalBtn}
                >
                  <CheckCheck size={16} color="#FFFFFF" />
                  <span>Update & Save e-Prescription</span>
                </button>
              </div>
            ) : (
              <div style={styles.patientRxCard}>
                <div style={styles.rxCardDoctorHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Stethoscope size={15} color="#6D28D9" />
                    <strong>{appointment?.doctorName || 'Dr. Ananya Sharma'} ({appointment?.doctorSpecialization || 'General Physician'})</strong>
                  </div>
                  <span style={styles.rxVerifiedBadge}>✓ Digital e-Prescription</span>
                </div>
                <p style={styles.summaryNotes}>{doctorNotes || 'No specific prescription noted.'}</p>
                {doctorNotes && (
                  <button
                    type="button"
                    style={{
                      marginTop: '8px',
                      padding: '8px 14px',
                      backgroundColor: '#059669',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      width: '100%',
                      boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                    }}
                    onClick={() => setShowOrderModal(true)}
                  >
                    <ShoppingBag size={15} color="#FFFFFF" strokeWidth={2.4} />
                    <span>Order Prescribed Medicines from Nearby Shop</span>
                  </button>
                )}
              </div>
            )}
          </div>


          <button type="button" onClick={onLeaveRoom} style={styles.returnBtn}>
            <span>{t('teleconsult.returnHome')}</span>
          </button>
        </div>
      ) : (
        <div style={styles.videoStage}>
          {/* Live Voice AI Controller Bar */}
          {isLiveTranslationActive && (
            <div style={styles.liveVoiceControlBar}>
              {/* Mic Status & Live Audio Level Meter */}
              <div
                style={styles.micStatusBadge}
                onClick={() => {
                  try {
                    speechRecognizerRef.current?.start();
                  } catch (e) {}
                }}
                title="Click to restart or verify microphone listening"
              >
                <div style={{
                  ...styles.pulsingDot,
                  backgroundColor: speechStatus === 'listening' ? '#10B981' : speechStatus === 'error' ? '#EF4444' : '#F59E0B',
                  boxShadow: speechStatus === 'listening' ? '0 0 8px #10B981' : 'none',
                }} />
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#FFFFFF' }}>
                  {speechStatus === 'listening'
                    ? '🟢 Mic Live'
                    : speechStatus === 'error'
                    ? '⚠️ Enable Mic'
                    : '🟡 AI Ready'}
                </span>

                {/* Audio Waveform Meter */}
                <div style={styles.audioWaveformContainer}>
                  {[15, 45, 80, 55, 30].map((h, i) => (
                    <div
                      key={i}
                      style={{
                        ...styles.audioWaveformBar,
                        height: `${Math.max(4, Math.min(18, (micVolume / 100) * h * 1.5))}px`,
                        backgroundColor: micVolume > 10 ? '#34D399' : '#64748B',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* 1. Spoken Language Selector (What I Speak) */}
              <div style={styles.langPillGroup}>
                <span style={styles.langGroupLabel}>🗣️ I Speak:</span>
                {[
                  { id: 'en', label: 'English' },
                  { id: 'hi', label: 'हिन्दी' },
                  { id: 'ta', label: 'தமிழ்' },
                  { id: 'te', label: 'తెలుగు' },
                  { id: 'kn', label: 'ಕನ್ನಡ' },
                  { id: 'ml', label: 'മലയാളം' },
                ].map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setSourceLang(l.id)}
                    style={{
                      ...styles.langPillBtn,
                      backgroundColor: sourceLang === l.id ? '#6D28D9' : 'rgba(255,255,255,0.12)',
                      color: '#FFFFFF',
                      borderColor: sourceLang === l.id ? '#C4B5FD' : 'rgba(255,255,255,0.1)',
                      boxShadow: sourceLang === l.id ? '0 0 10px rgba(109, 40, 217, 0.6)' : 'none',
                    }}
                    title={`You speak in ${l.label}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>

              {/* 2. Listening / Subtitle Language Selector (What I Hear / Read) */}
              <div style={styles.langPillGroup}>
                <span style={{ ...styles.langGroupLabel, color: '#34D399' }}>🎧 Listen in:</span>
                {[
                  { id: 'ta', label: 'தமிழ்' },
                  { id: 'en', label: 'English' },
                  { id: 'hi', label: 'हिन्दी' },
                  { id: 'te', label: 'తెలుగు' },
                  { id: 'kn', label: 'ಕನ್ನಡ' },
                  { id: 'ml', label: 'മലയാളം' },
                ].map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      setTargetLang(l.id);
                      if (liveCaptions && liveCaptions.original) {
                        const newTrans = liveTranslationService.translateTextSync(
                          liveCaptions.original,
                          liveCaptions.sourceLang || sourceLang,
                          l.id
                        );
                        setLiveCaptions({
                          ...liveCaptions,
                          targetLang: l.id,
                          translated: newTrans,
                        });
                        if (speakVoiceover) {
                          liveTranslationService.speakTranslatedAudio(newTrans, l.id);
                        }
                      }
                    }}
                    style={{
                      ...styles.langPillBtn,
                      backgroundColor: targetLang === l.id ? '#059669' : 'rgba(255,255,255,0.12)',
                      color: '#FFFFFF',
                      borderColor: targetLang === l.id ? '#6EE7B7' : 'rgba(255,255,255,0.1)',
                      boxShadow: targetLang === l.id ? '0 0 10px rgba(5, 150, 105, 0.6)' : 'none',
                    }}
                    title={`Translate incoming voice to ${l.label}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>

              {/* AI Voiceover Toggle */}
              <button
                type="button"
                onClick={() => setSpeakVoiceover(!speakVoiceover)}
                style={{
                  ...styles.voiceoverToggleBtn,
                  backgroundColor: speakVoiceover ? 'rgba(5, 150, 105, 0.35)' : 'rgba(255,255,255,0.1)',
                  borderColor: speakVoiceover ? '#34D399' : 'rgba(255,255,255,0.15)',
                  color: speakVoiceover ? '#34D399' : '#94A3B8',
                }}
                title="Toggle AI voiceover speech out loud"
              >
                {speakVoiceover ? <Volume2 size={13} color="#34D399" /> : <VolumeX size={13} color="#94A3B8" />}
                <span>{speakVoiceover ? 'Voice ON' : 'Voice OFF'}</span>
              </button>

              {/* Quick Test Voice Chips */}
              <div style={styles.quickVoiceChips}>
                <span style={styles.langGroupLabel}>Quick Test:</span>
                <button
                  type="button"
                  onClick={() => broadcastCaption(
                    sourceLang === 'hi'
                      ? 'नमस्ते डॉक्टर, मुझे तेज बुखार और सिरदर्द है।'
                      : sourceLang === 'ta'
                      ? 'வணக்கம் டாக்டர், எனக்கு காய்ச்சல் மற்றும் தலைவலி உள்ளது.'
                      : sourceLang === 'te'
                      ? 'నమస్కారం డాక్టర్, నాకు తీవ్రమైన జ్వరం మరియు తలనొప్పి ఉంది.'
                      : sourceLang === 'kn'
                      ? 'ನಮಸ್ಕಾರ ವೈದ್ಯರೇ, ನನಗೆ ತೀವ್ರ ಜ್ವರ ಮತ್ತು ತಲೆನೋವು ಇದೆ.'
                      : sourceLang === 'ml'
                      ? 'നമസ്കാരം ഡോക്ടർ, എനിക്ക് കടുത്ത പനിയും തലവേദനയും ഉണ്ട്.'
                      : 'Hello Doctor, I have high fever and severe headache.'
                  )}
                  style={styles.quickSpeechTestBtn}
                >
                  🎙️ {sourceLang === 'ta'
                    ? '"காய்ச்சல் உள்ளது"'
                    : sourceLang === 'hi'
                    ? '"तेज बुखार है"'
                    : sourceLang === 'te'
                    ? '"జ్వరం ఉంది"'
                    : sourceLang === 'kn'
                    ? '"ಜ್ವರ ಇದೆ"'
                    : sourceLang === 'ml'
                    ? '"കടുത്ത പനിയുണ്ട്"'
                    : '"I have fever"'}
                </button>
                <button
                  type="button"
                  onClick={() => broadcastCaption(
                    sourceLang === 'hi'
                      ? 'भोजन के बाद यह दवा दिन में दो बार लें।'
                      : sourceLang === 'ta'
                      ? 'உணவுக்குப் பிறகு இந்த மருந்தை தினமும் இரண்டு முறை உட்கொள்ளவும்.'
                      : sourceLang === 'te'
                      ? 'భోజనం తర్వాత ఈ మందును రోజుకు రెండుసార్లు తీసుకోండి.'
                      : sourceLang === 'kn'
                      ? 'ಊಟದ ನಂತರ ಈ ಔಷಧಿಯನ್ನು ದಿನಕ್ಕೆ ಎರಡು ಬಾರಿ ತೆಗೆದುಕೊಳ್ಳಿ.'
                      : sourceLang === 'ml'
                      ? 'ഭക്ഷണത്തിന് ശേഷം ഈ മരുന്ന് ദിവസവും രണ്ട് നേരം കഴിക്കുക.'
                      : 'Take this medicine twice a day after meals.'
                  )}
                  style={styles.quickSpeechTestBtn}
                >
                  🎙️ {sourceLang === 'ta'
                    ? '"மருந்து உட்கொள்ளவும்"'
                    : sourceLang === 'hi'
                    ? '"दवा दो बार लें"'
                    : sourceLang === 'te'
                    ? '"మందు తీసుకోండి"'
                    : sourceLang === 'kn'
                    ? '"ಔಷಧಿ ತೆಗೆದುಕೊಳ್ಳಿ"'
                    : sourceLang === 'ml'
                    ? '"മരുന്ന് കഴിക്കുക"'
                    : '"Take medicine"'}
                </button>
              </div>
            </div>
          )}

          {/* Main Remote Video Container */}
          <div style={styles.remoteVideoContainer}>
            {/* Live Synchronized Remote Video Frame (Guarantees 100% video visibility across all tabs & networks) */}
            {networkQuality === 'OFFLINE' ? (
              <div style={{...styles.remoteVideoElement, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000'}}>
                 <WifiOff size={48} color="#EF4444" />
                 <h2 style={{color: 'white', marginTop: '16px'}}>Connection Lost</h2>
                 <p style={{color: '#94A3B8'}}>Attempting to reconnect...</p>
              </div>
            ) : networkQuality === 'VERY_LOW' && !remoteVideoFrame ? (
              <div style={{...styles.remoteVideoElement, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000'}}>
                 <Wifi size={48} color="#FBBF24" />
                 <h2 style={{color: 'white', marginTop: '16px'}}>Poor Network</h2>
                 <p style={{color: '#94A3B8'}}>Video degraded to preserve audio and clinical chat</p>
                 <audio ref={remoteVideoRef} autoPlay />
              </div>
            ) : remoteVideoFrame && !isRemoteVideoMuted ? (
              <img
                src={remoteVideoFrame}
                alt="Remote Live Video Stream"
                style={styles.remoteVideoElement}
              />
            ) : (
              /* Live WebRTC Remote Video Stream Element */
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) => e.target.play().catch(() => {})}
                style={{
                  ...styles.remoteVideoElement,
                  display: hasRemoteStream && !isRemoteVideoMuted ? 'block' : 'none',
                }}
              />
            )}

            {/* Peer Waiting / Audio Only / Cam Off Backdrop */}
            {(!hasRemoteStream || isRemoteVideoMuted) && !remoteVideoFrame && (
              <div style={styles.simulatedRemoteFeed}>
                <div style={styles.doctorBackdrop}>
                  <div style={styles.pulseRing}>
                    <div style={styles.doctorLiveAvatar}>
                      {isDoctor ? (
                        <User size={60} color="#6D28D9" strokeWidth={2.2} />
                      ) : (
                        <Stethoscope size={60} color="#6D28D9" strokeWidth={2.2} />
                      )}
                    </div>
                  </div>
                  <h3 style={styles.livePeerName}>{peerName}</h3>
                  <span
                    style={{
                      ...styles.livePeerStatus,
                      color: isPeerConnected ? '#34D399' : '#FBBF24',
                    }}
                  >
                    {isPeerConnected ? '🟢 Live WebRTC Peer Connected' : '🟡 Waiting for peer to enter room...'}
                  </span>
                  {isRemoteAudioMuted && (
                    <span style={styles.remoteMutedTag}>Peer Microphone Muted</span>
                  )}
                  {isRemoteVideoMuted && hasRemoteStream && (
                    <span style={styles.remoteMutedTag}>Peer Camera Off</span>
                  )}
                  <div style={styles.encryptionBadge}>
                    <ShieldCheck size={14} color="#059669" />
                    <span>{t('teleconsult.encrypted')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* LIVE AI TRANSLATION SUBTITLES OVERLAY */}
            {isLiveTranslationActive && liveCaptions && (
              <div style={styles.liveCaptionsOverlay}>
                <div style={styles.captionsHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={13} color="#F59E0B" />
                    <span style={styles.captionsSpeakerTag}>
                      {liveCaptions.speaker} ({(liveCaptions.sourceLang || sourceLang).toUpperCase()} ➔ {(liveCaptions.targetLang || targetLang).toUpperCase()} Live AI)
                    </span>
                    <span style={styles.liveCaptionPill}>
                      {liveCaptions.targetLang === 'ta'
                        ? 'தமிழ்'
                        : liveCaptions.targetLang === 'hi'
                        ? 'हिन्दी'
                        : liveCaptions.targetLang === 'te'
                        ? 'తెలుగు'
                        : liveCaptions.targetLang === 'kn'
                        ? 'ಕನ್ನಡ'
                        : liveCaptions.targetLang === 'ml'
                        ? 'മലയാളം'
                        : 'English'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        liveTranslationService.speakTranslatedAudio(
                          liveCaptions.translated,
                          liveCaptions.targetLang || targetLang
                        );
                      }}
                      style={styles.replayAudioBtn}
                      title="Replay Spoken Audio"
                    >
                      <Volume2 size={12} color="#34D399" />
                      <span>Listen Again</span>
                    </button>
                    <span style={styles.captionTimeTag}>{liveCaptions.timestamp}</span>
                  </div>
                </div>
                <p style={styles.captionOriginalText}>Spoken: "{liveCaptions.original}"</p>
                <p style={styles.captionTranslatedText}>
                  ✨ {liveCaptions.translated}
                </p>
              </div>
            )}

            {/* Local PiP Video Preview Overlay */}
            <div style={styles.localPipContainer}>
              {isVideoMuted ? (
                <div style={styles.pipMutedBackdrop}>
                  <VideoOff size={20} color="#94A3B8" />
                  <span style={styles.pipMutedText}>Camera Off</span>
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={(e) => e.target.play().catch(() => {})}
                  style={styles.localVideoElement}
                />
              )}
              <span style={styles.pipLabel}>You ({user?.name || 'Self'})</span>
            </div>

            {/* Side In-Call Real-Time Chat Drawer */}
            {showChat && (
              <div style={styles.inCallSideDrawer}>
                <div style={styles.drawerHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageSquare size={16} color="#6D28D9" />
                    <span style={styles.drawerTitle}>{t('teleconsult.chatTitle')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowChat(false)}
                    style={styles.closeDrawerBtn}
                    aria-label="Close Chat"
                  >
                    <X size={16} color="#64748B" />
                  </button>
                </div>

                <div style={styles.chatMessagesList}>
                  {chatMessages.map((msg, idx) => {
                    const isSelf = msg.sender === user?.name || msg.senderRole === user?.role;
                    const isSystem = msg.senderRole === 'system';
                    return (
                      <div
                        key={msg.id || idx}
                        style={{
                          ...styles.chatBubble,
                          alignSelf: isSystem ? 'center' : isSelf ? 'flex-end' : 'flex-start',
                          backgroundColor: isSystem
                            ? '#FEF3C7'
                            : isSelf
                            ? '#6D28D9'
                            : '#F1F5F9',
                          color: isSystem ? '#92400E' : isSelf ? '#FFFFFF' : '#1E293B',
                        }}
                      >
                        <div style={styles.chatMetaRow}>
                          <span style={styles.chatSenderLabel}>{isSelf ? 'You' : msg.sender}</span>
                          <span style={styles.chatTimeLabel}>{msg.timestamp}</span>
                        </div>
                        <p style={styles.chatText}>{msg.text}</p>
                        {msg.translatedText && msg.translatedText !== msg.text && (
                          <div style={styles.chatTranslationBadge}>
                            <Languages size={12} color="#059669" />
                            <span style={styles.chatTranslationText}>{msg.translatedText}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={chatBottomRef} />
                </div>

                <form onSubmit={handleSendMessage} style={styles.chatInputRow}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {chatInput.trim() && (
                      <div style={styles.liveChatPreviewBox}>
                        <Sparkles size={12} color="#059669" />
                        <span style={styles.liveChatPreviewText}>
                          {liveTranslationService.translateTextSync(chatInput, sourceLang, targetLang)}
                        </span>
                      </div>
                    )}
                    <input
                      type="text"
                      placeholder={t('teleconsult.chatPlaceholder')}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      style={styles.chatInput}
                    />
                  </div>
                  <button type="submit" style={styles.sendMsgBtn} aria-label="Send Message">
                    <Send size={15} color="#FFFFFF" />
                  </button>
                </form>
              </div>
            )}

            {/* Side In-Call Live e-Prescription Drawer */}
            {showPrescriptionDrawer && (
              <div style={styles.inCallSideDrawer}>
                <div style={styles.drawerHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Pill size={16} color="#059669" />
                    <span style={styles.drawerTitle}>Live Digital e-Prescription</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPrescriptionDrawer(false)}
                    style={styles.closeDrawerBtn}
                    aria-label="Close Prescription"
                  >
                    <X size={16} color="#64748B" />
                  </button>
                </div>

                <div style={styles.prescriptionDrawerContent}>
                  {rxSavedToast && (
                    <div style={styles.rxSavedAlert}>
                      <CheckCircle2 size={15} color="#059669" />
                      <span>Prescription synced to patient's screen in real-time!</span>
                    </div>
                  )}

                  {isDoctor ? (
                    <div style={styles.doctorRxEditorBox}>
                      <div style={styles.editorPromptRow}>
                        <span style={styles.editorPrompt}>Write / Edit Prescription for Patient:</span>
                        {prescriptionLastUpdated && (
                          <span style={styles.lastUpdatedText}>Synced {prescriptionLastUpdated}</span>
                        )}
                      </div>

                      <textarea
                        rows={6}
                        value={doctorPrescriptionInput}
                        onChange={(e) => setDoctorPrescriptionInput(e.target.value)}
                        style={styles.rxTextarea}
                        placeholder="Enter medicine names, dosages (1-0-1), duration, and clinical advice..."
                      />

                      {/* Quick Prescription Presets */}
                      <div style={styles.presetsTray}>
                        <span style={styles.presetsLabel}>Quick Presets:</span>
                        {PRESCRIPTION_PRESETS.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              const newRx = doctorPrescriptionInput
                                ? `${doctorPrescriptionInput}\n${p}`
                                : p;
                              setDoctorPrescriptionInput(newRx);
                            }}
                            style={styles.presetChip}
                          >
                            + {p.split(' ')[0]}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSyncPrescription(doctorPrescriptionInput)}
                        style={styles.syncRxBtn}
                      >
                        <Send size={16} color="#FFFFFF" />
                        <span>Send Live Prescription to Patient</span>
                      </button>
                    </div>
                  ) : (
                    <div style={styles.patientRxLiveView}>
                      <div style={styles.rxCardDoctorHeader}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.88rem', color: '#1E1B4B' }}>{peerName}</h4>
                          <span style={{ fontSize: '0.72rem', color: '#6D28D9' }}>{peerSubtitle}</span>
                        </div>
                        <span style={styles.rxLiveBadge}>🟢 Real-Time Synced</span>
                      </div>

                      <div style={styles.patientRxBody}>
                        <p style={styles.rxBodyText}>
                          {doctorNotes || 'Doctor is reviewing your symptoms. Prescriptions will appear here in real-time.'}
                        </p>
                      </div>

                      {doctorNotes && (
                        <button
                          type="button"
                          style={{
                            margin: '8px 0',
                            padding: '8px 12px',
                            backgroundColor: '#059669',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: '800',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(5, 150, 105, 0.2)',
                          }}
                          onClick={() => setShowOrderModal(true)}
                        >
                          <ShoppingBag size={14} color="#FFFFFF" strokeWidth={2.4} />
                          <span>Order Medicines Now</span>
                        </button>
                      )}

                      <p style={styles.rxDisclaimer}>
                        Official encrypted tele-prescription generated by Primary Health Centre Tele-Consult Network.
                      </p>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* Side In-Call Live AI Translation Settings Drawer */}
            {showTranslationSettings && (
              <div style={styles.inCallSideDrawer}>
                <div style={styles.drawerHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Languages size={16} color="#6D28D9" />
                    <span style={styles.drawerTitle}>Live AI Audio Translation</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTranslationSettings(false)}
                    style={styles.closeDrawerBtn}
                    aria-label="Close Settings"
                  >
                    <X size={16} color="#64748B" />
                  </button>
                </div>

                <div style={styles.translationSettingsContent}>
                  {/* Active Toggle */}
                  <div style={styles.settingCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '0.82rem', color: '#1E1B4B' }}>Live Speech Recognition</strong>
                        <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: '#64748B' }}>
                          Auto-transcribes & translates spoken voice
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsLiveTranslationActive(!isLiveTranslationActive)}
                        style={{
                          ...styles.togglePillBtn,
                          backgroundColor: isLiveTranslationActive ? '#DCFCE7' : '#F1F5F9',
                          color: isLiveTranslationActive ? '#166534' : '#64748B',
                          border: isLiveTranslationActive ? '1px solid #86EFAC' : '1px solid #CBD5E1',
                        }}
                      >
                        {isLiveTranslationActive ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>

                  {/* Language Direction */}
                  <div style={styles.settingCard}>
                    <strong style={{ fontSize: '0.8rem', color: '#1E1B4B' }}>Language Direction:</strong>
                    <div style={styles.langSelectGrid}>
                      <div>
                        <label style={styles.langLabel}>Spoken Language (Input):</label>
                        <select
                          value={sourceLang}
                          onChange={(e) => setSourceLang(e.target.value)}
                          style={styles.langSelect}
                        >
                          <option value="en">English (English)</option>
                          <option value="hi">Hindi (हिन्दी)</option>
                          <option value="ta">Tamil (தமிழ்)</option>
                          <option value="te">Telugu (తెలుగు)</option>
                          <option value="kn">Kannada (ಕನ್ನಡ)</option>
                          <option value="ml">Malayalam (മലയാളം)</option>
                        </select>
                      </div>

                      <div>
                        <label style={styles.langLabel}>Translate To (Output):</label>
                        <select
                          value={targetLang}
                          onChange={(e) => setTargetLang(e.target.value)}
                          style={styles.langSelect}
                        >
                          <option value="hi">Hindi (हिन्दी)</option>
                          <option value="en">English (English)</option>
                          <option value="ta">Tamil (தமிழ்)</option>
                          <option value="te">Telugu (తెలుగు)</option>
                          <option value="kn">Kannada (ಕನ್ನಡ)</option>
                          <option value="ml">Malayalam (മലയാളം)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Audio Voiceover Toggle */}
                  <div style={styles.settingCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '0.82rem', color: '#1E1B4B' }}>AI Voiceover (Speak Out)</strong>
                        <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: '#64748B' }}>
                          Speaks translated speech aloud in real-time
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSpeakVoiceover(!speakVoiceover)}
                        style={{
                          ...styles.togglePillBtn,
                          backgroundColor: speakVoiceover ? '#EDE9FE' : '#F1F5F9',
                          color: speakVoiceover ? '#6D28D9' : '#64748B',
                          border: speakVoiceover ? '1px solid #C4B5FD' : '1px solid #CBD5E1',
                        }}
                      >
                        {speakVoiceover ? 'VOICE ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Call Controls Toolbar */}
          <div style={styles.controlsBar}>
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={toggleAudio}
              style={{
                ...styles.controlCircleBtn,
                backgroundColor: isAudioMuted ? '#DC2626' : '#EDE9FE',
                color: isAudioMuted ? '#FFFFFF' : '#6D28D9',
              }}
              title={isAudioMuted ? t('teleconsult.unmute') : t('teleconsult.mute')}
              aria-label="Toggle Audio"
            >
              {isAudioMuted ? <MicOff size={20} strokeWidth={2.4} /> : <Mic size={20} strokeWidth={2.4} />}
            </button>

            {/* Video Toggle */}
            <button
              type="button"
              onClick={toggleVideo}
              style={{
                ...styles.controlCircleBtn,
                backgroundColor: isVideoMuted ? '#DC2626' : '#EDE9FE',
                color: isVideoMuted ? '#FFFFFF' : '#6D28D9',
              }}
              title={isVideoMuted ? t('teleconsult.videoOn') : t('teleconsult.videoOff')}
              aria-label="Toggle Video"
            >
              {isVideoMuted ? <VideoOff size={20} strokeWidth={2.4} /> : <Video size={20} strokeWidth={2.4} />}
            </button>

            {/* Live AI Audio Translation Toggle */}
            <button
              type="button"
              onClick={handleToggleTranslationSettings}
              style={{
                ...styles.controlCircleBtn,
                backgroundColor: isLiveTranslationActive ? '#EDE9FE' : '#F1F5F9',
                color: isLiveTranslationActive ? '#6D28D9' : '#64748B',
                borderColor: isLiveTranslationActive ? '#C4B5FD' : 'transparent',
              }}
              title="Live AI Translation & Captions"
              aria-label="Live AI Translation"
            >
              <Languages size={20} strokeWidth={2.4} />
            </button>

            {/* Prescription Drawer Toggle */}
            <button
              type="button"
              onClick={showPrescriptionDrawer ? () => setShowPrescriptionDrawer(false) : handleOpenPrescription}
              style={{
                ...styles.controlCircleBtn,
                backgroundColor: showPrescriptionDrawer ? '#059669' : '#ECFDF5',
                color: showPrescriptionDrawer ? '#FFFFFF' : '#059669',
              }}
              title="Live e-Prescription"
              aria-label="Toggle Live Prescription"
            >
              <Pill size={20} strokeWidth={2.4} />
            </button>

            {/* Chat Toggle with Unread Badge */}
            <button
              type="button"
              onClick={showChat ? () => setShowChat(false) : handleOpenChat}
              style={{
                ...styles.controlCircleBtn,
                position: 'relative',
                backgroundColor: showChat ? '#6D28D9' : '#EDE9FE',
                color: showChat ? '#FFFFFF' : '#6D28D9',
              }}
              title={t('teleconsult.chatTitle')}
              aria-label="Toggle In-Call Chat"
            >
              <MessageSquare size={20} strokeWidth={2.4} />
              {unreadChatCount > 0 && !showChat && (
                <span style={styles.unreadBadge}>{unreadChatCount}</span>
              )}
            </button>

            {/* End Call Button (Synchronously terminates for both parties) */}
            <button
              type="button"
              onClick={handleEndCall}
              style={styles.endCallCircleBtn}
              title={t('teleconsult.endCall')}
              aria-label="End Call"
            >
              <PhoneOff size={22} color="#FFFFFF" strokeWidth={2.6} />
            </button>
          </div>
        </div>
      )}

      {/* Prescription Order Modal for In-Call / Post-Call Patient Ordering */}
      {showOrderModal && (
        <OrderMedicineModal
          isOpen={showOrderModal}
          prescription={{
            title: `e-Prescription: Consultation with ${peerName || appointment?.doctorName || 'Doctor'}`,
            doctorName: peerName || appointment?.doctorName || 'Consulting Physician',
            textContent: doctorNotes,
            notes: doctorNotes,
          }}
          onClose={() => setShowOrderModal(false)}
          onOrderSuccess={() => setShowOrderModal(false)}
        />
      )}
    </div>
  );
};


const styles = {
  roomContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    height: '100%',
  },
  roomHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #DDD6FE',
    borderRadius: '16px',
    padding: '10px 14px',
    boxShadow: '0 2px 8px rgba(109, 40, 217, 0.06)',
  },
  peerInfoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  peerAvatar: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    backgroundColor: '#EDE9FE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  peerMeta: {
    display: 'flex',
    flexDirection: 'column',
  },
  peerNameText: {
    fontSize: '0.92rem',
    fontWeight: '800',
    color: '#1E1B4B',
    margin: 0,
  },
  peerSubText: {
    fontSize: '0.72rem',
    color: '#6D28D9',
    fontWeight: '600',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  tokenPill: {
    backgroundColor: '#F5F3FF',
    border: '1px solid #DDD6FE',
    color: '#6D28D9',
    fontWeight: '800',
    fontSize: '0.74rem',
    padding: '3px 8px',
    borderRadius: '8px',
  },
  durationTimerBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '8px',
    padding: '3px 8px',
  },
  timerText: {
    fontSize: '0.74rem',
    fontWeight: '800',
    color: '#DC2626',
    fontVariantNumeric: 'tabular-nums',
  },
  rxAlertBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#ECFDF5',
    border: '1.5px solid #A7F3D0',
    borderRadius: '12px',
    padding: '8px 12px',
    color: '#065F46',
    fontSize: '0.78rem',
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.15)',
  },
  viewRxLinkBtn: {
    backgroundColor: '#059669',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    padding: '3px 8px',
    fontSize: '0.7rem',
    fontWeight: '800',
    cursor: 'pointer',
  },
  mediaNoticeBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#ECFDF5',
    border: '1px solid #A7F3D0',
    borderRadius: '10px',
    padding: '8px 12px',
    color: '#065F46',
    fontSize: '0.74rem',
    fontWeight: '600',
  },
  videoStage: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  remoteVideoContainer: {
    position: 'relative',
    width: '100%',
    height: '380px',
    backgroundColor: '#0F172A',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)',
  },
  remoteVideoElement: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  simulatedRemoteFeed: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at center, #1E1B4B 0%, #0F172A 100%)',
  },
  doctorBackdrop: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    textAlign: 'center',
    padding: '16px',
  },
  pulseRing: {
    padding: '10px',
    borderRadius: '50%',
    backgroundColor: 'rgba(109, 40, 217, 0.15)',
    boxShadow: '0 0 0 8px rgba(109, 40, 217, 0.1)',
  },
  doctorLiveAvatar: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    backgroundColor: '#EDE9FE',
    border: '3px solid #8B5CF6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePeerName: {
    fontSize: '1.05rem',
    fontWeight: '800',
    color: '#F8FAFC',
    margin: 0,
  },
  livePeerStatus: {
    fontSize: '0.74rem',
    fontWeight: '700',
  },
  remoteMutedTag: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    color: '#FCA5A5',
    border: '1px solid rgba(220, 38, 38, 0.4)',
    borderRadius: '6px',
    padding: '2px 8px',
    fontSize: '0.64rem',
    fontWeight: '700',
  },
  encryptionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    color: '#34D399',
    border: '1px solid rgba(52, 211, 153, 0.3)',
    borderRadius: '20px',
    padding: '3px 10px',
    fontSize: '0.68rem',
    fontWeight: '700',
    marginTop: '4px',
  },
  liveCaptionsOverlay: {
    position: 'absolute',
    bottom: '14px',
    left: '14px',
    right: '130px',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    backdropFilter: 'blur(10px)',
    border: '1.5px solid rgba(139, 92, 246, 0.5)',
    borderRadius: '14px',
    padding: '10px 14px',
    zIndex: 6,
    boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
  },
  liveCaptionPill: {
    fontSize: '0.62rem',
    fontWeight: '800',
    color: '#065F46',
    backgroundColor: '#D1FAE5',
    border: '1px solid #6EE7B7',
    padding: '1px 7px',
    borderRadius: '10px',
  },
  replayAudioBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'rgba(5, 150, 105, 0.25)',
    border: '1px solid rgba(52, 211, 153, 0.4)',
    color: '#34D399',
    borderRadius: '6px',
    padding: '2px 7px',
    fontSize: '0.64rem',
    fontWeight: '800',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  captionsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '3px',
  },
  captionsSpeakerTag: {
    fontSize: '0.66rem',
    fontWeight: '800',
    color: '#FBBF24',
  },
  captionTimeTag: {
    fontSize: '0.58rem',
    color: '#94A3B8',
  },
  captionOriginalText: {
    margin: 0,
    fontSize: '0.72rem',
    color: '#CBD5E1',
    fontStyle: 'italic',
  },
  captionTranslatedText: {
    margin: '2px 0 0',
    fontSize: '0.82rem',
    color: '#34D399',
    fontWeight: '800',
  },
  localPipContainer: {
    position: 'absolute',
    bottom: '14px',
    right: '14px',
    width: '105px',
    height: '140px',
    borderRadius: '14px',
    overflow: 'hidden',
    border: '2px solid #8B5CF6',
    boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
    backgroundColor: '#1E293B',
    zIndex: 5,
  },
  localVideoElement: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  pipMutedBackdrop: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    backgroundColor: '#334155',
  },
  pipMutedText: {
    fontSize: '0.6rem',
    color: '#94A3B8',
    fontWeight: '700',
  },
  pipLabel: {
    position: 'absolute',
    bottom: '4px',
    left: '4px',
    right: '4px',
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#FFFFFF',
    fontSize: '0.58rem',
    fontWeight: '700',
    textAlign: 'center',
    borderRadius: '4px',
    padding: '1px 2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  inCallSideDrawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '300px',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 10,
    boxShadow: '-4px 0 16px rgba(0,0,0,0.18)',
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderBottom: '1px solid #E2E8F0',
  },
  drawerTitle: {
    fontSize: '0.82rem',
    fontWeight: '800',
    color: '#1E1B4B',
  },
  closeDrawerBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  },
  chatMessagesList: {
    flex: 1,
    padding: '10px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  chatBubble: {
    maxWidth: '88%',
    padding: '8px 10px',
    borderRadius: '12px',
    fontSize: '0.76rem',
  },
  chatMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '2px',
  },
  chatSenderLabel: {
    fontSize: '0.62rem',
    fontWeight: '800',
    opacity: 0.85,
  },
  chatTimeLabel: {
    fontSize: '0.58rem',
    opacity: 0.7,
  },
  chatText: {
    margin: 0,
    lineHeight: '1.35',
  },
  chatTranslationBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    border: '1px solid rgba(5, 150, 105, 0.25)',
    borderRadius: '6px',
    padding: '3px 6px',
    marginTop: '4px',
  },
  chatTranslationText: {
    fontSize: '0.7rem',
    color: '#047857',
    fontWeight: '700',
  },
  chatInputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 10px',
    borderTop: '1px solid #E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  chatInput: {
    flex: 1,
    border: '1px solid #CBD5E1',
    borderRadius: '8px',
    padding: '6px 8px',
    fontSize: '0.76rem',
    outline: 'none',
  },
  sendMsgBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#6D28D9',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  prescriptionDrawerContent: {
    flex: 1,
    padding: '12px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  translationSettingsContent: {
    flex: 1,
    padding: '12px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  settingCard: {
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  togglePillBtn: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.7rem',
    fontWeight: '800',
    cursor: 'pointer',
  },
  langSelectGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  langLabel: {
    fontSize: '0.68rem',
    color: '#64748B',
    fontWeight: '700',
    marginBottom: '2px',
    display: 'block',
  },
  langSelect: {
    width: '100%',
    padding: '6px 8px',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    fontSize: '0.76rem',
    fontWeight: '700',
    color: '#1E1B4B',
    outline: 'none',
  },
  rxSavedAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#ECFDF5',
    color: '#065F46',
    border: '1px solid #A7F3D0',
    borderRadius: '8px',
    padding: '6px 8px',
    fontSize: '0.72rem',
    fontWeight: '700',
  },
  doctorRxEditorBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  editorPromptRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editorPrompt: {
    fontSize: '0.76rem',
    fontWeight: '800',
    color: '#4C1D95',
  },
  lastUpdatedText: {
    fontSize: '0.64rem',
    color: '#059669',
    fontWeight: '700',
  },
  rxTextarea: {
    width: '100%',
    borderRadius: '10px',
    border: '1.5px solid #CBD5E1',
    padding: '8px',
    fontSize: '0.78rem',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  presetsTray: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  presetsLabel: {
    fontSize: '0.68rem',
    fontWeight: '700',
    color: '#64748B',
  },
  presetChip: {
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '0.68rem',
    fontWeight: '600',
    color: '#334155',
    textAlign: 'left',
    cursor: 'pointer',
  },
  syncRxBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: '#059669',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    padding: '10px',
    fontSize: '0.8rem',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
    marginTop: '4px',
  },
  patientRxLiveView: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    backgroundColor: '#F8FAFC',
    border: '1.5px solid #E2E8F0',
    borderRadius: '12px',
    padding: '12px',
  },
  rxCardDoctorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #E2E8F0',
    paddingBottom: '8px',
  },
  rxLiveBadge: {
    fontSize: '0.64rem',
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    border: '1px solid #A7F3D0',
    borderRadius: '6px',
    padding: '2px 6px',
  },
  rxVerifiedBadge: {
    fontSize: '0.64rem',
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    padding: '2px 6px',
    borderRadius: '6px',
  },
  patientRxBody: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #DDD6FE',
    borderRadius: '8px',
    padding: '10px',
  },
  rxBodyText: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#1E1B4B',
    lineHeight: '1.4',
    fontWeight: '600',
    whiteSpace: 'pre-wrap',
  },
  rxDisclaimer: {
    margin: 0,
    fontSize: '0.64rem',
    color: '#64748B',
    fontStyle: 'italic',
  },
  unreadBadge: {
    position: 'absolute',
    top: '-3px',
    right: '-3px',
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    fontSize: '0.62rem',
    fontWeight: '900',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.4)',
  },
  controlsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #DDD6FE',
    borderRadius: '20px',
    padding: '12px 16px',
    boxShadow: '0 4px 14px rgba(109, 40, 217, 0.08)',
  },
  controlCircleBtn: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  endCallCircleBtn: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: '#DC2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
  },
  endedCard: {
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #A7F3D0',
    borderRadius: '20px',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '14px',
    boxShadow: '0 8px 24px rgba(5, 150, 105, 0.12)',
  },
  endedIconCircle: {
    width: '68px',
    height: '68px',
    borderRadius: '50%',
    backgroundColor: '#059669',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
  },
  endedTitle: {
    fontSize: '1.2rem',
    fontWeight: '800',
    color: '#065F46',
    margin: 0,
  },
  endedSub: {
    fontSize: '0.8rem',
    color: '#047857',
    margin: 0,
  },
  summaryBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '12px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  summaryHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8rem',
    color: '#4C1D95',
  },
  updateRxFinalBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    backgroundColor: '#6D28D9',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '0.78rem',
    fontWeight: '800',
    cursor: 'pointer',
  },
  patientRxCard: {
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #A7F3D0',
    borderRadius: '10px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  summaryNotes: {
    fontSize: '0.82rem',
    color: '#1E1B4B',
    lineHeight: '1.45',
    margin: 0,
    fontWeight: '600',
    whiteSpace: 'pre-wrap',
  },
  returnBtn: {
    width: '100%',
    backgroundColor: '#6D28D9',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    padding: '12px',
    fontSize: '0.88rem',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(109, 40, 217, 0.3)',
    marginTop: '6px',
  },
  liveVoiceControlBar: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    right: '12px',
    zIndex: 25,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '6px 12px',
    borderRadius: '16px',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  micStatusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 10px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    userSelect: 'none',
  },
  audioWaveformContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    height: '18px',
    padding: '0 2px',
  },
  audioWaveformBar: {
    width: '3px',
    borderRadius: '2px',
    transition: 'height 0.08s ease, background-color 0.1s ease',
  },
  langPillGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  langGroupLabel: {
    fontSize: '0.68rem',
    color: '#94A3B8',
    fontWeight: '700',
    marginRight: '2px',
  },
  langPillBtn: {
    padding: '3px 8px',
    borderRadius: '8px',
    border: '1px solid transparent',
    fontSize: '0.7rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  quickVoiceChips: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap',
  },
  quickSpeechTestBtn: {
    padding: '3px 8px',
    borderRadius: '8px',
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    border: '1px solid rgba(52, 211, 153, 0.4)',
    color: '#6EE7B7',
    fontSize: '0.68rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  liveTranslatorBadge: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    zIndex: 25,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '20px',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(52, 211, 153, 0.4)',
    color: '#34D399',
    fontSize: '0.7rem',
    fontWeight: '800',
    letterSpacing: '0.3px',
  },
  pulsingDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#10B981',
    boxShadow: '0 0 8px #10B981',
    display: 'inline-block',
  },
  liveChatPreviewBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 8px',
    borderRadius: '6px',
    backgroundColor: '#ECFDF5',
    border: '1px solid #A7F3D0',
  },
  liveChatPreviewText: {
    fontSize: '0.72rem',
    color: '#065F46',
    fontWeight: '700',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  voiceoverToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 8px',
    borderRadius: '8px',
    border: '1px solid transparent',
    fontSize: '0.68rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};

export default TeleconsultationRoom;
