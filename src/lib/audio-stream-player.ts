// lib/audio-stream-player.ts
export interface AudioStreamCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  onProgress?: (bytesReceived: number) => void;
}

export class AudioStreamPlayer {
  private audioElement: HTMLAudioElement;
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private callbacks: AudioStreamCallbacks;
  private isPlaying = false;
  private hasNotifiedStart = false;
  private totalBytes = 0;
  private audioChunks: Uint8Array[] = [];
  private streamComplete = false;
  private hasStartedPlayback = false;
  private isAppending = false;
  private pendingChunks: Uint8Array[] = [];
  private readonly MIN_BUFFER_SIZE = 512 * 1024; // 512KB de buffer mínimo antes de empezar a reproducir

  constructor(callbacks: AudioStreamCallbacks = {}) {
    this.callbacks = callbacks;
    this.audioElement = new Audio();
    this.audioElement.preload = 'none';
  }

  async playStream(response: Response): Promise<void> {
    this.stop();
    
    if (!response.body) {
      throw new Error('No response body available for streaming');
    }

    console.log('AudioStreamPlayer: Starting audio streaming with MediaSource...');
    
    this.callbacks.onStart?.();
    this.hasNotifiedStart = true;
    this.isPlaying = true;
    
    try {
      // Create a new MediaSource
      this.mediaSource = new MediaSource();
      const mediaSource = this.mediaSource;
      
      // Create object URL for the MediaSource
      const url = URL.createObjectURL(mediaSource);
      this.audioElement.src = url;
      
      // Set up the sourceopen event
      await new Promise<void>((resolve, reject) => {
        mediaSource.addEventListener('sourceopen', () => {
          try {
            // Create SourceBuffer for MP3
            this.sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
            this.sourceBuffer.mode = 'sequence';
            
            // Set up error handling for the SourceBuffer
            this.sourceBuffer.addEventListener('error', (e) => {
              console.error('SourceBuffer error:', e);
              this.callbacks.onError?.(new Error('Error en el buffer de audio'));
              this.cleanup();
            });
            
            // Start playing when enough data is buffered
            this.audioElement.play().catch(error => {
              console.error('Error al iniciar la reproducción:', error);
              this.callbacks.onError?.(error);
            });
            
            // Start streaming the response
            this.streamResponse(response);
            
            resolve();
          } catch (error) {
            reject(error);
          }
        }, { once: true });
        
        // Handle MediaSource errors
        mediaSource.addEventListener('sourceended', () => {
          console.log('MediaSource ended');
        });
        
        mediaSource.addEventListener('sourceclose', () => {
          console.log('MediaSource closed');
        });
      });
      
    } catch (error) {
      console.error('Error initializing MediaSource:', error);
      this.cleanup();
      this.callbacks.onError?.(error as Error);
    }
  }

  private async processPendingChunks(): Promise<void> {
    if (this.isAppending || !this.sourceBuffer || this.pendingChunks.length === 0) {
      return;
    }

    this.isAppending = true;
    const chunk = this.pendingChunks.shift();
    
    if (!chunk) {
      this.isAppending = false;
      return;
    }

    try {
      this.sourceBuffer.appendBuffer(chunk);
      
      // Esperar a que termine de procesar este chunk antes de continuar
      await new Promise<void>((resolve) => {
        const onUpdateEnd = () => {
          this.sourceBuffer?.removeEventListener('updateend', onUpdateEnd);
          this.isAppending = false;
          // Procesar el siguiente chunk pendiente
          this.processPendingChunks();
          resolve();
        };
        
        this.sourceBuffer.addEventListener('updateend', onUpdateEnd, { once: true });
      });
    } catch (error) {
      console.error('Error appending chunk to SourceBuffer:', error);
      this.isAppending = false;
      this.callbacks.onError?.(error as Error);
    }
  }

  private async streamResponse(response: Response): Promise<void> {
    const reader = response.body!.getReader();
    let bufferSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log(`Stream complete. Total bytes: ${this.totalBytes}`);
        this.streamComplete = true;
        
        // Si aún no hemos empezado a reproducir, comenzar con el audio completo
        if (!this.hasStartedPlayback && this.audioChunks.length > 0) {
          await this.startPlayback();
        }
        
        // Procesar cualquier chunk pendiente
        await this.processPendingChunks();
        break;
      }
      
      if (value) {
        this.audioChunks.push(value);
        this.totalBytes += value.length;
        bufferSize += value.length;
        
        this.callbacks.onProgress?.(this.totalBytes);
        console.log(`Received chunk: ${value.length} bytes, total: ${this.totalBytes} bytes`);
        
        // Agregar el chunk a la cola de procesamiento
        this.pendingChunks.push(value);
        
        // Procesar el siguiente chunk si no hay ninguno en proceso
        if (!this.isAppending) {
          this.processPendingChunks();
        }
        
        // Si ya hemos acumulado suficiente buffer o es el final del stream, comenzar a reproducir
        if ((bufferSize >= this.MIN_BUFFER_SIZE || this.streamComplete) && !this.hasStartedPlayback) {
          await this.startPlayback();
        }
      }
    }
  }

  private async startPlayback(): Promise<void> {
    if (this.hasStartedPlayback || !this.sourceBuffer || this.audioChunks.length === 0) return;
    
    this.hasStartedPlayback = true;
    console.log('Starting playback with buffered data...');

    try {
      // Iniciar la reproducción
      await this.audioElement.play();
      console.log('Playback started successfully');
      
      // Si hay más datos por cargar, esperar a que el buffer esté listo
      if (this.sourceBuffer.updating) {
        await new Promise<void>((resolve) => {
          const onUpdateEnd = () => {
            this.sourceBuffer?.removeEventListener('updateend', onUpdateEnd);
            resolve();
          };
          this.sourceBuffer.addEventListener('updateend', onUpdateEnd, { once: true });
        });
      }
      
    } catch (error) {
      console.error('Error starting initial playback:', error);
      this.callbacks.onError?.(error);
    }
  }

  stop(): void {
    console.log('Stopping audio playback');
    this.cleanup();
  }

  private cleanup(): void {
    this.isPlaying = false;
    this.hasNotifiedStart = false;
    this.totalBytes = 0;
    this.audioChunks = [];
    
    // Limpiar el SourceBuffer
    if (this.sourceBuffer) {
      try {
        if (this.sourceBuffer.updating) {
          this.sourceBuffer.abort();
        }
      } catch (error) {
        console.warn('Error aborting SourceBuffer:', error);
      }
      this.sourceBuffer = null;
    }
    
    // Cerrar el MediaSource
    if (this.mediaSource) {
      try {
        if (this.mediaSource.readyState === 'open') {
          this.mediaSource.endOfStream();
        }
        URL.revokeObjectURL(this.audioElement.src);
      } catch (error) {
        console.warn('Error closing MediaSource:', error);
      }
      this.mediaSource = null;
    }
    
    // Detener y limpiar el elemento de audio
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement.load();
    }
  }

  // Método para obtener el elemento de audio para su uso en la UI
  getAudioElement(): HTMLAudioElement | null {
    return this.audioElement || null;
  }
}