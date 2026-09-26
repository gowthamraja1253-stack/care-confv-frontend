import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import symptomService from '../services/symptom.service';
import emergencyService from '../services/emergency.service';
import EmergencyAlertBanner from '../components/EmergencyAlertBanner';
import { useSpeechToText, getSpeechLanguageCode } from '../hooks/useSpeechToText';
import {
  Stethoscope,
  ArrowLeft,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  RefreshCw,
  History,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
  Video,
  MapPin,
  Pill,
  Clock,
  ChevronRight,
  User,
  Radio,
  HeartPulse,
  Activity,
  Flame,
  Zap,
} from 'lucide-react';

const QUICK_PROMPTS = [
  { icon: '🤒', text: 'I have high fever and shivering since yesterday' },
  { icon: '😮‍💨', text: 'Shortness of breath with dry cough and chest heaviness' },
  { icon: '🤢', text: 'Severe stomach cramps with vomiting after eating' },
  { icon: '🤕', text: 'Throbbing headache and dizziness for 2 days' },
  { icon: '🦵', text: 'Knee joint pain and morning stiffness' },
  { icon: '🩺', text: 'My child has viral fever and loose motions' },
];

export const SymptomCheckerPage = ({ onBack, initialAutoVoice = false, onNavigateConsult, onNavigateFacilities, onNavigateMedicines }) => {
  const { t, i18n } = useTranslation();
  const { token, user } = useAuth();

  // Active view: 'chat' | 'history'
  const [activeTab, setActiveTab] = useState('chat');

  // Multi-turn conversation messages
  const [messages, setMessages] = useState(() => {
    const userName = user?.name || 'Friend';
    const lang = user?.preferredLanguage || i18n.language || 'English';
    const isHindi = lang.toLowerCase().includes('hindi') || i18n.language === 'hi';
    const isTamil = lang.toLowerCase().includes('tamil') || i18n.language === 'ta';
    const isTelugu = lang.toLowerCase().includes('telugu') || i18n.language === 'te';
    const isKannada = lang.toLowerCase().includes('kannada') || i18n.language === 'kn';
    const isMalayalam = lang.toLowerCase().includes('malayalam') || i18n.language === 'ml';

    let initialGreeting = `Namaste ${userName}! I am **Dr. Ayush**, your AI Medical Triage Assistant. 🩺\n\nHow are you feeling today? You can **tap the microphone to speak** or type what symptoms you are having. I will assess your condition and guide you on the safest next steps.`;

    if (isHindi) {
      initialGreeting = `नमस्ते ${userName}! मैं **डॉ. आयुष**, आपका AI स्वास्थ्य सहायक हूँ। 🩺\n\nआज आप कैसा महसूस कर रहे हैं? आप **माइक दबाकर बोल सकते हैं** या अपने लक्षण लिख सकते हैं। मैं आपकी जांच कर सही सलाह दूंगा।`;
    } else if (isTamil) {
      initialGreeting = `வணக்கம் ${userName}! நான் **டாக்டர் ஆயுஷ்**, உங்கள் AI மருத்துவ உதவியாளர். 🩺\n\nஇன்று உங்கள் உடல்நிலை எப்படி இருக்கிறது? நீங்கள் **மைக் அழுத்தி பேசலாம்** அல்லது உங்கள் அறிகுறிகளை தட்டச்சு செய்யலாம்.`;
    } else if (isTelugu) {
      initialGreeting = `నమస్కారం ${userName}! నేను **డాక్టర్ ఆయుష్**, మీ AI ఆరోగ్య సహాయకుడిని. 🩺\n\nఈ రోజు మీ ఆరోగ్యం ఎలా ఉంది? మీరు **మైక్ నొక్కి మాట్లాడవచ్చు** లేదా మీ లక్షణాలను టైప్ చేయవచ్చు.`;
    } else if (isKannada) {
      initialGreeting = `ನಮಸ್ಕಾರ ${userName}! ನಾನು **ಡಾ. ಆಯುಷ್**, ನಿಮ್ಮ AI ಆರೋಗ್ಯ ಸಹಾಯಕ. 🩺\n\nಇಂದು ನಿಮ್ಮ ಆರೋಗ್ಯ ಹೇಗಿದೆ? ನೀವು **ಮೈಕ್ ಒತ್ತಿ ಮಾತನಾಡಬಹುದು** ಅಥವಾ ನಿಮ್ಮ ಲಕ್ಷಣಗಳನ್ನು ಟೈಪ್ ಮಾಡಬಹುದು.`;
    } else if (isMalayalam) {
      initialGreeting = `നമസ്കാരം ${userName}! ഞാൻ **ഡോ. ആയുഷ്**, നിങ്ങളുടെ AI ആരോഗ്യ സഹായി. 🩺\n\nഇന്ന് നിങ്ങൾക്ക് എന്ത് ബുദ്ധിമുട്ടാണ് ഉള്ളത്? **മൈക്ക് അമർത്തി സംസാരിക്കാം** അല്ലെങ്കിൽ നിങ്ങളുടെ രോഗലക്ഷണങ്ങൾ ടൈപ്പ് ചെയ്യാം. ഞാൻ നിങ്ങളുടെ അവസ്ഥ പരിശോധിച്ച് നിർദ്ദേശങ്ങൾ നൽകാം.`;
    }

    return [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: initialGreeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        triageLevel: 'self-care',
        quickReplies: ['I have fever & body pain', 'Severe stomach ache', 'Cough & cold for 3 days', 'Breathlessness'],
      },
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [pastAssessments, setPastAssessments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Latest triage assessment snapshot
  const [latestTriage, setLatestTriage] = useState(null);

  const messagesEndRef = useRef(null);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);

  // Speech-to-text hook
  const {
    isListening,
    transcript,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechToText({ preferredLanguage: user?.preferredLanguage || i18n.language || 'en' });

  // Auto scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAnalyzing]);

  // Sync speech transcript into input box
  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  // Auto trigger voice mode on mount if requested
  useEffect(() => {
    if (initialAutoVoice && isSpeechSupported) {
      const timer = setTimeout(() => {
        handleToggleVoice();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [initialAutoVoice, isSpeechSupported]);

  // Handle Speech Recognition Toggle
  const handleToggleVoice = () => {
    if (!isSpeechSupported) {
      alert('Voice recognition is not supported in this browser. Please use Chrome, Edge or a supported mobile browser.');
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      setInputText('');
      const langCode = getSpeechLanguageCode(user?.preferredLanguage || i18n.language || 'en');
      startListening({ lang: langCode });
    }
  };

  // Text-To-Speech Playback for AI responses
  const handleToggleSpeech = (msgId, text) => {
    if (!synthRef.current) return;

    if (speakingMsgId === msgId) {
      synthRef.current.cancel();
      setSpeakingMsgId(null);
      return;
    }

    synthRef.current.cancel();
    setSpeakingMsgId(msgId);

    // Clean markdown symbols for natural speech
    const cleanText = text
      .replace(/[*#_`>~]/g, '')
      .replace(/<!--.*?-->/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = getSpeechLanguageCode(user?.preferredLanguage || i18n.language || 'en');
    utterance.rate = 0.95; // slightly relaxed natural pace

    utterance.onend = () => {
      setSpeakingMsgId(null);
    };

    utterance.onerror = () => {
      setSpeakingMsgId(null);
    };

    synthRef.current.speak(utterance);
  };

  // Send message to Dr. Ayush AI
  const handleSendMessage = async (customContent = null) => {
    const textToSend = (customContent || inputText).trim();
    if (!textToSend || isAnalyzing) return;

    if (isListening) {
      stopListening();
    }

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    resetTranscript();
    setIsAnalyzing(true);

    try {
      // Prepare conversation history for backend
      const payloadMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await symptomService.chatWithDoctorAi(token, {
        messages: payloadMessages,
        saveRecord: true,
      });

      if (res.success) {
        const aiMsg = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: res.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          triageLevel: res.triageLevel,
          severityScore: res.severityScore,
          possibleConditions: res.possibleConditions,
          recommendedAction: res.recommendedAction,
          redFlagDetected: res.redFlagDetected,
          quickReplies: res.quickReplies || [],
        };

        setMessages((prev) => [...prev, aiMsg]);
        setLatestTriage(res);

        // Optionally read aloud if the user spoke via voice
        if (isListening) {
          handleToggleSpeech(aiMsg.id, res.reply);
        }
      }
    } catch (err) {
      console.warn('[Symptom Checker] AI Chat error:', err.message);
      const fallbackAiMsg = {
        id: `ai-err-${Date.now()}`,
        role: 'assistant',
        content: `🩺 **Clinical Assessment**\n\nI have noted: "${textToSend}". \n\n**Recommended Guidance:**\n- If symptoms have persisted for **more than 2 days** or are moderate-to-severe, please book an online teleconsultation with a doctor today.\n- Stay well-hydrated with warm water / ORS and take adequate rest.\n- If you experience severe chest heaviness or sudden breathing difficulty, seek emergency care immediately.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        triageLevel: 'consult-doctor',
        severityScore: 5,
        quickReplies: ['Fever for 2 days', 'Taking fluids', 'Book Teleconsult'],
      };
      setMessages((prev) => [...prev, fallbackAiMsg]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Reset conversation to fresh session
  const handleResetChat = () => {
    if (synthRef.current) synthRef.current.cancel();
    setSpeakingMsgId(null);
    setLatestTriage(null);
    setInputText('');
    resetTranscript();

    const userName = user?.name || 'Friend';
    setMessages([
      {
        id: `msg-welcome-${Date.now()}`,
        role: 'assistant',
        content: `Namaste ${userName}! Ready for a new symptom checkup. 🩺\n\nHow are you feeling right now? Tap the mic to speak or type your symptoms.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        triageLevel: 'self-care',
        quickReplies: ['I have fever & body pain', 'Severe stomach ache', 'Cough & cold for 3 days', 'Breathlessness'],
      },
    ]);
  };

  // Load Past Assessments History
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await symptomService.getPatientSymptoms(token);
      if (data.success && Array.isArray(data.symptoms)) {
        setPastAssessments(data.symptoms);
      }
    } catch (err) {
      console.warn('Failed to load history:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          {onBack && (
            <button
              type="button"
              style={styles.backBtn}
              onClick={() => {
                if (synthRef.current) synthRef.current.cancel();
                onBack();
              }}
              title="Back"
            >
              <ArrowLeft size={20} color="#1E1B4B" />
            </button>
          )}

          <div style={styles.doctorProfileWrap}>
            <div style={styles.doctorAvatarBox}>
              <Stethoscope size={20} color="#FFFFFF" />
              <span style={styles.onlineDot} />
            </div>
            <div>
              <div style={styles.docTitleRow}>
                <h1 style={styles.docName}>Dr. Ayush (AI Health Assistant)</h1>
                <span style={styles.aiBadge}>
                  <Sparkles size={11} color="#6D28D9" />
                  Clinical AI Triage
                </span>
              </div>
              <p style={styles.docStatusText}>
                Active • Voice & Natural Language Medical Assistant
              </p>
            </div>
          </div>

          <div style={styles.headerActions}>
            <button
              type="button"
              style={styles.headerIconBtn}
              onClick={handleResetChat}
              title="Start New Consultation"
            >
              <RefreshCw size={17} color="#6D28D9" />
            </button>
            <button
              type="button"
              style={{
                ...styles.headerIconBtn,
                backgroundColor: activeTab === 'history' ? '#EDE9FE' : '#F8FAFC',
              }}
              onClick={() => setActiveTab(activeTab === 'chat' ? 'history' : 'chat')}
              title={activeTab === 'chat' ? 'View Past Checkups' : 'Back to Live Chat'}
            >
              <History size={17} color="#6D28D9" />
            </button>
          </div>
        </div>

        {/* Emergency Alert Banner for High Severity */}
        {latestTriage?.redFlagDetected && (
          <div style={styles.emergencyWarningBanner}>
            <AlertTriangle size={18} color="#DC2626" />
            <div>
              <strong>Emergency Red-Flag Symptoms Detected!</strong>
              <p style={styles.emergencyBannerSub}>
                Please call 108 or go to the nearest hospital immediately.
              </p>
            </div>
            <a href="tel:108" style={styles.call108Btn}>
              <PhoneCall size={14} color="#FFFFFF" />
              <span>Call 108</span>
            </a>
          </div>
        )}
      </div>

      {/* Main View: Chat Mode */}
      {activeTab === 'chat' && (
        <div style={styles.chatWrapper}>
          {/* Scrollable Message Feed */}
          <div style={styles.messagesFeed}>
            {messages.map((msg) => {
              const isAi = msg.role === 'assistant';
              const isSpeaking = speakingMsgId === msg.id;

              return (
                <div
                  key={msg.id}
                  style={{
                    ...styles.messageRow,
                    justifyContent: isAi ? 'flex-start' : 'flex-end',
                  }}
                >
                  {isAi && (
                    <div style={styles.aiAvatarSmall}>
                      <Stethoscope size={14} color="#6D28D9" />
                    </div>
                  )}

                  <div
                    style={{
                      ...styles.messageBubble,
                      ...(isAi ? styles.aiBubble : styles.userBubble),
                    }}
                  >
                    {/* AI Header Bar (Speaker + Triage Badge) */}
                    {isAi && (
                      <div style={styles.bubbleHeader}>
                        <div style={styles.bubbleHeaderLeft}>
                          <span style={styles.aiDocLabel}>Dr. Ayush</span>
                          {msg.triageLevel && (
                            <span
                              style={{
                                ...styles.triagePill,
                                ...(msg.triageLevel === 'emergency'
                                  ? styles.triageEmergency
                                  : msg.triageLevel === 'consult-doctor'
                                  ? styles.triageDoctor
                                  : msg.triageLevel === 'visit-clinic'
                                  ? styles.triageClinic
                                  : styles.triageSelfCare),
                              }}
                            >
                              {msg.triageLevel === 'emergency' && '🚨 Emergency 108'}
                              {msg.triageLevel === 'consult-doctor' && '🟡 Consult Doctor'}
                              {msg.triageLevel === 'visit-clinic' && '🏥 Visit PHC'}
                              {msg.triageLevel === 'self-care' && '🟢 Self-Care at Home'}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          style={{
                            ...styles.speakerBtn,
                            color: isSpeaking ? '#DC2626' : '#6D28D9',
                          }}
                          onClick={() => handleToggleSpeech(msg.id, msg.content)}
                          title={isSpeaking ? 'Stop Speaking' : 'Read Aloud in Your Language'}
                        >
                          {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
                          <span style={styles.speakerBtnText}>{isSpeaking ? 'Stop' : 'Listen'}</span>
                        </button>
                      </div>
                    )}

                    {/* Message Body Content */}
                    <div style={styles.messageText}>
                      {msg.content.split('\n').map((line, idx) => {
                        if (!line.trim()) return <div key={idx} style={{ height: '6px' }} />;
                        const formattedLine = line
                          .replace(/\*\*(.*?)\*\*/g, '$1')
                          .replace(/###/g, '')
                          .trim();

                        const isHeader = line.startsWith('**') || line.startsWith('###') || line.startsWith('🩺') || line.startsWith('🚨') || line.startsWith('⚠️');

                        return (
                          <p
                            key={idx}
                            style={{
                              ...styles.messageParagraph,
                              fontWeight: isHeader ? 600 : 400,
                              color: isAi ? (isHeader ? '#1E1B4B' : '#334155') : '#FFFFFF',
                            }}
                          >
                            {formattedLine}
                          </p>
                        );
                      })}
                    </div>

                    {/* Dynamic Action Buttons for Triage Outcomes */}
                    {isAi && msg.triageLevel && msg.triageLevel !== 'self-care' && (
                      <div style={styles.actionPillsRow}>
                        {msg.triageLevel === 'consult-doctor' && (
                          <button
                            type="button"
                            style={styles.actionPillPrimary}
                            onClick={() => onNavigateConsult && onNavigateConsult()}
                          >
                            <Video size={13} color="#FFFFFF" />
                            <span>Book Teleconsultation</span>
                          </button>
                        )}

                        {msg.triageLevel === 'visit-clinic' && (
                          <button
                            type="button"
                            style={styles.actionPillPrimary}
                            onClick={() => onNavigateFacilities && onNavigateFacilities()}
                          >
                            <MapPin size={13} color="#FFFFFF" />
                            <span>Locate Nearest PHC</span>
                          </button>
                        )}

                        {msg.triageLevel === 'emergency' && (
                          <a href="tel:108" style={styles.actionPillEmergency}>
                            <PhoneCall size={13} color="#FFFFFF" />
                            <span>Call 108 Helpline</span>
                          </a>
                        )}

                        <button
                          type="button"
                          style={styles.actionPillSecondary}
                          onClick={() => onNavigateMedicines && onNavigateMedicines()}
                        >
                          <Pill size={13} color="#6D28D9" />
                          <span>Find Jan Aushadhi Medicines</span>
                        </button>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div
                      style={{
                        ...styles.msgTimestamp,
                        color: isAi ? '#94A3B8' : 'rgba(255, 255, 255, 0.75)',
                      }}
                    >
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* AI Typing / Analyzing Indicator */}
            {isAnalyzing && (
              <div style={styles.messageRow}>
                <div style={styles.aiAvatarSmall}>
                  <Stethoscope size={14} color="#6D28D9" />
                </div>
                <div style={{ ...styles.messageBubble, ...styles.aiBubble, ...styles.typingBubble }}>
                  <div style={styles.pulseDot} />
                  <span style={styles.typingText}>Dr. Ayush is evaluating your symptoms...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Suggestions Strip */}
          <div style={styles.quickChipsStrip}>
            {messages[messages.length - 1]?.quickReplies?.length > 0 ? (
              messages[messages.length - 1].quickReplies.map((replyText, idx) => (
                <button
                  key={idx}
                  type="button"
                  style={styles.quickChip}
                  onClick={() => handleSendMessage(replyText)}
                >
                  <span>{replyText}</span>
                </button>
              ))
            ) : (
              QUICK_PROMPTS.slice(0, 3).map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  style={styles.quickChip}
                  onClick={() => handleSendMessage(item.text)}
                >
                  <span>{item.icon} {item.text}</span>
                </button>
              ))
            )}
          </div>

          {/* Live Voice Listening Visualizer Banner */}
          {isListening && (
            <div style={styles.listeningActiveBanner}>
              <div style={styles.waveContainer}>
                <span style={styles.waveBar} />
                <span style={{ ...styles.waveBar, animationDelay: '0.2s', height: '18px' }} />
                <span style={{ ...styles.waveBar, animationDelay: '0.4s', height: '14px' }} />
                <span style={{ ...styles.waveBar, animationDelay: '0.1s', height: '22px' }} />
              </div>
              <span style={styles.listeningText}>
                Listening in your language... Speak now (Tap Send or Mic to finish)
              </span>
            </div>
          )}

          {/* Chat Input & Voice Microphone Bar */}
          <div style={styles.inputArea}>
            <button
              type="button"
              style={{
                ...styles.micBtn,
                backgroundColor: isListening ? '#DC2626' : '#6D28D9',
                boxShadow: isListening ? '0 0 16px rgba(220, 38, 38, 0.5)' : '0 4px 12px rgba(109, 40, 217, 0.25)',
              }}
              onClick={handleToggleVoice}
              title={isListening ? 'Stop Listening' : 'Tap & Speak Symptoms (Voice)'}
            >
              {isListening ? (
                <MicOff size={22} color="#FFFFFF" />
              ) : (
                <Mic size={22} color="#FFFFFF" />
              )}
            </button>

            <div style={styles.inputWrapper}>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Speak or type symptoms in Hindi, Tamil, English, etc..."
                style={styles.chatTextarea}
                rows={1}
              />
            </div>

            <button
              type="button"
              style={{
                ...styles.sendBtn,
                opacity: inputText.trim() ? 1 : 0.6,
              }}
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isAnalyzing}
              title="Send Message"
            >
              <Send size={18} color="#FFFFFF" />
            </button>
          </div>
        </div>
      )}

      {/* History Mode: Past Checkups */}
      {activeTab === 'history' && (
        <div style={styles.historyWrapper}>
          <div style={styles.historyHeader}>
            <h2 style={styles.historyTitle}>Your Past Symptom Assessments</h2>
            <button
              type="button"
              style={styles.backToChatBtn}
              onClick={() => setActiveTab('chat')}
            >
              <span>Back to AI Chat</span>
              <ChevronRight size={16} color="#6D28D9" />
            </button>
          </div>

          {loadingHistory ? (
            <div style={styles.loadingBox}>
              <div style={styles.spinner} />
              <p>Loading checkup records...</p>
            </div>
          ) : pastAssessments.length === 0 ? (
            <div className="card-base" style={styles.emptyHistoryCard}>
              <HeartPulse size={36} color="#94A3B8" />
              <h3 style={styles.emptyHistoryTitle}>No Saved Checkups Yet</h3>
              <p style={styles.emptyHistorySub}>
                Start a voice or chat consultation with Dr. Ayush to get immediate triage and save your clinical notes.
              </p>
              <button
                type="button"
                style={styles.startConsultBtn}
                onClick={() => setActiveTab('chat')}
              >
                <Stethoscope size={16} color="#FFFFFF" />
                <span>Start AI Consultation</span>
              </button>
            </div>
          ) : (
            <div style={styles.historyList}>
              {pastAssessments.map((rec) => (
                <div key={rec._id} className="card-base" style={styles.historyCard}>
                  <div style={styles.historyCardTop}>
                    <div style={styles.historyDate}>
                      <Clock size={13} color="#6D28D9" />
                      <span>{new Date(rec.createdAt).toLocaleDateString()} at {new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span
                      style={{
                        ...styles.triagePill,
                        ...(rec.severity === 'severe'
                          ? styles.triageEmergency
                          : rec.severity === 'moderate'
                          ? styles.triageDoctor
                          : styles.triageSelfCare),
                      }}
                    >
                      {rec.severity.toUpperCase()}
                    </span>
                  </div>

                  <div style={styles.historySymptomsRow}>
                    {rec.symptoms.map((s, idx) => (
                      <span key={idx} style={styles.symptomTag}>
                        {s}
                      </span>
                    ))}
                  </div>

                  {rec.notes && (
                    <p style={styles.historyNotesText}>&ldquo;{rec.notes}&rdquo;</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '82vh',
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottom: '1.5px solid #E2E8F0',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  backBtn: {
    background: '#F1F5F9',
    border: 'none',
    borderRadius: '10px',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorProfileWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  doctorAvatarBox: {
    position: 'relative',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 3px 8px rgba(109, 40, 217, 0.25)',
  },
  onlineDot: {
    position: 'absolute',
    bottom: '0',
    right: '0',
    width: '11px',
    height: '11px',
    borderRadius: '50%',
    backgroundColor: '#10B981',
    border: '2px solid #FFFFFF',
  },
  docTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  docName: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#0F172A',
    margin: 0,
  },
  aiBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    fontWeight: 700,
    color: '#6D28D9',
    backgroundColor: '#EDE9FE',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  docStatusText: {
    fontSize: '11px',
    color: '#64748B',
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  headerIconBtn: {
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyWarningBanner: {
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '12px',
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: '#991B1B',
    fontSize: '12px',
  },
  emergencyBannerSub: {
    margin: 0,
    fontSize: '11px',
    color: '#B91C1C',
  },
  call108Btn: {
    marginLeft: 'auto',
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    textDecoration: 'none',
    padding: '6px 12px',
    borderRadius: '8px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
  },
  chatWrapper: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    height: 'calc(100vh - 180px)',
    minHeight: '520px',
  },
  messagesFeed: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  messageRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    width: '100%',
  },
  aiAvatarSmall: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#EDE9FE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '4px',
    flexShrink: 0,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: '16px',
    padding: '14px 16px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderTopLeftRadius: '4px',
  },
  userBubble: {
    background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 100%)',
    color: '#FFFFFF',
    borderTopRightRadius: '4px',
  },
  bubbleHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #F1F5F9',
    paddingBottom: '8px',
    marginBottom: '8px',
    gap: '8px',
  },
  bubbleHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  aiDocLabel: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#1E1B4B',
  },
  speakerBtn: {
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '3px 8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: 600,
  },
  speakerBtnText: {
    fontSize: '10px',
  },
  messageText: {
    fontSize: '13.5px',
    lineHeight: '1.55',
  },
  messageParagraph: {
    margin: '3px 0',
  },
  actionPillsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: '12px',
    paddingTop: '10px',
    borderTop: '1px solid #F1F5F9',
  },
  actionPillPrimary: {
    background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 100%)',
    color: '#FFFFFF',
    border: 'none',
    padding: '7px 12px',
    borderRadius: '8px',
    fontSize: '11.5px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  actionPillEmergency: {
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    textDecoration: 'none',
    padding: '7px 12px',
    borderRadius: '8px',
    fontSize: '11.5px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  actionPillSecondary: {
    backgroundColor: '#F3E8FF',
    color: '#6D28D9',
    border: '1px solid #DDD6FE',
    padding: '7px 12px',
    borderRadius: '8px',
    fontSize: '11.5px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  triagePill: {
    fontSize: '10.5px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '10px',
    display: 'inline-flex',
    alignItems: 'center',
  },
  triageSelfCare: {
    backgroundColor: '#ECFDF5',
    color: '#059669',
  },
  triageDoctor: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
  triageClinic: {
    backgroundColor: '#FFEDD5',
    color: '#EA580C',
  },
  triageEmergency: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
  },
  msgTimestamp: {
    fontSize: '10px',
    textAlign: 'right',
    marginTop: '6px',
  },
  typingBubble: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
  },
  pulseDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#6D28D9',
    animation: 'pulse 1.2s infinite',
  },
  typingText: {
    fontSize: '12px',
    color: '#64748B',
    fontStyle: 'italic',
  },
  quickChipsStrip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    overflowX: 'auto',
    padding: '6px 16px',
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid #F1F5F9',
  },
  quickChip: {
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '20px',
    padding: '6px 12px',
    fontSize: '11.5px',
    fontWeight: 500,
    color: '#475569',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  },
  listeningActiveBanner: {
    backgroundColor: '#FEF2F2',
    borderTop: '1px solid #FECACA',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  waveContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '3px',
    height: '24px',
  },
  waveBar: {
    width: '3px',
    height: '10px',
    backgroundColor: '#DC2626',
    borderRadius: '2px',
    animation: 'pulse 0.8s infinite alternate',
  },
  listeningText: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#991B1B',
  },
  inputArea: {
    backgroundColor: '#FFFFFF',
    borderTop: '1.5px solid #E2E8F0',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  micBtn: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.2s ease',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: '24px',
    padding: '8px 14px',
    display: 'flex',
    alignItems: 'center',
  },
  chatTextarea: {
    width: '100%',
    border: 'none',
    background: 'transparent',
    resize: 'none',
    outline: 'none',
    fontSize: '13.5px',
    color: '#0F172A',
    fontFamily: 'inherit',
  },
  sendBtn: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 100%)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  historyWrapper: {
    padding: '16px',
    flex: 1,
    overflowY: 'auto',
  },
  historyHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  historyTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#0F172A',
    margin: 0,
  },
  backToChatBtn: {
    background: 'none',
    border: 'none',
    color: '#6D28D9',
    fontWeight: 600,
    fontSize: '12.5px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  emptyHistoryCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '36px 20px',
    textAlign: 'center',
    gap: '12px',
  },
  emptyHistoryTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1E1B4B',
    margin: 0,
  },
  emptyHistorySub: {
    fontSize: '13px',
    color: '#64748B',
    maxWidth: '320px',
    lineHeight: '1.5',
    margin: 0,
  },
  startConsultBtn: {
    marginTop: '8px',
    background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 100%)',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '10px',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  historyCard: {
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  historyCardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyDate: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#64748B',
  },
  historySymptomsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  symptomTag: {
    backgroundColor: '#EDE9FE',
    color: '#6D28D9',
    fontSize: '11.5px',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: '6px',
  },
  historyNotesText: {
    fontSize: '12.5px',
    color: '#475569',
    fontStyle: 'italic',
    margin: 0,
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    gap: '12px',
    color: '#64748B',
    fontSize: '13px',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '3px solid #E2E8F0',
    borderTopColor: '#6D28D9',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

export default SymptomCheckerPage;
