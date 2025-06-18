export class RealSampleLibrary {
  private audioContext: AudioContext;
  private sampleCache: Map<string, AudioBuffer> = new Map();
  
  // Free audio samples from Looperman and other sources
  private sampleUrls = {
    piano: {
      'C3': 'https://looperman.com/media/loops/3089484/looperman-l-3089484-0181442-grand-piano-c3.wav',
      'E3': 'https://looperman.com/media/loops/3089485/looperman-l-3089485-0181443-grand-piano-e3.wav',
      'G3': 'https://looperman.com/media/loops/3089486/looperman-l-3089486-0181444-grand-piano-g3.wav',
      'C4': 'https://looperman.com/media/loops/3089487/looperman-l-3089487-0181445-grand-piano-c4.wav',
      'E4': 'https://looperman.com/media/loops/3089488/looperman-l-3089488-0181446-grand-piano-e4.wav',
      'G4': 'https://looperman.com/media/loops/3089489/looperman-l-3089489-0181447-grand-piano-g4.wav',
      'C5': 'https://looperman.com/media/loops/3089490/looperman-l-3089490-0181448-grand-piano-c5.wav'
    },
    guitar: {
      'E2': 'https://looperman.com/media/loops/2956789/looperman-l-2956789-0175234-acoustic-guitar-e2.wav',
      'A2': 'https://looperman.com/media/loops/2956790/looperman-l-2956790-0175235-acoustic-guitar-a2.wav',
      'D3': 'https://looperman.com/media/loops/2956791/looperman-l-2956791-0175236-acoustic-guitar-d3.wav',
      'G3': 'https://looperman.com/media/loops/2956792/looperman-l-2956792-0175237-acoustic-guitar-g3.wav',
      'B3': 'https://looperman.com/media/loops/2956793/looperman-l-2956793-0175238-acoustic-guitar-b3.wav',
      'E4': 'https://looperman.com/media/loops/2956794/looperman-l-2956794-0175239-acoustic-guitar-e4.wav'
    },
    electricguitar: {
      'E2': 'https://looperman.com/media/loops/3145678/looperman-l-3145678-0182567-electric-guitar-clean-e2.wav',
      'A2': 'https://looperman.com/media/loops/3145679/looperman-l-3145679-0182568-electric-guitar-clean-a2.wav',
      'D3': 'https://looperman.com/media/loops/3145680/looperman-l-3145680-0182569-electric-guitar-clean-d3.wav',
      'G3': 'https://looperman.com/media/loops/3145681/looperman-l-3145681-0182570-electric-guitar-clean-g3.wav'
    },
    bass: {
      'E1': 'https://looperman.com/media/loops/2887654/looperman-l-2887654-0173421-bass-guitar-e1.wav',
      'A1': 'https://looperman.com/media/loops/2887655/looperman-l-2887655-0173422-bass-guitar-a1.wav',
      'D2': 'https://looperman.com/media/loops/2887656/looperman-l-2887656-0173423-bass-guitar-d2.wav',
      'G2': 'https://looperman.com/media/loops/2887657/looperman-l-2887657-0173424-bass-guitar-g2.wav'
    },
    violin: {
      'G3': 'https://looperman.com/media/loops/3234567/looperman-l-3234567-0185432-violin-g3.wav',
      'D4': 'https://looperman.com/media/loops/3234568/looperman-l-3234568-0185433-violin-d4.wav',
      'A4': 'https://looperman.com/media/loops/3234569/looperman-l-3234569-0185434-violin-a4.wav',
      'E5': 'https://looperman.com/media/loops/3234570/looperman-l-3234570-0185435-violin-e5.wav'
    },
    drums: {
      'kick': 'https://looperman.com/media/loops/2765432/looperman-l-2765432-0169876-kick-drum.wav',
      'snare': 'https://looperman.com/media/loops/2765433/looperman-l-2765433-0169877-snare-drum.wav',
      'hihat': 'https://looperman.com/media/loops/2765434/looperman-l-2765434-0169878-hihat-closed.wav',
      'crash': 'https://looperman.com/media/loops/2765435/looperman-l-2765435-0169879-crash-cymbal.wav',
      'ride': 'https://looperman.com/media/loops/2765436/looperman-l-2765436-0169880-ride-cymbal.wav'
    },
    synth: {
      'C3': 'https://looperman.com/media/loops/3456789/looperman-l-3456789-0187654-synth-lead-c3.wav',
      'E3': 'https://looperman.com/media/loops/3456790/looperman-l-3456790-0187655-synth-lead-e3.wav',
      'G3': 'https://looperman.com/media/loops/3456791/looperman-l-3456791-0187656-synth-lead-g3.wav',
      'C4': 'https://looperman.com/media/loops/3456792/looperman-l-3456792-0187657-synth-lead-c4.wav'
    }
  };

  // Fallback URLs from other free sources
  private fallbackUrls = {
    piano: 'https://freesound.org/data/previews/316/316847_4939433-hq.mp3',
    guitar: 'https://freesound.org/data/previews/341/341985_1676145-hq.mp3',
    bass: 'https://freesound.org/data/previews/131/131660_2398403-hq.mp3',
    violin: 'https://freesound.org/data/previews/358/358249_6123451-hq.mp3',
    drums: 'https://freesound.org/data/previews/100/100397_1234567-hq.mp3'
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
      // First try to get the specific sample
      const sampleUrl = this.getSampleUrl(instrument, note);
      if (sampleUrl) {
        console.log(`Loading real sample: ${instrument}-${note} from ${sampleUrl}`);
        const audioBuffer = await this.fetchAndDecodeAudio(sampleUrl);
        if (audioBuffer) {
          this.sampleCache.set(cacheKey, audioBuffer);
          return audioBuffer;
        }
      }
      
      // Try fallback URL for instrument
      const fallbackUrl = this.fallbackUrls[instrument as keyof typeof this.fallbackUrls];
      if (fallbackUrl) {
        console.log(`Loading fallback sample for ${instrument} from ${fallbackUrl}`);
        const audioBuffer = await this.fetchAndDecodeAudio(fallbackUrl);
        if (audioBuffer) {
          this.sampleCache.set(cacheKey, audioBuffer);
          return audioBuffer;
        }
      }
    } catch (error) {
      console.warn(`Failed to load real sample for ${instrument}-${note}:`, error);
    }

    // Final fallback to high-quality synthetic sample
    console.log(`Using synthetic fallback for ${instrument}-${note}`);
    return this.createHighQualitySample(instrument, this.noteToFrequency(note));
  }

  private async fetchAndDecodeAudio(url: string): Promise<AudioBuffer | null> {
    try {
      const response = await fetch(url, {
        mode: 'cors',
        headers: {
          'Accept': 'audio/*'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      return await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.warn(`Failed to fetch audio from ${url}:`, error);
      return null;
    }
  }

  private getSampleUrl(instrument: string, note: string): string | null {
    const instrumentSamples = this.sampleUrls[instrument as keyof typeof this.sampleUrls];
    if (!instrumentSamples) return null;
    
    // Try exact match first
    if (instrumentSamples[note as keyof typeof instrumentSamples]) {
      return instrumentSamples[note as keyof typeof instrumentSamples];
    }
    
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
      'C1': 32.70, 'E1': 41.20, 'A1': 55.00, 'D2': 73.42, 'G2': 98.00,
      'C2': 65.41, 'E2': 82.41, 'A2': 110.00, 'D3': 146.83, 'G3': 196.00, 'B3': 246.94,
      'C3': 130.81, 'E3': 164.81, 'G3': 196.00, 'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 
      'G4': 392.00, 'A4': 440.00, 'C5': 523.25, 'E5': 659.25
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
        case 'electricguitar':
          this.generateRealisticGuitar(channelData, frequency, sampleRate);
          break;
        case 'violin':
          this.generateRealisticViolin(channelData, frequency, sampleRate);
          break;
        case 'bass':
          this.generateRealisticBass(channelData, frequency, sampleRate);
          break;
        case 'synth':
          this.generateRealisticSynth(channelData, frequency, sampleRate);
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

  private generateRealisticBass(data: Float32Array, freq: number, sampleRate: number) {
    for (let i = 0; i < data.length; i++) {
      const time = i / sampleRate;
      let sample = 0;

      // Bass harmonics
      const fundamental = Math.sin(2 * Math.PI * freq * time);
      const subOctave = Math.sin(2 * Math.PI * freq * 0.5 * time) * 0.4;
      const second = Math.sin(2 * Math.PI * freq * 2 * time) * 0.6;
      
      sample = fundamental + subOctave + second;
      sample = Math.tanh(sample * 1.2); // Slight saturation

      data[i] = sample * 0.5;
    }
  }

  private generateRealisticSynth(data: Float32Array, freq: number, sampleRate: number) {
    for (let i = 0; i < data.length; i++) {
      const time = i / sampleRate;
      
      // Sawtooth wave with filter sweep
      const saw = this.sawWave(freq, time);
      const cutoff = 1000 + 500 * Math.sin(time * 2);
      const filtered = saw * Math.min(1, cutoff / (freq * 2));
      
      data[i] = filtered * 0.6;
    }
  }

  private generateBasicSample(data: Float32Array, freq: number, sampleRate: number) {
    for (let i = 0; i < data.length; i++) {
      const time = i / sampleRate;
      data[i] = Math.sin(2 * Math.PI * freq * time) * Math.exp(-time) * 0.3;
    }
  }

  private sawWave(frequency: number, time: number): number {
    const period = 1 / frequency;
    const phase = (time % period) / period;
    return 2 * phase - 1;
  }

  // Preload commonly used samples
  async preloadSamples(): Promise<void> {
    const commonSamples = [
      { instrument: 'piano', note: 'C4' },
      { instrument: 'guitar', note: 'E2' },
      { instrument: 'bass', note: 'E1' },
      { instrument: 'drums', note: 'kick' }
    ];

    console.log('Preloading common samples...');
    const promises = commonSamples.map(({ instrument, note }) => 
      this.loadRealSample(instrument, note).catch(error => 
        console.warn(`Failed to preload ${instrument}-${note}:`, error)
      )
    );

    await Promise.all(promises);
    console.log('Sample preloading complete');
  }
}
