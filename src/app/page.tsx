'use client';

import { useState } from 'react';
import AIPresenter from '@/components/aiPresenter';
import ParticipantsList from '@/components/participantsList';
import { useTalentShow } from '@/contexts/TalentShowContext';

export default function Home() {
  const {
    participants,
    currentParticipant,
    updateParticipantScore,
    setCurrentParticipant,
    getNextParticipant
  } = useTalentShow();

  const [lastTranscription, setLastTranscription] = useState('');

  const handleTranscription = (text: string) => {
    setLastTranscription(text);
    processScoreCommand(text);
  };

  const processScoreCommand = (text: string) => {
    const normalizedText = text.toLowerCase().trim();
    
    const scorePatterns = [
      // "El puntaje de [nombre] es [número]"
      /(?:el\s+)?(?:puntaje|puntuación|nota|calificación)\s+(?:de\s+|para\s+)?([a-zA-ZñÑáéíóúüÁÉÍÓÚÜ\s]+?)\s+(?:es|fue|será)?\s*(\d+(?:[.,]\d+)?)/i,
      // "[nombre] obtiene/recibe [número]"
      /([a-zA-ZñÑáéíóúüÁÉÍÓÚÜ\s]+?)\s+(?:obtiene|recibe|tiene|consigue)\s*(\d+(?:[.,]\d+)?)/i,
      // "Dar/Asignar [número] a [nombre]"
      /(?:dar|asignar|poner)\s*(\d+(?:[.,]\d+)?)\s+(?:a|para)\s+([a-zA-ZñÑáéíóúüÁÉÍÓÚÜ\s]+)/i,
      // "[número] puntos para [nombre]"
      /(\d+(?:[.,]\d+)?)\s+(?:puntos?|punto)\s+(?:para|a)\s+([a-zA-ZñÑáéíóúüÁÉÍÓÚÜ\s]+)/i,
      // "[nombre] [número]" (formato corto)
      /^([a-zA-ZñÑáéíóúüÁÉÍÓÚÜ\s]+?)\s+(\d+(?:[.,]\d+)?)$/i
    ];

    for (const pattern of scorePatterns) {
      const match = normalizedText.match(pattern);
      if (match) {
        let participantName, scoreStr;
        
        if (pattern.source.indexOf('([a-zA-Z') < pattern.source.indexOf('(\\d+')) {
          participantName = match[1]?.trim();
          scoreStr = match[2]?.trim();
        } else {
          scoreStr = match[1]?.trim();
          participantName = match[2]?.trim();
        }

        if (participantName && scoreStr) {
          const score = parseFloat(scoreStr.replace(',', '.'));
          
          if (score >= 0 && score <= 10) {
            const participant = findParticipantByName(participantName);
            if (participant) {
              updateParticipantScore(participant.id, score);
              setCurrentParticipant(participant.id);
              return true;
            }
          }
        }
        break;
      }
    }
    return false;
  };

  const findParticipantByName = (inputName: string) => {
    const normalizedInput = inputName.toLowerCase().trim();
    
    return participants.find(participant => {
      const normalizedName = participant.name.toLowerCase().trim();
      
      if (normalizedName === normalizedInput) return true;
      
      if (normalizedName.includes(normalizedInput) || normalizedInput.includes(normalizedName)) return true;
      
      const inputWords = normalizedInput.split(/\s+/);
      const nameWords = normalizedName.split(/\s+/);
      
      return inputWords.some(inputWord => 
        nameWords.some(nameWord => 
          nameWord.includes(inputWord) || inputWord.includes(nameWord)
        )
      );
    });
  };

  return (
    <main className="min-h-screen bg-black">
      <div className="flex flex-col lg:flex-row gap-6 p-6">
        <div className="flex-1">
          <AIPresenter 
            onTranscription={handleTranscription}
            participants={participants}
            currentParticipant={currentParticipant}
            nextParticipant={getNextParticipant()}
            onUpdateScore={updateParticipantScore}
          />
        </div>
        
        <div className="lg:w-96">
          <ParticipantsList 
            participants={participants}
            onUpdateScore={updateParticipantScore}
            currentParticipant={currentParticipant}
          />
        </div>
      </div>
    </main>
  );
}
