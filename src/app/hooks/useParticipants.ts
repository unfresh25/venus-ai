import { useState, useCallback } from 'react';

export interface Participant {
  id: number;
  name: string;
  talent: string;
  score: number;
  hasPerformed: boolean;
  isCurrent?: boolean;
}

export function useParticipants(initialParticipants: Participant[] = []) {
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [currentParticipantId, setCurrentParticipantId] = useState<number | null>(null);

  const updateParticipantScore = useCallback((id: number, score: number) => {
    setParticipants(prev => 
      prev.map(p => 
        p.id === id 
          ? { ...p, score, hasPerformed: true }
          : p
      )
    );
  }, []);

  const setCurrentParticipant = useCallback((id: number) => {
    setParticipants(prev => 
      prev.map(p => ({
        ...p,
        isCurrent: p.id === id
      }))
    );
    setCurrentParticipantId(id);
  }, []);

  const addParticipant = useCallback((participant: Omit<Participant, 'id' | 'score' | 'hasPerformed' | 'isCurrent'>) => {
    const newId = participants.length > 0 
      ? Math.max(...participants.map(p => p.id)) + 1 
      : 1;
      
    setParticipants(prev => [
      ...prev,
      {
        ...participant,
        id: newId,
        score: 0,
        hasPerformed: false,
        isCurrent: false
      }
    ]);
  }, [participants]);

  return {
    participants,
    currentParticipant: participants.find(p => p.id === currentParticipantId) || null,
    updateParticipantScore,
    setCurrentParticipant,
    addParticipant
  };
}
