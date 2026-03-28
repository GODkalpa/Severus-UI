/**
 * Severus High-Performance Audio Processor
 * 
 * Runs in a dedicated AudioWorklet thread to ensure glitch-free 
 * voice capture regardless of main thread activity.
 */

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._bufferSize = 4096;
    this._buffer = new Int16Array(this._bufferSize);
    this._bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const inputChannel = input[0]; // Mono input

      for (let i = 0; i < inputChannel.length; i++) {
        // 1. Clip and convert Float32 [-1.0, 1.0] to Int16 [-32768, 32767]
        const sample = Math.max(-1, Math.min(1, inputChannel[i]));
        const int16Sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        
        this._buffer[this._bufferIndex++] = int16Sample;

        // 2. If buffer is full, send it to the main thread via message port
        if (this._bufferIndex >= this._bufferSize) {
          // Pass the buffer. Since we're sending it via postMessage, 
          // we use the array buffer's bytes for high efficiency.
          this.port.postMessage(this._buffer.buffer, [this._buffer.buffer]);
          
          // Re-initialize for next chunk
          this._buffer = new Int16Array(this._bufferSize);
          this._bufferIndex = 0;
        }
      }
    }
    
    return true; // Keep the processor alive
  }
}

registerProcessor('audio-processor', AudioProcessor);
