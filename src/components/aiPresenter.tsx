'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './aiPresenter.module.css';

interface AIPresenterProps {
className?: string;
onTranscription?: (text: string) => void;
}

const AIPresenter: React.FC<AIPresenterProps> = ({ className = '', onTranscription }) => {
const [currentState, setCurrentState] = useState<'thinking' | 'speaking' | 'listening'>('thinking');
const [statusMessage, setStatusMessage] = useState('Analizando próximo talento...');
const [isListening, setIsListening] = useState(false);
const [transcript, setTranscript] = useState('');
const recognitionRef = useRef<SpeechRecognition | null>(null);
const [isSupported, setIsSupported] = useState(false);
const retryCount = useRef(0);
const MAX_RETRIES = 3;
const RETRY_DELAY = 3000; // Start with 3 seconds

const thinkingMessages = [
  "Analizando próximo talento...",
  "Procesando información del participante...",
  "Preparando comentario inteligente...",
  "Evaluando presentación anterior...",
  "Cargando base de datos de chistes..."
];

const speakingMessages = [
  "¡Excelente presentación!",
  "Eso fue realmente impresionante.",
  "El público está completamente cautivado.",
  "¡Qué talento tan increíble acabamos de presenciar!",
  "Continuemos con nuestro siguiente participante.",
  "La energía aquí esta noche es absolutamente fantástica.",
  "Ese nivel de creatividad merece una ovación.",
  "Preparémonos para la siguiente sorpresa."
];

const listeningMessages = [
  "Escuchando tu mensaje...",
  "Procesando tu voz...",
  "Analizando tu comentario...",
  "Te estoy escuchando..."
];

const startThinking = useCallback(() => {
  setCurrentState('thinking');
  setStatusMessage(thinkingMessages[0]);
  setTranscript('');
}, [thinkingMessages]);

// Inicializar reconocimiento de voz
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        setIsSupported(true);
        const recognition = new SpeechRecognition();
        
        // Configuraciones más robustas
        recognition.continuous = false; // Cambiar a false para sesiones más cortas
        recognition.interimResults = true;
        recognition.lang = 'es-ES';
        recognition.maxAlternatives = 1;
        
        recognition.onstart = () => {
          console.log('Reconocimiento iniciado');
          setIsListening(true);
          setCurrentState('listening');
          setStatusMessage(listeningMessages[0]);
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
          
          if (finalTranscript) {
            setTranscript(finalTranscript);
            if (onTranscription) {
              onTranscription(finalTranscript);
            }
          }
          
          // Mostrar el texto que se está escuchando
          const currentText = finalTranscript || interimTranscript;
          if (currentText) {
            setStatusMessage(`"${currentText}"`);
          }
        };
        
        recognition.onerror = (event) => {
          console.error('Error en reconocimiento de voz:', event.error, event);
          
          // No intentar reintentar si el reconocimiento ya está en progreso
          if (isListening) {
            setIsListening(false);
          }
          
          // Manejo específico de errores
          let errorMessage = 'Error al escuchar. Intenta de nuevo.';
          const errorType = event.error;
          
          switch (errorType) {
            case 'network':
              errorMessage = 'Error de conexión con el servicio de voz. Verifica tu conexión a internet.';
              if (retryCount.current < MAX_RETRIES) {
                const delay = Math.min(RETRY_DELAY * Math.pow(2, retryCount.current), 30000); // Max 30s delay
                retryCount.current++;
                
                console.log(`Reintentando en ${delay}ms... (Intento ${retryCount.current}/${MAX_RETRIES})`);
                
                setTimeout(() => {
                  if (recognitionRef.current) {
                    try {
                      recognitionRef.current.start();
                    } catch (e) {
                      console.error('Error al reintentar:', e);
                    }
                  }
                }, delay);
                
                // No mostrar mensaje de error si vamos a reintentar
                setStatusMessage(`Reconectando... (${retryCount.current}/${MAX_RETRIES})`);
                return; // Salir temprano para evitar mostrar el mensaje de error
              } else {
                errorMessage = 'No se pudo conectar con el servicio de voz. Por favor, recarga la página.';
              }
              break;
              
            case 'not-allowed':
              errorMessage = 'Permisos de micrófono denegados. Por favor, permite el acceso al micrófono en la configuración de tu navegador.';
              break;
              
            case 'no-speech':
              errorMessage = 'No se detectó voz. Intenta hablar más fuerte o más cerca del micrófono.';
              break;
              
            case 'audio-capture':
              errorMessage = 'No se pudo acceder al micrófono. Asegúrate de que el micrófono esté conectado y tenga permisos.';
              break;
              
            case 'service-not-allowed':
              errorMessage = 'El servicio de reconocimiento de voz no está disponible en este navegador. Prueba con Chrome o Edge.';
              break;
              
            case 'aborted':
              // No mostrar error para operaciones canceladas
              console.log('Reconocimiento de voz cancelado');
              return;
              
            default:
              errorMessage = `Error de reconocimiento de voz: ${errorType || 'Error desconocido'}`;
          }
          
          // Mostrar mensaje de error final
          setStatusMessage(errorMessage);
          
          // Reiniciar contador de reintentos
          retryCount.current = 0;
          
          // Volver a thinking después de 3 segundos
          setTimeout(() => {
            setCurrentState('thinking');
            setStatusMessage(thinkingMessages[0]);
          }, 3000);
        };
        
        recognition.onend = () => {
          console.log('Reconocimiento terminado');
          setIsListening(false);
          
          // Solo reiniciar el contador si no hay error de red pendiente
          if (retryCount.current === 0) {
            if (transcript) {
              setStatusMessage(`Escuché: "${transcript}"`);
              setTimeout(() => {
                startThinking();
              }, 3000);
            } else {
              startThinking();
            }
          } 
          startThinking();
        };
        
        recognitionRef.current = recognition;
      } else {
        console.log('Reconocimiento de voz no soportado');
        setIsSupported(false);
      }
    }
  }, [transcript, onTranscription, listeningMessages, startThinking, thinkingMessages]);

  const startSpeaking = useCallback(() => {
    setCurrentState('speaking');
    const randomSpeech = speakingMessages[Math.floor(Math.random() * speakingMessages.length)];
    setStatusMessage(randomSpeech);
    
    const speakDuration = 4000 + Math.random() * 4000;
    setTimeout(() => {
      startThinking();
    }, speakDuration);
  }, [startThinking, speakingMessages]);

const startListening = useCallback(() => {
  if (!isSupported) {
    setStatusMessage('Reconocimiento de voz no soportado en este navegador');
    return;
  }

  // Verificar permisos de micrófono primero
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        if (recognitionRef.current && !isListening) {
          setTranscript('');
          try {
            recognitionRef.current.start();
          } catch (error) {
            console.error('Error al iniciar reconocimiento:', error);
            setStatusMessage('Error al iniciar el reconocimiento de voz');
            setTimeout(() => startThinking(), 2000);
          }
        }
      })
      .catch((error) => {
        console.error('Error de permisos de micrófono:', error);
        setStatusMessage('Necesitas dar permisos de micrófono');
        setTimeout(() => startThinking(), 3000);
      });
  } else {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error al iniciar reconocimiento:', error);
        setStatusMessage('Error al iniciar el reconocimiento de voz');
        setTimeout(() => startThinking(), 2000);
      }
    }
  }
}, [isSupported, isListening, startThinking]);

const stopListening = useCallback(() => {
  if (recognitionRef.current && isListening) {
    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error('Error al detener reconocimiento:', error);
      setIsListening(false);
      startThinking();
    }
  }
}, [isListening, startThinking]);

const toggleState = () => {
  if (currentState === 'thinking') {
    startListening();
  } else if (currentState === 'listening') {
    stopListening();
  } else {
    startThinking();
  }
};

// Cambiar mensaje de pensamiento cada 4 segundos
useEffect(() => {
  if (currentState === 'thinking') {
    const thinkingInterval = setInterval(() => {
      const randomMessage = thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];
      setStatusMessage(randomMessage);
    }, 4000);

    return () => clearInterval(thinkingInterval);
  } else if (currentState === 'listening') {
    const listeningInterval = setInterval(() => {
      if (!transcript) {
        const randomMessage = listeningMessages[Math.floor(Math.random() * listeningMessages.length)];
        setStatusMessage(randomMessage);
      }
    }, 2000);

    return () => clearInterval(listeningInterval);
  }
}, [currentState, thinkingMessages, listeningMessages, transcript]);

// Auto-cambio aleatorio cada 10-18 segundos (solo si no está escuchando)
useEffect(() => {
  const randomStateChange = () => {
    const delay = 10000 + Math.random() * 8000;
    setTimeout(() => {
      if (currentState === 'thinking' && Math.random() > 0.4) {
        startSpeaking();
      }
      randomStateChange();
    }, delay);
  };

  if (currentState !== 'listening') {
    randomStateChange();
  }
}, [currentState, startSpeaking]);

useEffect(() => {
  return () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };
}, []);

// Easter egg: triple click para modo presentación
const handleTripleClick = (() => {
  let clickCount = 0;
  let clickTimer: NodeJS.Timeout;

  return () => {
    clickCount++;
    clearTimeout(clickTimer);
    
    clickTimer = setTimeout(() => {
      clickCount = 0;
    }, 500);

    if (clickCount === 3) {
      document.body.style.cursor = 'none';
      console.log('Modo presentación activado');
    }
  };
})();

return (
  <div className={`${styles.container} ${className}`}>
    <div className={styles.aiContainer}>
      <div 
        className={`${styles.holographicSphere} ${styles[currentState]}`}
        onClick={() => {
          toggleState();
          handleTripleClick();
        }}
      >
        <div className={styles.sphereMain}>
          <div className={styles.crystalFacets}>
            <div className={styles.facet}></div>
            <div className={styles.facet}></div>
            <div className={styles.facet}></div>
          </div>
        </div>
        <div className={styles.aiEyes}>
          <div className={styles.eye}></div>
          <div className={styles.eye}></div>
        </div>
        <div className={styles.groundReflection}></div>
        <div className={styles.particle}></div>
        <div className={styles.particle}></div>
        <div className={styles.particle}></div>
        <div className={styles.particle}></div>
      </div>
      
      <div className={`${styles.aiStatus} ${styles[currentState]}`}>
        {statusMessage}
      </div>
    </div>

    <div className={styles.controlHint}>
      {isSupported 
        ? "Toca la esfera para escuchar tu voz y convertirla a texto"
        : "Toca la esfera para alternar entre pensando y hablando"
      }
      <br />
      <small style={{ opacity: 0.6, fontSize: '0.7rem', marginTop: '0.5rem', display: 'block' }}>
        {typeof window !== 'undefined' && location.protocol === 'http:' && location.hostname !== 'localhost'
          ? "⚠️ Necesitas HTTPS para usar el micrófono"
          : isSupported 
            ? "✅ Reconocimiento de voz disponible" 
            : "❌ Reconocimiento de voz no soportado"
        }
      </small>
    </div>

    {transcript && (
      <div className={styles.transcriptDisplay}>
        <strong>Transcripción:</strong> {transcript}
      </div>
    )}
  </div>
);
};

export default AIPresenter;