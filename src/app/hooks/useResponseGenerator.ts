import { useCallback, useState, useRef } from 'react';
import { VENUS_PROMPT } from '@/lib/prompts/venus-prompt';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ResponseGeneratorHookReturn {
  generateResponse: (input: string) => Promise<string>;
  isGenerating: boolean;
  error: string | null;
  messages: Message[];
  clearHistory: () => void;
  setMaxHistoryLength: (length: number) => void;
}

interface OpenAIConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  maxHistoryLength?: number;
}

export const useResponseGenerator = (config?: OpenAIConfig): ResponseGeneratorHookReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const maxHistoryLengthRef = useRef(config?.maxHistoryLength || 20);

  const defaultConfig: OpenAIConfig = {
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
    model: 'gpt-4.1-mini',
    maxTokens: 150,
    maxHistoryLength: 20
  };

  const finalConfig = { ...defaultConfig, ...config };

  const systemPrompt = VENUS_PROMPT;

  const trimHistory = useCallback((messageHistory: Message[]): Message[] => {
    const maxLength = maxHistoryLengthRef.current;
    
    if (messageHistory.length <= maxLength) {
      return messageHistory;
    }

    const systemMessage = messageHistory.find(msg => msg.role === 'system');
    const otherMessages = messageHistory.filter(msg => msg.role !== 'system');
    
    const recentMessages = otherMessages.slice(-(maxLength - 1));
    
    return systemMessage ? [systemMessage, ...recentMessages] : recentMessages;
  }, []);

  const generateOpenAIResponse = useCallback(async (input: string): Promise<string> => {
    if (!finalConfig.apiKey) {
      throw new Error('API Key de OpenAI no configurada');
    }

    setIsGenerating(true);
    setError(null);

    try {
      const userMessage: Message = {
        role: 'user',
        content: input
      };
      const currentMessages: Message[] = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...messages,
        userMessage
      ];

      const trimmedMessages = trimHistory(currentMessages);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${finalConfig.apiKey}`
        },
        body: JSON.stringify({
          model: finalConfig.model,
          messages: trimmedMessages,
          max_tokens: finalConfig.maxTokens,
          temperature: 0.8,
          presence_penalty: 0.1,
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

      const assistantMessage: Message = {
        role: 'assistant',
        content: generatedText
      };

      setMessages(prevMessages => {
        const newMessages = [...prevMessages, userMessage, assistantMessage];
        return trimHistory(newMessages);
      });

      return generatedText;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error al generar respuesta con OpenAI:', err);
      
      const fallbackResponse = getFallbackResponse(input);
      
      const userMessage: Message = { role: 'user', content: input };
      const assistantMessage: Message = { role: 'assistant', content: fallbackResponse };
      
      setMessages(prevMessages => {
        const newMessages = [...prevMessages, userMessage, assistantMessage];
        return trimHistory(newMessages);
      });
      
      return fallbackResponse;
    } finally {
      setIsGenerating(false);
    }
  }, [finalConfig, systemPrompt, messages, trimHistory]);

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

  const clearHistory = useCallback(() => {
    setMessages([]);
  }, []);

  const setMaxHistoryLength = useCallback((length: number) => {
    maxHistoryLengthRef.current = length;
    setMessages(prevMessages => trimHistory(prevMessages));
  }, [trimHistory]);

  const generateResponse = useCallback(async (input: string): Promise<string> => {
    if (!finalConfig.apiKey) {
      console.warn('No se encontró API Key de OpenAI, usando respuestas locales');
      const fallbackResponse = getFallbackResponse(input);
      
      const userMessage: Message = { role: 'user', content: input };
      const assistantMessage: Message = { role: 'assistant', content: fallbackResponse };
      
      setMessages(prevMessages => {
        const newMessages = [...prevMessages, userMessage, assistantMessage];
        return trimHistory(newMessages);
      });
      
      return fallbackResponse;
    }

    try {
      return await generateOpenAIResponse(input);
    } catch (err) {
      console.error('Error con OpenAI, usando fallback:', err);
      return getFallbackResponse(input);
    }
  }, [finalConfig.apiKey, generateOpenAIResponse, getFallbackResponse, trimHistory]);

  return { 
    generateResponse, 
    isGenerating, 
    error,
    messages,
    clearHistory,
    setMaxHistoryLength
  };
};