import { useCallback, useState } from 'react';
import { VENUS_PROMPT } from '@/lib/prompts/venus-prompt';

interface ResponseGeneratorHookReturn {
  generateResponse: (input: string) => Promise<string>;
  isGenerating: boolean;
  error: string | null;
}

interface OpenAIConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export const useResponseGenerator = (config?: OpenAIConfig): ResponseGeneratorHookReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configuración por defecto
  const defaultConfig: OpenAIConfig = {
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
    model: 'gpt-4.1-mini',
    maxTokens: 150
  };

  const finalConfig = { ...defaultConfig, ...config };

  // Prompt del sistema para el presentador de talentos
  const systemPrompt = VENUS_PROMPT;

  // Generar respuesta con OpenAI
  const generateOpenAIResponse = useCallback(async (input: string): Promise<string> => {
    if (!finalConfig.apiKey) {
      throw new Error('API Key de OpenAI no configurada');
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${finalConfig.apiKey}`
        },
        body: JSON.stringify({
          model: finalConfig.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: input
            }
          ],
          max_tokens: finalConfig.maxTokens,
          temperature: 0.8, // Un poco de creatividad
          presence_penalty: 0.1, // Evitar repetición
          frequency_penalty: 0.1
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.choices[0]?.message?.content?.trim();

      if (!generatedText) {
        throw new Error('No se recibió respuesta de OpenAI');
      }

      return generatedText;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error al generar respuesta con OpenAI:', err);
      
      // Fallback a respuesta local en caso de error
      return getFallbackResponse(input);
    } finally {
      setIsGenerating(false);
    }
  }, [finalConfig, systemPrompt]);

  // Respuestas de fallback en caso de error con OpenAI
  const getFallbackResponse = useCallback((inputText: string): string => {
    const input = inputText.toLowerCase();
    
    const responses = {
      greetings: [
        "¡Hola! ¡Qué gusto saludarte!",
        "¡Bienvenido al escenario! ¿Listo para brillar?",
        "¡Saludos! La energía aquí está increíble.",
      ],
      
      talents: [
        "¡Me encanta ver nuevos talentos! Cuéntame más.",
        "¡Fantástico! El escenario es tuyo.",
        "¡Qué emocionante! ¿Cuál es tu especialidad?",
      ],
      
      nerves: [
        "Es normal sentir nervios, ¡significa que te importa!",
        "Los nervios son energía positiva. ¡Tú puedes!",
        "Respira profundo, el público está contigo.",
      ],
      
      gratitude: [
        "¡Un placer! Estoy aquí para apoyarte.",
        "¡Gracias a ti por compartir tu talento!",
        "¡Para eso estoy! ¡Sigamos con el show!",
      ],
      
      generic: [
        "¡Qué interesante! Cuéntame más sobre eso.",
        "¡Me gusta tu energía! ¿Qué más tienes?",
        "¡Fantástico! El público está cautivado.",
        "¡Impresionante! Sigue así.",
      ]
    };
    
    if (input.includes('hola') || input.includes('buenos') || input.includes('saludos')) {
      return getRandomResponse(responses.greetings);
    }
    
    if (input.includes('talento') || input.includes('show') || input.includes('presentar')) {
      return getRandomResponse(responses.talents);
    }
    
    if (input.includes('nervioso') || input.includes('miedo') || input.includes('ansiedad')) {
      return getRandomResponse(responses.nerves);
    }
    
    if (input.includes('gracias') || input.includes('thank')) {
      return getRandomResponse(responses.gratitude);
    }
    
    return getRandomResponse(responses.generic);
  }, []);

  const getRandomResponse = (responseArray: string[]): string => {
    return responseArray[Math.floor(Math.random() * responseArray.length)];
  };

  // Función principal que decide entre OpenAI o fallback
  const generateResponse = useCallback(async (input: string): Promise<string> => {
    // Si no hay API key, usar respuestas locales
    if (!finalConfig.apiKey) {
      console.warn('No se encontró API Key de OpenAI, usando respuestas locales');
      return getFallbackResponse(input);
    }

    try {
      return await generateOpenAIResponse(input);
    } catch (err) {
      console.error('Error con OpenAI, usando fallback:', err);
      return getFallbackResponse(input);
    }
  }, [finalConfig.apiKey, generateOpenAIResponse, getFallbackResponse]);

  return { 
    generateResponse, 
    isGenerating, 
    error 
  };
};