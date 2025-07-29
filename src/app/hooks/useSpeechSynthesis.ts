import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

interface SpeechSynthesisHookReturn {
  isSupported: boolean;
  isSpeaking: boolean;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void;
  speakText: (text: string, callbacks?: SpeechCallbacks) => void;
  stopSpeaking: () => void;
}

export const useSpeechSynthesis = (): SpeechSynthesisHookReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
      
      const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        setAvailableVoices(voices);
        
        const spanishVoice = voices.find(voice => 
          voice.lang.startsWith('es') || 
          voice.name.toLowerCase().includes('spanish') ||
          voice.name.toLowerCase().includes('español')
        );
        
        if (spanishVoice && !selectedVoice) {
          setSelectedVoice(spanishVoice);
        } else if (voices.length > 0 && !selectedVoice) {
          setSelectedVoice(voices[0]);
        }
      };
      
      loadVoices();
      
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, [selectedVoice]);

  const speakText = useCallback((text: string, callbacks?: SpeechCallbacks) => {
    if (!isSupported || !text.trim()) return;
    
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 1;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      if (callbacks?.onStart) callbacks.onStart();
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      if (callbacks?.onEnd) callbacks.onEnd();
    };
    
    utterance.onerror = (event) => {
      console.error('Error en síntesis de voz:', event.error);
      setIsSpeaking(false);
      if (callbacks?.onError) callbacks.onError();
    };
    
    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [isSupported, selectedVoice]);

  const stopSpeaking = useCallback(() => {
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  useEffect(() => {
    return () => {
      if (speechSynthesis) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isSupported,
    isSpeaking,
    availableVoices,
    selectedVoice,
    setSelectedVoice,
    speakText,
    stopSpeaking
  };
};