'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSpeechRecognition } from '../app/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../app/hooks/useSpeechSynthesis';
import { useResponseGenerator } from '../app/hooks/useResponseGenerator';
import { AIVisualizer } from '@/components/visualizer/aiVisualizer';
import { StatusDisplay } from '@/components/visualizer/statusDisplay';
import { TranscriptDisplay } from '@/components/visualizer/transcriptDisplay';
import styles from '@/components/aiPresenter.module.css';

interface AIPresenterProps {
  className?: string;
  onTranscription?: (text: string) => void;
  onResponse?: (response: string) => void;
}

export type AIState = 'thinking' | 'speaking' | 'listening';

const AIPresenter: React.FC<AIPresenterProps> = ({ 
  className = '', 
  onTranscription, 
  onResponse 
}) => {
  const [currentState, setCurrentState] = useState<AIState>('thinking');
  const [statusMessage, setStatusMessage] = useState('Listo para interactuar');
  const [transcript, setTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');

  // Custom hooks
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

  // Procesar transcripción y generar respuesta
  const processTranscription = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    setCurrentState('thinking');
    setStatusMessage(isGenerating ? 'Pensando con IA...' : 'Generando respuesta...');
    
    try {
      const response = await generateResponse(text);
      setLastResponse(response);
      
      if (onResponse) onResponse(response);
      
      // Hablar la respuesta
      speakText(response, {
        onStart: () => {
          setCurrentState('speaking');
          setStatusMessage('Hablando...');
        },
        onEnd: () => {
          setCurrentState('thinking');
          setStatusMessage('Listo para interactuar');
        },
        onError: () => {
          setCurrentState('thinking');
          setStatusMessage('Error al reproducir audio');
        }
      });
    } catch (err) {
      console.error('Error al generar respuesta:', err);
      setCurrentState('thinking');
      setStatusMessage('Error al generar respuesta');
      
      // Mostrar error por 3 segundos y luego volver al estado normal
      setTimeout(() => {
        setStatusMessage('Listo para interactuar');
      }, 3000);
    }
  }, [generateResponse, speakText, onResponse, isGenerating]);

  // Controles principales
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
    setStatusMessage('Listo para interactuar');
  }, [stopSpeaking]);

  // Toggle entre estados
  const toggleState = useCallback(() => {
    if (isSpeaking) {
      handleStopSpeaking();
    } else if (currentState === 'thinking') {
      startListening();
    } else if (currentState === 'listening') {
      stopListening();
    }
  }, [currentState, isSpeaking, handleStopSpeaking, startListening, stopListening]);

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
          ? "Toca la esfera para hablar y recibir una respuesta por voz"
          : "Reconocimiento de voz no disponible"
        }
        <br />
        <small className={styles.statusIndicators}>
          {typeof window !== 'undefined' && location.protocol === 'http:' && location.hostname !== 'localhost'
            ? "⚠️ Necesitas HTTPS para usar el micrófono"
            : recognitionSupported 
              ? `✅ Reconocimiento disponible ${speechSupported ? '🔊 Audio disponible' : '🔇 Sin audio'}` 
              : "❌ Reconocimiento de voz no soportado"
          }
        </small>
      </div>
    </div>
  );
};

export default AIPresenter;