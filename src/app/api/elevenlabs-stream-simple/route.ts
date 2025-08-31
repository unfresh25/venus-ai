// api/elevenlabs-stream-simple/route.ts
import { NextRequest } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voiceId } = body;
    
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const selectedVoiceId = voiceId || process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';

    if (!apiKey || !text?.trim()) {
      return new Response('Error: Missing API key or text', { status: 400 });
    }

    // Initialize ElevenLabs client
    const elevenlabs = new ElevenLabsClient({
      apiKey: apiKey,
    });

    // Use MP3 format but with smaller chunks for faster initial response
    const audioStream = await elevenlabs.textToSpeech.stream(selectedVoiceId, {
      modelId: 'eleven_multilingual_v2',
      text,
      outputFormat: 'mp3_44100_128',
      voiceSettings: {
        stability: 0.5,
        similarityBoost: 0.75,
        useSpeakerBoost: false,
        speed: 1.0,
      },
    });

    // Create a streaming response that collects chunks efficiently
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const chunks: Buffer[] = [];
          let isFirstChunk = true;
          
          for await (const chunk of audioStream) {
            chunks.push(chunk);
            
            // Send first chunk ASAP to start playback
            if (isFirstChunk) {
              isFirstChunk = false;
              // Send a small signal that first data is ready
              controller.enqueue(new TextEncoder().encode('AUDIO_START\n'));
            }
          }
          
          // Send all audio data at once (MP3 needs complete file)
          const completeAudio = Buffer.concat(chunks);
          controller.enqueue(completeAudio);
          controller.close();
          
        } catch (error) {
          console.error('Error in audio stream:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (err: unknown) {
    console.error('ElevenLabs streaming API error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return new Response(errorMessage, { status: 500 });
  }
}

// lib/simple-audio-player.ts
export interface SimpleAudioCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  onProgress?: (bytesReceived: number) => void;
}

export class SimpleAudioPlayer {
  private audioElement: HTMLAudioElement | null = null;
  private callbacks: SimpleAudioCallbacks;
  private isPlaying = false;

  constructor(callbacks: SimpleAudioCallbacks = {}) {
    this.callbacks = callbacks;
  }

  async playStream(response: Response): Promise<void> {
    try {
      if (!response.body) {
        throw new Error('No response body available');
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      let audioStarted = false;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        if (value) {
          totalBytes += value.length;
          this.callbacks.onProgress?.(totalBytes);
          
          // Check if this is the start signal
          const text = new TextDecoder().decode(value);
          if (text.includes('AUDIO_START')) {
            // Signal that streaming has begun
            if (!audioStarted) {
              audioStarted = true;
              this.callbacks.onStart?.();
            }
            continue;
          }
          
          chunks.push(value);
          
          // Start playing as soon as we have substantial audio data
          if (!this.audioElement && chunks.length > 0 && totalBytes > 8192) { // 8KB threshold
            await this.startPlayback(chunks);
          }
        }
      }

      // If we haven't started playback yet, start now with all data
      if (!this.audioElement && chunks.length > 0) {
        await this.startPlayback(chunks);
      }

    } catch (error) {
      console.error('Stream playback error:', error);
      this.cleanup();
      this.callbacks.onError?.(error as Error);
    }
  }

  private async startPlayback(chunks: Uint8Array[]): Promise<void> {
    try {
      // Combine all chunks into a single audio blob
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const audioData = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        audioData.set(chunk, offset);
        offset += chunk.length;
      }

      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      this.audioElement = new Audio(audioUrl);
      
      this.audioElement.oncanplay = () => {
        if (!this.isPlaying) {
          this.isPlaying = true;
          this.audioElement!.play().catch(error => {
            console.error('Error playing audio:', error);
            this.callbacks.onError?.(error);
          });
        }
      };
      
      this.audioElement.onended = () => {
        this.cleanup();
        this.callbacks.onEnd?.();
      };
      
      this.audioElement.onerror = (event) => {
        console.error('Audio playback error:', event);
        this.cleanup();
        this.callbacks.onError?.(new Error('Audio playback failed'));
      };

      // Load the audio
      this.audioElement.load();

    } catch (error) {
      console.error('Error starting playback:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.isPlaying = false;
    this.totalBytesReceived = 0;
    this.audioQueue = [];
    
    if (this.audioElement) {
      this.audioElement.pause();
      if (this.audioElement.src) {
        URL.revokeObjectURL(this.audioElement.src);
      }
      this.audioElement = null;
    }
    
    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.stop();
        this.currentSourceNode.disconnect();
      } catch (error) {
        // Source might already be stopped
      }
      this.currentSourceNode = null;
    }
  }

  get playing(): boolean {
    return this.isPlaying;
  }
}