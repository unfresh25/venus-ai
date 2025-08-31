import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
  throw new Error('Missing ELEVENLABS_API_KEY in environment variables');
}

const elevenlabs = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

export interface AudioStreamOptions {
  voiceId?: string;
  modelId?: string;
  voiceSettings?: {
    stability?: number;
    similarityBoost?: number;
    useSpeakerBoost?: boolean;
    speed?: number;
  };
}

// Función simplificada que retorna el stream directo de ElevenLabs
export const createStreamingAudio = async (
  text: string,
  options: AudioStreamOptions = {}
) => {
  const {
    voiceId = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb',
    modelId = 'eleven_v3',
    voiceSettings = {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.0,
      useSpeakerBoost: false
    }
  } = options;

  const audioStream = await elevenlabs.textToSpeech.stream(voiceId, {
    modelId,
    text,
    outputFormat: 'mp3_44100_128',
    voiceSettings,
  });

  return audioStream;
};

// Función para crear un ReadableStream para uso en APIs web
export const createWebStreamingAudio = async (
  text: string,
  options: AudioStreamOptions = {}
): Promise<ReadableStream<Uint8Array>> => {
  const {
    voiceId = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb',
    modelId = 'eleven_v3',
    voiceSettings = {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.0,
      useSpeakerBoost: false
    }
  } = options;

  const audioStream = await elevenlabs.textToSpeech.stream(voiceId, {
    modelId,
    text,
    outputFormat: 'mp3_44100_128',
    voiceSettings,
  });
  
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of audioStream) {
          controller.enqueue(new Uint8Array(chunk));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });
};
