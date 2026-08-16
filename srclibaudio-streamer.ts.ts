/**
 * Handles capturing microphone audio and converting it to PCM16 at 16kHz.
 */
export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: AudioWorkletNode | ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;

  constructor(private onAudioData: (base64Data: string) => void) {}

  async start() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 16000 });
    }
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    if (!this.audioContext) return; // Potential race condition if stop() was called during await
    
    this.source = this.audioContext.createMediaStreamSource(this.stream);

    // Using 2048 buffer size for ultra-low latency audio streaming (~128ms per chunk at 16kHz)
    this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = this.floatToPcm16(inputData);
      const base64 = this.arrayBufferToBase64(pcm16.buffer);
      this.onAudioData(base64);
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  stop() {
    try {
      this.source?.disconnect();
      this.processor?.disconnect();
      this.stream?.getTracks().forEach(track => track.stop());
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(console.error);
      }
    } catch (e) {
      console.error("Error stopping audio streamer:", e);
    }
    this.audioContext = null;
    this.source = null;
    this.processor = null;
    this.stream = null;
  }

  private floatToPcm16(floatData: Float32Array): Int16Array {
    const pcm16 = new Int16Array(floatData.length);
    for (let i = 0; i < floatData.length; i++) {
      const s = Math.max(-1, Math.min(1, floatData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return pcm16;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}