import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioStreamPlayer, AudioStreamCallbacks } from '@/lib/audio-stream-player';

interface SpeechCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
  onProgress?: (bytesReceived: number) => void;
}

interface SpeechSynthesisHookReturn {
  isSupported: boolean;
  isSpeaking: boolean;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void;
  speakText: (text: string, callbacks?: SpeechCallbacks) => void;
  stopSpeaking: () => void;
  streamingProgress: number;
}

export const useSpeechSynthesis = (): SpeechSynthesisHookReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [streamingProgress, setStreamingProgress] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamPlayerRef = useRef<AudioStreamPlayer | null>(null);

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

  const speakWithElevenLabsStreamTTS = useCallback(async (text: string, callbacks?: SpeechCallbacks): Promise<boolean> => {
    try {
      setStreamingProgress(0);
      
      const streamCallbacks: AudioStreamCallbacks = {
        onStart: () => {
          setIsSpeaking(true);
          callbacks?.onStart?.();
        },
        onEnd: () => {
          setIsSpeaking(false);
          setStreamingProgress(0);
          streamPlayerRef.current = null;
          callbacks?.onEnd?.();
        },
        onError: (error: Error) => {
          console.warn('ElevenLabs streaming error:', error);
          setIsSpeaking(false);
          setStreamingProgress(0);
          streamPlayerRef.current = null;
          callbacks?.onError?.();
        },
        onProgress: (bytesReceived: number) => {
          setStreamingProgress(bytesReceived);
          callbacks?.onProgress?.(bytesReceived);
        }
      };

      // Create the streaming player
      const player = new AudioStreamPlayer(streamCallbacks);
      streamPlayerRef.current = player;

      // Make the streaming request to your updated API
      const response = await fetch('/api/elevenlabs-stream', {
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
        console.warn('ElevenLabs streaming API failed, falling back to regular TTS');
        return false;
      }

      // Start playing the streamed response directly
      await player.playStream(response);
      
      return true;
    } catch (err) {
      console.warn('ElevenLabs streaming TTS error:', err);
      setStreamingProgress(0);
      callbacks?.onError?.();
      return false;
    }
  }, []);

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
      
      audio.onplaying = () => {
        setIsSpeaking(true);
        callbacks?.onStart?.();
      };
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        callbacks?.onEnd?.();
      };
      
      audio.onerror = () => {
        console.warn('ElevenLabs audio playback failed');
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        callbacks?.onError?.();
      };
      
      await audio.play();
      return true;
    } catch (err) {
      console.warn('ElevenLabs TTS error:', err);
      callbacks?.onError?.();
      return false;
    }
  }, []);

  const speakWithBrowserTTS = useCallback((text: string, callbacks?: SpeechCallbacks) => {
    if (!isSupported || !text.trim()) {
      callbacks?.onError?.();
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
      callbacks?.onStart?.();
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      callbacks?.onEnd?.();
    };
    
    utterance.onerror = (event) => {
      console.error('Error en síntesis de voz:', event.error);
      setIsSpeaking(false);
      callbacks?.onError?.();
    };
    
    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [isSupported, selectedVoice]);

  const speakText = useCallback(async (text: string, callbacks?: SpeechCallbacks) => {
    if (!text.trim() || isSpeaking) return;
    
    // Try ElevenLabs streaming TTS first
    let elevenLabsSuccess = false;
    
    try {
      elevenLabsSuccess = await speakWithElevenLabsStreamTTS(text, callbacks);
    } catch (error) {
      console.warn('ElevenLabs streaming failed, trying regular TTS:', error);
    }
    
    if (!elevenLabsSuccess) {
      // Fallback to regular ElevenLabs TTS
      elevenLabsSuccess = await speakWithElevenLabsTTS(text, callbacks);
    }
    
    if (!elevenLabsSuccess) {
      // Final fallback to browser speech synthesis
      speakWithBrowserTTS(text, callbacks);
    }
  }, [isSpeaking, speakWithElevenLabsStreamTTS, speakWithElevenLabsTTS, speakWithBrowserTTS]);

  const stopSpeaking = useCallback(() => {
    // Stop streaming audio if playing
    if (streamPlayerRef.current) {
      streamPlayerRef.current.stop();
      streamPlayerRef.current = null;
    }
    
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
    
    setStreamingProgress(0);
  }, [isSpeaking]);

  useEffect(() => {
    return () => {
      if (speechSynthesis) {
        speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (streamPlayerRef.current) {
        streamPlayerRef.current.stop();
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
    stopSpeaking,
    streamingProgress
  };
};