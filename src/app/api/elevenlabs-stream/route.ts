// api/elevenlabs-stream/route.ts
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voiceId } = body;
    
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const selectedVoiceId = voiceId || process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';

    if (!apiKey || !text?.trim()) {
      return Response.json({ error: 'Missing API key or text' }, { status: 400 });
    }

    console.log('Starting ElevenLabs streaming for text:', text);

    // Use better format for streaming - try multiple options
    const streamingFormats = [
      { format: 'pcm_44100', contentType: 'audio/wav', supportsStreaming: true },
      { format: 'mp3_44100_128', contentType: 'audio/mpeg', supportsStreaming: false },
      { format: 'ulaw_8000', contentType: 'audio/basic', supportsStreaming: true }
    ];

    let elevenLabsResponse: Response | null = null;
    let selectedFormat = streamingFormats[0]; // Default to PCM/WAV

    // Try streaming-friendly formats first
    for (const format of streamingFormats) {
      try {
        console.log(`Trying format: ${format.format}`);
        
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}/stream`, {
          method: 'POST',
          headers: {
            'Accept': format.contentType,
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_v3', // Faster model for streaming
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.0,
              use_speaker_boost: false
            },
            output_format: format.format,
            optimize_streaming_latency: 4, // Maximum streaming optimization
            stream_chunk_size: 2048, // Slightly larger chunks for better MP3 decoding
            apply_text_normalization: "auto"
          })
        });

        if (response.ok) {
          elevenLabsResponse = response;
          selectedFormat = format;
          console.log(`Successfully using format: ${format.format}`);
          break;
        } else {
          console.warn(`Format ${format.format} failed:`, response.status);
        }
      } catch (error) {
        console.warn(`Error with format ${format.format}:`, error);
        continue;
      }
    }

    if (!elevenLabsResponse || !elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse?.text() || 'Unknown error';
      console.error('All ElevenLabs formats failed:', errorText);
      throw new Error(`ElevenLabs API error: ${elevenLabsResponse?.status || 'All formats failed'}`);
    }

    console.log('ElevenLabs response received, starting stream...');

    // Create a streaming response that optimizes chunk delivery
    const readable = new ReadableStream({
      start(controller) {
        this.processStream(elevenLabsResponse!, controller, selectedFormat);
      },
      
      processStream: async function(response: Response, controller: ReadableStreamDefaultController, format: typeof selectedFormat) {
        try {
          const reader = response.body!.getReader();
          let totalBytes = 0;
          let chunkCount = 0;

          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log(`Stream complete. Total: ${totalBytes} bytes, ${chunkCount} chunks`);
              controller.close();
              break;
            }
            
            if (value) {
              totalBytes += value.length;
              chunkCount++;
              
              // For streaming formats, send immediately
              // For non-streaming formats, batch smaller chunks
              if (format.supportsStreaming || value.length >= 1024) {
                controller.enqueue(value);
                console.log(`Forwarded chunk ${chunkCount}: ${value.length} bytes`);
              } else {
                // Batch small chunks for better streaming with MP3
                controller.enqueue(value);
              }
            }
          }
        } catch (error) {
          console.error('Stream processing error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': selectedFormat.contentType,
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Streaming-Format': selectedFormat.format,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (err: unknown) {
    console.error('ElevenLabs streaming API error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}