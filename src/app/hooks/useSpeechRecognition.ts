// hooks/useSpeechRecognition.ts
import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionHookProps {
  onTranscriptionStart?: () => void;
  onTranscriptionResult?: (text: string, isFinal: boolean) => void;
  onTranscriptionEnd?: () => void;
  onError?: (error: string) => void;
}

interface SpeechRecognitionHookReturn {
  isSupported: boolean;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
}

export const useSpeechRecognition = ({
  onTranscriptionStart,
  onTranscriptionResult,
  onTranscriptionEnd,
  onError
}: SpeechRecognitionHookProps): SpeechRecognitionHookReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 3000;

  // Inicializar reconocimiento de voz
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        setIsSupported(true);
        const recognition = new SpeechRecognition();
        
        // Configuración
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'es-ES';
        recognition.maxAlternatives = 1;
        
        // Event handlers
        recognition.onstart = () => {
          console.log('Reconocimiento iniciado');
          setIsListening(true);
          if (onTranscriptionStart) onTranscriptionStart();
        };
        
        recognition.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          
          if (onTranscriptionResult) {
            if (finalTranscript) {
              onTranscriptionResult(finalTranscript, true);
            } else if (interimTranscript) {
              onTranscriptionResult(interimTranscript, false);
            }
          }
        };
        
        recognition.onerror = (event) => {
          console.error('Error en reconocimiento de voz:', event.error);
          
          if (isListening) {
            setIsListening(false);
          }
          
          const errorType = event.error;
          let errorMessage = 'Error al escuchar. Intenta de nuevo.';
          
          switch (errorType) {
            case 'network':
              if (retryCount.current < MAX_RETRIES) {
                const delay = Math.min(RETRY_DELAY * Math.pow(2, retryCount.current), 30000);
                retryCount.current++;
                
                setTimeout(() => {
                  if (recognitionRef.current) {
                    try {
                      recognitionRef.current.start();
                    } catch (e) {
                      console.error('Error al reintentar:', e);
                    }
                  }
                }, delay);
                
                if (onError) onError(`Reconectando... (${retryCount.current}/${MAX_RETRIES})`);
                return;
              }
              errorMessage = 'Error de conexión. Recarga la página.';
              break;
              
            case 'not-allowed':
              errorMessage = 'Permisos de micrófono denegados';
              break;
              
            case 'no-speech':
              errorMessage = 'No se detectó voz';
              break;
              
            case 'audio-capture':
              errorMessage = 'Error al acceder al micrófono';
              break;
              
            case 'service-not-allowed':
              errorMessage = 'Servicio no disponible en este navegador';
              break;
              
            case 'aborted':
              console.log('Reconocimiento cancelado');
              return;
          }
          
          retryCount.current = 0;
          if (onError) onError(errorMessage);
        };
        
        recognition.onend = () => {
          console.log('Reconocimiento terminado');
          setIsListening(false);
          if (onTranscriptionEnd) onTranscriptionEnd();
        };
        
        recognitionRef.current = recognition;
      } else {
        setIsSupported(false);
      }
    }
  }, [onTranscriptionStart, onTranscriptionResult, onTranscriptionEnd, onError]);

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current || isListening) return;

    // Verificar permisos de micrófono
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          try {
            recognitionRef.current?.start();
          } catch (error) {
            console.error('Error al iniciar reconocimiento:', error);
            if (onError) onError('Error al iniciar reconocimiento');
          }
        })
        .catch((error) => {
          console.error('Error de permisos:', error);
          if (onError) onError('Permisos de micrófono requeridos');
        });
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error al iniciar reconocimiento:', error);
        if (onError) onError('Error al iniciar reconocimiento');
      }
    }
  }, [isSupported, isListening, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error al detener reconocimiento:', error);
        setIsListening(false);
      }
    }
  }, [isListening]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    startListening,
    stopListening
  };
};