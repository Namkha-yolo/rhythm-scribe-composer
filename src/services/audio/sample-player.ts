
export class SamplePlayer {
  private audioContext: AudioContext;
  private sampleCache: Map<string, AudioBuffer> = new Map();

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async loadSample(url: string): Promise<AudioBuffer> {
    if (this.sampleCache.has(url)) {
      return this.sampleCache.get(url)!;
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.sampleCache.set(url, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.error('Failed to load sample:', error);
      // Return a basic sine wave as fallback
      return this.createBasicSample(440, 1);
    }
  }

  private createBasicSample(frequency: number, duration: number): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
    }

    return buffer;
  }

  async playNote(frequency: number, duration: number, instrumentType: string, startTime: number = 0): Promise<void> {
    const buffer = await this.getInstrumentSample(instrumentType, frequency);
    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Apply pitch shifting
    const originalFreq = this.getBaseFrequency(instrumentType);
    source.playbackRate.value = frequency / originalFreq;

    // Apply envelope
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime + startTime);
    gainNode.gain.linearRampToValueAtTime(0.7, this.audioContext.currentTime + startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + startTime + duration);

    source.start(this.audioContext.currentTime + startTime);
    source.stop(this.audioContext.currentTime + startTime + duration);
  }

  private async getInstrumentSample(instrumentType: string, frequency: number): Promise<AudioBuffer> {
    // For now, create realistic samples programmatically
    // In production, you'd load actual instrument samples
    switch (instrumentType) {
      case 'piano':
        return this.createPianoSample(frequency);
      case 'guitar':
        return this.createGuitarSample(frequency);
      case 'violin':
        return this.createViolinSample(frequency);
      case 'bass':
        return this.createBassSample(frequency);
      default:
        return this.createBasicSample(frequency, 1);
    }
  }

  private createPianoSample(frequency: number): AudioBuffer {
    const duration = 3;
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        const time = i / sampleRate;
        let sample = 0;

        // Multiple harmonics for realistic piano
        const harmonics = [1, 0.8, 0.6, 0.4, 0.3, 0.2];
        for (let h = 0; h < harmonics.length; h++) {
          const harmonic = h + 1;
          const amp = harmonics[h] * Math.exp(-time * (harmonic * 0.5));
          sample += amp * Math.sin(2 * Math.PI * frequency * harmonic * time);
        }

        // Add slight stereo width
        const stereoOffset = channel === 0 ? 1 : 0.98;
        channelData[i] = sample * stereoOffset * 0.3;
      }
    }

    return buffer;
  }

  private createGuitarSample(frequency: number): AudioBuffer {
    const duration = 2;
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        const time = i / sampleRate;
        let sample = 0;

        // Guitar-like harmonics
        const harmonics = [1, 0.7, 0.5, 0.3, 0.2];
        for (let h = 0; h < harmonics.length; h++) {
          const harmonic = h + 1;
          const amp = harmonics[h] * Math.exp(-time * 2);
          sample += amp * Math.sin(2 * Math.PI * frequency * harmonic * time);
        }

        // Add pluck attack
        const attack = time < 0.01 ? Math.random() * 0.1 : 0;
        channelData[i] = (sample + attack) * 0.4;
      }
    }

    return buffer;
  }

  private createViolinSample(frequency: number): AudioBuffer {
    const duration = 2;
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        const time = i / sampleRate;
        const vibrato = 1 + 0.02 * Math.sin(2 * Math.PI * 6 * time);
        let sample = 0;

        // Violin harmonics with vibrato
        const harmonics = [1, 0.3, 0.8, 0.2, 0.6];
        for (let h = 0; h < harmonics.length; h++) {
          const harmonic = h + 1;
          const amp = harmonics[h];
          sample += amp * Math.sin(2 * Math.PI * frequency * harmonic * time * vibrato);
        }

        channelData[i] = sample * 0.4;
      }
    }

    return buffer;
  }

  private createBassSample(frequency: number): AudioBuffer {
    const duration = 2;
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        const time = i / sampleRate;
        let sample = 0;

        // Bass-heavy harmonics
        const fundamental = Math.sin(2 * Math.PI * frequency * time);
        const subOctave = Math.sin(2 * Math.PI * frequency * 0.5 * time) * 0.4;
        const second = Math.sin(2 * Math.PI * frequency * 2 * time) * 0.6;
        
        sample = fundamental + subOctave + second;
        sample = Math.tanh(sample * 1.2); // Slight saturation

        channelData[i] = sample * 0.5;
      }
    }

    return buffer;
  }

  private getBaseFrequency(instrumentType: string): number {
    const baseFreqs: { [key: string]: number } = {
      piano: 261.63, // C4
      guitar: 329.63, // E4
      violin: 440, // A4
      bass: 130.81, // C3
    };
    return baseFreqs[instrumentType] || 440;
  }
}
