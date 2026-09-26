import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Maps application language name / locale code to Web Speech BCP-47 tag
 */
export const getSpeechLanguageCode = (lang) => {
  if (!lang) return 'en-IN';
  const l = lang.toLowerCase();
  if (l.includes('hi') || l === 'hindi') return 'hi-IN';
  if (l.includes('ta') || l === 'tamil') return 'ta-IN';
  if (l.includes('te') || l === 'telugu') return 'te-IN';
  if (l.includes('kn') || l === 'kannada') return 'kn-IN';
  if (l.includes('ml') || l === 'malayalam') return 'ml-IN';
  if (l.includes('mr') || l === 'marathi') return 'mr-IN';
  if (l.includes('bn') || l === 'bengali') return 'bn-IN';
  return 'en-IN';
};

/**
 * Custom React Hook for Web Speech API Speech-to-Text
 */
export const useSpeechToText = ({ preferredLanguage = 'en' } = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef(null);
  const onResultCallbackRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition ||
      null;

    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event) => {
        let currentInterim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalChunk += res[0].transcript;
          } else {
            currentInterim += res[0].transcript;
          }
        }

        setInterimTranscript(currentInterim);

        if (finalChunk) {
          const trimmed = finalChunk.trim();
          setTranscript((prev) => (prev ? `${prev} ${trimmed}` : trimmed));
          if (onResultCallbackRef.current) {
            onResultCallbackRef.current(trimmed, true);
          }
        } else if (currentInterim && onResultCallbackRef.current) {
          onResultCallbackRef.current(currentInterim.trim(), false);
        }
      };

      recognition.onerror = (event) => {
        console.warn('[Speech-to-Text] Recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('mic-denied');
        } else if (event.error === 'no-speech') {
          // Graceful ignore
        } else if (event.error === 'network') {
          setError('network-error');
        } else {
          setError(event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  const startListening = useCallback(
    ({ onResult, langOverride } = {}) => {
      if (!recognitionRef.current) {
        setError('not-supported');
        return;
      }

      setError(null);
      setTranscript('');
      setInterimTranscript('');
      onResultCallbackRef.current = onResult || null;

      const langCode = getSpeechLanguageCode(langOverride || preferredLanguage);
      recognitionRef.current.lang = langCode;

      try {
        recognitionRef.current.start();
      } catch (err) {
        // If already started or aborting
        if (err.name !== 'InvalidStateError') {
          console.warn('[Speech-to-Text] start error:', err);
          setError(err.message || 'speech-start-error');
        }
      }
    },
    [preferredLanguage]
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // ignore
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    speechLangCode: getSpeechLanguageCode(preferredLanguage),
  };
};

export default useSpeechToText;
