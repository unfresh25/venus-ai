'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSpeechRecognition } from '../app/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../app/hooks/useSpeechSynthesis';
import { useResponseGenerator } from '../app/hooks/useResponseGenerator';
import { AIVisualizer } from '@/components/visualizer/aiVisualizer';
import { StatusDisplay } from '@/components/visualizer/statusDisplay';
import { Participant } from '@/contexts/TalentShowContext';
import styles from '@/components/aiPresenter.module.css';

interface AIPresenterProps {
  className?: string;
  onTranscription?: (text: string) => void;
  onResponse?: (response: string) => void;
  participants?: Participant[];
  currentParticipant?: number | null;
  nextParticipant?: Participant;
  onUpdateScore?: (id: number, score: number) => void;
}

export type AIState = 'thinking' | 'speaking' | 'listening';

const AIPresenter: React.FC<AIPresenterProps> = ({ 
  className = '', 
  onTranscription, 
  onResponse,
  participants = [],
  currentParticipant,
  nextParticipant,
  onUpdateScore
}) => {
  const [currentState, setCurrentState] = useState<AIState>('thinking');
  const [statusMessage, setStatusMessage] = useState('Listo para interactuar');
  const [transcript, setTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');

  const { generateResponse, isGenerating, error } = useResponseGenerator();
  
  const {
    isSupported: speechSupported,
    availableVoices,
    selectedVoice,
    setSelectedVoice,
    speakText,
    isSpeaking,
    stopSpeaking
  } = useSpeechSynthesis();

  const {
    isSupported: recognitionSupported,
    isListening,
    startListening: startRecognition,
    stopListening: stopRecognition
  } = useSpeechRecognition({
    onTranscriptionStart: () => {
      setCurrentState('listening');
      setStatusMessage('Escuchando...');
    },
    onTranscriptionResult: (text, isFinal) => {
      if (isFinal) {
        setTranscript(text);
        if (onTranscription) onTranscription(text);
        processTranscription(text);
      } else {
        setStatusMessage(`"${text}"`);
      }
    },
    onTranscriptionEnd: () => {
      // Se maneja en processTranscription
    },
    onError: (error) => {
      setStatusMessage(`Error: ${error}`);
      setTimeout(() => {
        setCurrentState('thinking');
        setStatusMessage('Listo para interactuar');
      }, 3000);
    }
  });

  const generateShowContext = useCallback(() => {
    const performedCount = participants.filter(p => p.hasPerformed).length;
    const totalParticipants = participants.length;
    const averageScore = performedCount > 0 
      ? participants.filter(p => p.hasPerformed).reduce((sum, p) => sum + p.score, 0) / performedCount 
      : 0;

    let context = `Eres Venus, la presentadora del show de talentos para el cumpleaños de Angie. `;
    
    if (totalParticipants > 0) {
      context += `Hay ${totalParticipants} participantes: ${participants.map(p => `${p.name} (${p.talent})`).join(', ')}. `;
      
      if (performedCount > 0) {
        context += `Ya han presentado ${performedCount} participantes con un promedio de ${averageScore.toFixed(1)} puntos. `;
        
        const topScorer = participants
          .filter(p => p.hasPerformed)
          .sort((a, b) => b.score - a.score)[0];
        
        if (topScorer) {
          context += `${topScorer.name} lidera con ${topScorer.score} puntos. `;
        }
      }
      
      if (nextParticipant) {
        context += `El próximo participante es ${nextParticipant.name} con "${nextParticipant.talent}". `;
      }
      
      if (performedCount === totalParticipants) {
        context += `¡Todas las presentaciones han terminado! `;
      }
    }

    context += `Puedes recibir puntuaciones diciéndote cosas como "el puntaje de [nombre] es [número]" o "[nombre] obtiene [número] puntos". `;
    context += `Mantén un tono alegre y festivo como presentadora de show. Responde de manera breve y entusiasta.`;

    return context;
  }, [participants, nextParticipant]);

  const processTranscription = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    setCurrentState('thinking');
    setStatusMessage(isGenerating ? 'Pensando con IA...' : 'Generando respuesta...');
    
    try {
      const showContext = generateShowContext();
      const fullPrompt = `${showContext}\n\nUsuario dice: "${text}"`;
      
      const response = await generateResponse(fullPrompt);
      setLastResponse(response);
      
      if (onResponse) onResponse(response);
      
      // Keep thinking state until audio actually starts playing
      setStatusMessage('Venus está pensando...');
      
      speakText(response, {
        onStart: () => {
          setCurrentState('speaking');
          setStatusMessage('Venus está hablando...');
        },
        onEnd: () => {
          setCurrentState('thinking');
          setStatusMessage('Venus lista para escuchar');
        },
        onError: () => {
          setCurrentState('thinking');
          setStatusMessage('Error al reproducir audio');
          setTimeout(() => {
            setStatusMessage('Venus lista para escuchar');
          }, 2000);
        }
      });
    } catch (err) {
      console.error('Error al generar respuesta:', err);
      setCurrentState('thinking');
      setStatusMessage('Error al generar respuesta');
      
      setTimeout(() => {
        setStatusMessage('Venus lista para escuchar');
      }, 3000);
    }
  }, [generateResponse, speakText, onResponse, isGenerating, generateShowContext]);

  const startListening = useCallback(() => {
    if (!recognitionSupported) {
      setStatusMessage('Reconocimiento de voz no soportado');
      return;
    }

    if (isSpeaking) {
      stopSpeaking();
    }

    setTranscript('');
    startRecognition();
  }, [recognitionSupported, isSpeaking, stopSpeaking, startRecognition]);

  const stopListening = useCallback(() => {
    stopRecognition();
  }, [stopRecognition]);

  const handleStopSpeaking = useCallback(() => {
    stopSpeaking();
    setCurrentState('thinking');
    setStatusMessage('Venus lista para escuchar');
  }, [stopSpeaking]);

  const toggleState = useCallback(() => {
    if (isSpeaking) {
      handleStopSpeaking();
    } else if (currentState === 'thinking') {
      startListening();
    } else if (currentState === 'listening') {
      stopListening();
    }
  }, [currentState, isSpeaking, handleStopSpeaking, startListening, stopListening]);

  useEffect(() => {
    if (currentParticipant && participants.length > 0) {
      const participant = participants.find(p => p.id === currentParticipant);
      if (participant) {
        setStatusMessage(`Puntuación registrada para ${participant.name}: ${participant.score}`);
        setTimeout(() => {
          setStatusMessage('Venus lista para escuchar');
        }, 3000);
      }
    }
  }, [currentParticipant, participants]);

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.aiContainer}>
        <AIVisualizer 
          state={currentState}
          isSpeaking={isSpeaking}
          onClick={toggleState}
        />
        
        <StatusDisplay 
          state={currentState}
          message={statusMessage}
        />
      </div>

      <div className={styles.controlHint}>
        {recognitionSupported 
          ? "Toca la esfera para hablar con Venus y dar puntuaciones"
          : "Reconocimiento de voz no disponible"
        }
      </div>
    </div>
  );
};

export default AIPresenter;