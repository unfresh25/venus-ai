'use client';

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';

export interface Participant {
  id: number;
  name: string;
  talent: string;
  score: number;
  hasPerformed: boolean;
}

interface TalentShowContextType {
  participants: Participant[];
  currentParticipant: number | null;
  updateParticipantScore: (id: number, score: number) => void;
  setCurrentParticipant: (id: number | null) => void;
  resetScores: () => void;
  playCensorBeep: () => void;
  playIntroTemplate: (participantId: number) => void;
  getNextParticipant: () => Participant | undefined;
  addParticipant: (participant: Omit<Participant, 'id' | 'score' | 'hasPerformed'>) => void;
  removeParticipant: (id: number) => void;
}

const TalentShowContext = createContext<TalentShowContextType | undefined>(undefined);

const initialParticipants: Participant[] = [
  { id: 1, name: 'Mafe', talent: 'Manitas pa que te tengo', score: 0, hasPerformed: false },
  { id: 2, name: 'María Buzón', talent: 'TED Talk: Exportando emociones: Lo que Europa olvidó incluir en el tratado Schengen', score: 0, hasPerformed: false },
  { id: 3, name: 'Estiven', talent: 'Posicionamiento en la cancha', score: 0, hasPerformed: false },
];

export function TalentShowProvider({ children }: { children: React.ReactNode }) {
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [currentParticipant, setCurrentParticipantState] = useState<number | null>(null);
  const [censorBeepAudio, setCensorBeepAudio] = useState<HTMLAudioElement | null>(null);

  // Initialize censor beep audio
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Create a censorship beep sound using AudioContext
      const createCensorBeep = () => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Create multiple beeps for a more distinctive censor sound
        const createSingleBeep = (startTime: number, frequency: number, duration: number) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(frequency, startTime);
          oscillator.type = 'square'; // Square wave for more harsh/mechanical sound
          
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
          gainNode.gain.linearRampToValueAtTime(0.3, startTime + duration - 0.01);
          gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
          
          oscillator.start(startTime);
          oscillator.stop(startTime + duration);
        };
        
        const now = audioContext.currentTime;
        // Create a sequence of beeps that sound like censorship
        createSingleBeep(now, 1000, 0.15);      // First beep
        createSingleBeep(now + 0.15, 800, 0.15);  // Second beep (lower)
        createSingleBeep(now + 0.3, 1000, 0.15);   // Third beep
        createSingleBeep(now + 0.45, 600, 0.2);    // Final beep (longer, lower)
      };

      setCensorBeepAudio({ play: createCensorBeep } as any);
    }
  }, []);

  const updateParticipantScore = useCallback((id: number, score: number) => {
    setParticipants(prev => 
      prev.map(participant => 
        participant.id === id 
          ? { ...participant, score, hasPerformed: true }
          : participant
      )
    );
  }, []);

  const setCurrentParticipant = useCallback((id: number | null) => {
    setCurrentParticipantState(id);
  }, []);

  const resetScores = useCallback(() => {
    setParticipants(prev => 
      prev.map(participant => ({ 
        ...participant, 
        score: 0, 
        hasPerformed: false 
      }))
    );
    setCurrentParticipantState(null);
  }, []);

  const playCensorBeep = useCallback(() => {
    if (censorBeepAudio) {
      censorBeepAudio.play();
    }
  }, [censorBeepAudio]);

  const playIntroTemplate = useCallback(async (participantId: number) => {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;

    // Create template audio for participant introduction
    const templates = [
      `[excited] ¡Y ahora, con ustedes, recibamos con un fuerte aplauso a ${participant.name}! [happy] Quien nos deleitará con "${participant.talent}". [excited] ¡El escenario es suyo!`,
      `[happy] ¡Atención, atención! [excited] Es el momento de ${participant.name} con su increíble talento: "${participant.talent}". [laughing] ¡Esto va a estar buenísimo!`,
      `[excited] ¡Damas y caballeros, es hora del show! [happy] Démosle la bienvenida a ${participant.name} quien nos presentará "${participant.talent}". [excited] ¡Que comience el espectáculo!`
    ];

    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    // Use speech synthesis to play the template
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(randomTemplate);
      const voices = speechSynthesis.getVoices();
      const spanishVoice = voices.find(voice => voice.lang.startsWith('es'));
      if (spanishVoice) utterance.voice = spanishVoice;
      
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      speechSynthesis.speak(utterance);
    }
  }, [participants]);

  const getNextParticipant = useCallback(() => {
    return participants.find(p => !p.hasPerformed);
  }, [participants]);

  const addParticipant = useCallback((participant: Omit<Participant, 'id' | 'score' | 'hasPerformed'>) => {
    setParticipants(prev => {
      const newId = prev.length > 0 ? Math.max(...prev.map(p => p.id)) + 1 : 1;
      return [...prev, {
        ...participant,
        id: newId,
        score: 0,
        hasPerformed: false
      }];
    });
  }, []);

  const removeParticipant = useCallback((id: number) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
    if (currentParticipant === id) {
      setCurrentParticipantState(null);
    }
  }, [currentParticipant]);

  const value: TalentShowContextType = {
    participants,
    currentParticipant,
    updateParticipantScore,
    setCurrentParticipant,
    resetScores,
    playCensorBeep,
    playIntroTemplate,
    getNextParticipant,
    addParticipant,
    removeParticipant
  };

  return (
    <TalentShowContext.Provider value={value}>
      {children}
    </TalentShowContext.Provider>
  );
}

export function useTalentShow() {
  const context = useContext(TalentShowContext);
  if (context === undefined) {
    throw new Error('useTalentShow must be used within a TalentShowProvider');
  }
  return context;
}
