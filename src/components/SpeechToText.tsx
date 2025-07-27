'use client';

import { useEffect, useRef, useState } from 'react';

const SpeechToText = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [status, setStatus] = useState('Presiona el botón y habla...');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setStatus('❌ Tu navegador no soporta reconocimiento de voz.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = true; // ← Esto permite mostrar texto en vivo
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsListening(true);
      setStatus('🎙️ Escuchando...');
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += text + ' ';
        } else {
          interimTranscript += text;
        }
      }

      setTranscript(prev => finalTranscript ? prev + finalTranscript : prev);
      if (interimTranscript) {
        setStatus('📝 Transcribiendo...');
        setTranscript(prev => prev + interimTranscript); // Mostrar provisional
      }
    };

    recognition.onerror = (event) => {
      console.error('Error de reconocimiento:', event.error);

      switch (event.error) {
        case 'network':
          setStatus('⚠️ Error de red con el servicio de voz.');
          break;
        case 'not-allowed':
          setStatus('🔒 Permisos de micrófono denegados.');
          break;
        case 'no-speech':
          setStatus('😶 No se detectó voz. Intenta hablar más fuerte o más cerca.');
          break;
        case 'audio-capture':
          setStatus('🎤 No se detectó micrófono.');
          break;
        default:
          setStatus(`❌ Error desconocido: ${event.error}`);
          break;
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setStatus('🛑 Reconocimiento detenido.');
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = () => {
    if (!recognitionRef.current || isListening) return;

    setTranscript('');
    setStatus('🕓 Solicitando permisos de micrófono...');

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        setTimeout(() => {
          try {
            recognitionRef.current!.start();
          } catch (e) {
            console.error('Error al iniciar:', e);
            setStatus('❌ No se pudo iniciar el reconocimiento.');
          }
        }, 500);
      })
      .catch((err) => {
        console.error('Permiso denegado:', err);
        setStatus('❌ No se concedió acceso al micrófono.');
      });
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif', maxWidth: 500 }}>
      <h3>🎤 Transcriptor de Voz a Texto</h3>

      {!isSupported ? (
        <p style={{ color: 'red' }}>Tu navegador no soporta esta funcionalidad.</p>
      ) : (
        <>
          <button onClick={startListening} disabled={isListening} style={{ padding: '0.5rem 1rem', marginRight: 10 }}>
            {isListening ? '🎧 Escuchando...' : '▶️ Hablar ahora'}
          </button>
          <button onClick={stopListening} disabled={!isListening} style={{ padding: '0.5rem 1rem' }}>
            ⏹️ Detener
          </button>

          <p style={{ marginTop: '1rem' }}>{status}</p>

          {transcript && (
            <p><strong>Transcripción:</strong> {transcript}</p>
          )}
        </>
      )}
    </div>
  );
};

export default SpeechToText;
