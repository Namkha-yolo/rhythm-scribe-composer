
export class AdvancedPitchDetector {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 4096;
  }

  async detectPitchFromBlob(audioBlob: Blob): Promise<{ frequency: number; confidence: number; notes: string[] }[]> {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    
    return this.analyzePitchSequence(audioBuffer);
  }

  private analyzePitchSequence(audioBuffer: AudioBuffer): { frequency: number; confidence: number; notes: string[] }[] {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const windowSize = 4096;
    const hopSize = windowSize / 4;
    const results: { frequency: number; confidence: number; notes: string[] }[] = [];

    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      const window = channelData.slice(i, i + windowSize);
      const pitchData = this.detectPitchFFT(window, sampleRate);
      
      if (pitchData.frequency > 80 && pitchData.frequency < 2000 && pitchData.confidence > 0.3) {
        results.push({
          frequency: pitchData.frequency,
          confidence: pitchData.confidence,
          notes: [this.frequencyToNote(pitchData.frequency)]
        });
      }
    }

    return this.smoothPitchSequence(results);
  }

  private detectPitchFFT(buffer: Float32Array, sampleRate: number): { frequency: number; confidence: number } {
    // Apply window function
    const windowed = this.applyHannWindow(buffer);
    
    // FFT-based pitch detection
    const fft = this.simpleFFT(windowed);
    const magnitude = fft.map(complex => Math.sqrt(complex.real * complex.real + complex.imag * complex.imag));
    
    // Find fundamental frequency
    let maxMagnitude = 0;
    let maxIndex = 0;
    
    const minIndex = Math.floor(80 * buffer.length / sampleRate); // 80 Hz
    const maxIndex2 = Math.floor(2000 * buffer.length / sampleRate); // 2000 Hz
    
    for (let i = minIndex; i < maxIndex2 && i < magnitude.length; i++) {
      if (magnitude[i] > maxMagnitude) {
        maxMagnitude = magnitude[i];
        maxIndex = i;
      }
    }
    
    const frequency = maxIndex * sampleRate / buffer.length;
    const confidence = Math.min(1, maxMagnitude / 1000);
    
    return { frequency, confidence };
  }

  private applyHannWindow(buffer: Float32Array): Float32Array {
    const windowed = new Float32Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (buffer.length - 1)));
      windowed[i] = buffer[i] * window;
    }
    return windowed;
  }

  private simpleFFT(buffer: Float32Array): { real: number; imag: number }[] {
    const N = buffer.length;
    const result: { real: number; imag: number }[] = [];
    
    for (let k = 0; k < N / 2; k++) {
      let real = 0;
      let imag = 0;
      
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += buffer[n] * Math.cos(angle);
        imag += buffer[n] * Math.sin(angle);
      }
      
      result.push({ real, imag });
    }
    
    return result;
  }

  private smoothPitchSequence(pitches: { frequency: number; confidence: number; notes: string[] }[]): { frequency: number; confidence: number; notes: string[] }[] {
    if (pitches.length < 3) return pitches;
    
    const smoothed = [...pitches];
    
    // Simple median filter
    for (let i = 1; i < smoothed.length - 1; i++) {
      const prev = smoothed[i - 1].frequency;
      const curr = smoothed[i].frequency;
      const next = smoothed[i + 1].frequency;
      
      const median = [prev, curr, next].sort((a, b) => a - b)[1];
      smoothed[i].frequency = median;
      smoothed[i].notes = [this.frequencyToNote(median)];
    }
    
    return smoothed;
  }

  private frequencyToNote(frequency: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const a4 = 440;
    const c0 = a4 * Math.pow(2, -4.75);
    
    if (frequency > 0) {
      const h = 12 * Math.log2(frequency / c0);
      const octave = Math.floor(h / 12);
      const n = Math.round(h % 12);
      return noteNames[n] + octave;
    }
    return 'C4';
  }
}
