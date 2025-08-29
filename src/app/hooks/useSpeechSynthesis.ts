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
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const speakWithElevenLabsTTS = useCallback(async (text: string, callbacks?: SpeechCallbacks): Promise<boolean> => {
    try {
      const response = await fetch('/api/elevenlabs-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID
        })
      });
      
      if (!response.ok) {
        console.warn('ElevenLabs TTS API failed, falling back to browser speech synthesis');
        return false;
      }
      
      const data = await response.json();
      if (!data || !data.audio) {
        console.warn('Invalid ElevenLabs TTS response, falling back to browser speech synthesis');
        return false;
      }

      // Convert base64 audio to blob
      const audioData = atob(data.audio);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }
      const audioBlob = new Blob([audioArray], { type: data.contentType || 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      // Only call onStart when audio actually starts playing
      audio.onplaying = () => {
        setIsSpeaking(true);
        if (callbacks?.onStart) callbacks.onStart();
      };
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl); // Clean up the blob URL
        if (callbacks?.onEnd) callbacks.onEnd();
      };
      
      audio.onerror = () => {
        console.warn('ElevenLabs audio playback failed');
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl); // Clean up the blob URL
        if (callbacks?.onError) callbacks.onError();
      };
      
      await audio.play();
      return true;
    } catch (err) {
      console.warn('ElevenLabs TTS error:', err);
      if (callbacks?.onError) callbacks.onError();
      return false;
    }
  }, []);

  const speakWithBrowserTTS = useCallback((text: string, callbacks?: SpeechCallbacks) => {
    if (!isSupported || !text.trim()) {
      if (callbacks?.onError) callbacks.onError();
      return;
    }
    
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

  const speakText = useCallback(async (text: string, callbacks?: SpeechCallbacks) => {
    if (!text.trim() || isSpeaking) return;
    
    // Don't set isSpeaking or call onStart here - let the actual audio events handle it
    // Try ElevenLabs TTS first, fallback to browser TTS if it fails
    const elevenLabsSuccess = await speakWithElevenLabsTTS(text, callbacks);
    
    if (!elevenLabsSuccess) {
      // Fallback to browser speech synthesis
      speakWithBrowserTTS(text, callbacks);
    }
  }, [isSpeaking, speakWithElevenLabsTTS, speakWithBrowserTTS]);

  const stopSpeaking = useCallback(() => {
    // Stop ElevenLabs audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Stop browser speech synthesis
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
      if (audioRef.current) {
        audioRef.current.pause();
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
