
export class RealSampleLibrary {
  private audioContext: AudioContext;
  private sampleCache: Map<string, AudioBuffer> = new Map();
  
  // Real instrument sample URLs from free libraries
  private sampleUrls = {
    piano: {
      'C4': 'https://freewavesamples.com/files/Alesis-Sanctuary-QCard-Piano-C4.wav',
      'E4': 'https://freewavesamples.com/files/Alesis-Sanctuary-QCard-Piano-E4.wav',
      'G4': 'https://freewavesamples.com/files/Alesis-Sanctuary-QCard-Piano-G4.wav',
      'C5': 'https://freewavesamples.com/files/Alesis-Sanctuary-QCard-Piano-C5.wav'
    },
    guitar: {
      'E2': 'https://freewavesamples.com/files/Ensoniq-ESQ-1-Guitar-C2.wav',
      'A2': 'https://freewavesamples.com/files/Ensoniq-ESQ-1-Guitar-A2.wav',
      'D3': 'https://freewavesamples.com/files/Ensoniq-ESQ-1-Guitar-D3.wav',
      'G3': 'https://freewavesamples.com/files/Ensoniq-ESQ-1-Guitar-G3.wav'
    },
    drums: {
      'kick': 'https://freewavesamples.com/files/Roland-MT-40-Kick-1.wav',
      'snare': 'https://freewavesamples.com/files/Roland-MT-40-Snare.wav',
      'hihat': 'https://freewavesamples.com/files/Roland-MT-40-Closed-Hi-Hat.wav',
      'crash': 'https://freewavesamples.com/files/Roland-MT-40-Crash.wav'
    }
  };

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async loadRealSample(instrument: string, note: string): Promise<AudioBuffer> {
    const cacheKey = `${instrument}-${note}`;
    
    if (this.sampleCache.has(cacheKey)) {
      return this.sampleCache.get(cacheKey)!;
    }

    try {
      const sampleUrl = this.getSampleUrl(instrument, note);
      if (sampleUrl) {
        const response = await fetch(sampleUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.sampleCache.set(cacheKey, audioBuffer);
        return audioBuffer;
      }
    } catch (error) {
      console.warn(`Failed to load real sample for ${instrument}-${note}, using fallback`);
    }

    // Fallback to high-quality synthetic sample
    return this.createHighQualitySample(instrument, this.noteToFrequency(note));
  }

  private getSampleUrl(instrument: string, note: string): string | null {
    const instrumentSamples = this.sampleUrls[instrument as keyof typeof this.sampleUrls];
    if (!instrumentSamples) return null;
    
    // Find closest available sample
    const availableNotes = Object.keys(instrumentSamples);
    const closestNote = this.findClosestNote(note, availableNotes);
    return instrumentSamples[closestNote as keyof typeof instrumentSamples] || null;
  }

  private findClosestNote(targetNote: string, availableNotes: string[]): string {
    const targetFreq = this.noteToFrequency(targetNote);
    let closest = availableNotes[0];
    let minDiff = Math.abs(this.noteToFrequency(closest) - targetFreq);
    
    for (const note of availableNotes) {
      const diff = Math.abs(this.noteToFrequency(note) - targetFreq);
      if (diff < minDiff) {
        minDiff = diff;
        closest = note;
      }
    }
    
    return closest;
  }

  private noteToFrequency(note: string): number {
    const noteMap: { [key: string]: number } = {
      'C2': 65.41, 'E2': 82.41, 'A2': 110.00, 'D3': 146.83, 'G3': 196.00,
      'C4': 261.63, 'E4': 329.63, 'G4': 392.00, 'C5': 523.25
    };
    return noteMap[note] || 440;
  }

  private createHighQualitySample(instrument: string, frequency: number): AudioBuffer {
    const duration = 3;
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      switch (instrument) {
        case 'piano':
          this.generateRealisticPiano(channelData, frequency, sampleRate);
          break;
        case 'guitar':
          this.generateRealisticGuitar(channelData, frequency, sampleRate);
          break;
        case 'violin':
          this.generateRealisticViolin(channelData, frequency, sampleRate);
          break;
        default:
          this.generateBasicSample(channelData, frequency, sampleRate);
      }
    }

    return buffer;
  }

  private generateRealisticPiano(data: Float32Array, freq: number, sampleRate: number) {
    for (let i = 0; i < data.length; i++) {
      const time = i / sampleRate;
      let sample = 0;

      // Complex piano harmonics with proper envelope
      const harmonics = [1, 0.8, 0.6, 0.4, 0.3, 0.2, 0.15, 0.1];
      for (let h = 0; h < harmonics.length; h++) {
        const harmonic = h + 1;
        const amp = harmonics[h] * Math.exp(-time * (harmonic * 0.3));
        sample += amp * Math.sin(2 * Math.PI * freq * harmonic * time);
      }

      // Piano-like envelope
      const envelope = Math.exp(-time * 0.8) * (1 - Math.exp(-time * 50));
      data[i] = sample * envelope * 0.4;
    }
  }

  private generateRealisticGuitar(data: Float32Array, freq: number, sampleRate: number) {
    for (let i = 0; i < data.length; i++) {
      const time = i / sampleRate;
      let sample = 0;

      // Guitar harmonics with string-like behavior
      const harmonics = [1, 0.7, 0.5, 0.3, 0.2, 0.1];
      for (let h = 0; h < harmonics.length; h++) {
        const harmonic = h + 1;
        const amp = harmonics[h] * Math.exp(-time * 1.5);
        sample += amp * Math.sin(2 * Math.PI * freq * harmonic * time);
      }

      // Guitar pluck envelope with slight randomness
      const pluck = time < 0.02 ? Math.random() * 0.3 : 0;
      const envelope = Math.exp(-time * 2);
      data[i] = (sample + pluck) * envelope * 0.5;
    }
  }

  private generateRealisticViolin(data: Float32Array, freq: number, sampleRate: number) {
    for (let i = 0; i < data.length; i++) {
      const time = i / sampleRate;
      const vibrato = 1 + 0.03 * Math.sin(2 * Math.PI * 6 * time);
      let sample = 0;

      // Violin harmonics with vibrato
      const harmonics = [1, 0.4, 0.8, 0.3, 0.6, 0.2];
      for (let h = 0; h < harmonics.length; h++) {
        const harmonic = h + 1;
        const amp = harmonics[h];
        sample += amp * Math.sin(2 * Math.PI * freq * harmonic * time * vibrato);
      }

      data[i] = sample * 0.4;
    }
  }

  private generateBasicSample(data: Float32Array, freq: number, sampleRate: number) {
    for (let i = 0; i < data.length; i++) {
      const time = i / sampleRate;
      data[i] = Math.sin(2 * Math.PI * freq * time) * Math.exp(-time) * 0.3;
    }
  }
}
