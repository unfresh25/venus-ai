'use client';

import { useState } from 'react';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

export default function TestStreamingPage() {
  const [text, setText] = useState('Hola, este es un ejemplo de streaming de audio en tiempo real con ElevenLabs. Vamos a probar si el audio se reproduce mientras se va generando, como en el playground oficial.');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { isSpeaking, speakText, stopSpeaking } = useSpeechSynthesis();

  const handleSpeak = async () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    setIsLoading(true);
    
    await speakText(text, {
      onStart: () => {
        console.log('Audio streaming started!');
        setIsLoading(false);
      },
      onEnd: () => {
        console.log('Audio streaming ended!');
        setIsLoading(false);
      },
      onError: () => {
        console.log('Audio streaming error!');
        setIsLoading(false);
      }
    });
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Test Streaming Audio</h1>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="text-input" className="block text-sm font-medium mb-2">
            Texto para sintetizar:
          </label>
          <textarea
            id="text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md resize-none h-24"
            placeholder="Escribe el texto que quieres convertir a audio..."
          />
        </div>

        <div className="flex gap-4 items-center">
          <button
            onClick={handleSpeak}
            disabled={isLoading || !text.trim()}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              isSpeaking 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:text-gray-500'
            }`}
          >
            {isLoading ? 'Iniciando...' : isSpeaking ? 'Detener Audio' : 'Reproducir Audio Streaming'}
          </button>

          <div className="flex items-center gap-2">
            <div 
              className={`w-3 h-3 rounded-full ${
                isLoading ? 'bg-yellow-400 animate-pulse' : 
                isSpeaking ? 'bg-green-400 animate-pulse' : 
                'bg-gray-300'
              }`}
            ></div>
            <span className="text-sm text-gray-600">
              {isLoading ? 'Cargando...' : isSpeaking ? 'Reproduciendo' : 'Listo'}
            </span>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="font-semibold mb-2">¿Qué esperar?</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• El audio debería comenzar a reproducirse casi inmediatamente</li>
            <li>• Verás mensajes de progreso en la consola del navegador</li>
            <li>• Si el streaming falla, automáticamente usará el método regular</li>
            <li>• Como último recurso, usará la síntesis de voz del navegador</li>
          </ul>
        </div>

        <div className="bg-blue-50 p-4 rounded-md">
          <h3 className="font-semibold mb-2">Tecnología implementada:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Streaming en tiempo real:</strong> El audio se reproduce mientras se genera</li>
            <li>• <strong>Fallback inteligente:</strong> Si el streaming falla, usa métodos alternativos</li>
            <li>• <strong>ElevenLabs SDK:</strong> Usa el SDK oficial para mejor rendimiento</li>
            <li>• <strong>MediaSource API:</strong> Para reproducción de chunks de audio</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
