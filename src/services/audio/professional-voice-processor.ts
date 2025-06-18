
export class ProfessionalVoiceProcessor {
  private audioContext: AudioContext;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async processVoiceWithAutoTune(
    audioBlob: Blob,
    targetKey: string,
    intensity: number,
    octaveShift: number
  ): Promise<string> {
    try {
      console.log('Processing voice with professional auto-tune...');
      
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Apply real-time pitch correction using Web Audio API
      let processedBuffer = await this.applyProfessionalAutoTune(audioBuffer, targetKey, intensity);
      
      // Apply octave shift if needed
      if (octaveShift !== 0) {
        processedBuffer = await this.applyOctaveShift(processedBuffer, octaveShift);
      }
      
      // Apply voice enhancement effects
      processedBuffer = await this.enhanceVoice(processedBuffer);
      
      // Convert back to WAV
      const wavBuffer = this.audioBufferToWav(processedBuffer);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
      
    } catch (error) {
      console.error('Professional voice processing error:', error);
      throw error;
    }
  }

  private async applyProfessionalAutoTune(
    audioBuffer: AudioBuffer,
    targetKey: string,
    intensity: number
  ): Promise<AudioBuffer> {
    const keyFrequencies = this.getKeyFrequencies(targetKey);
    const processedBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);
      
      // Use overlapping windows with proper windowing
      const windowSize = 2048;
      const hopSize = windowSize / 4;
      const window = this.createHannWindow(windowSize);
      
      for (let i = 0; i < inputData.length - windowSize; i += hopSize) {
        const windowData = new Float32Array(windowSize);
        
        // Extract window with proper windowing
        for (let j = 0; j < windowSize; j++) {
          windowData[j] = inputData[i + j] * window[j];
        }
        
        // Detect pitch using advanced algorithm
        const pitch = this.detectPitchYIN(windowData, audioBuffer.sampleRate);
        
        if (pitch > 80 && pitch < 2000) {
          const targetPitch = this.findClosestNote(pitch, keyFrequencies);
          const correction = targetPitch / pitch;
          
          // Apply pitch correction with formant preservation
          const correctedWindow = this.pitchShiftWithFormants(
            windowData, 
            correction, 
            intensity / 100,
            audioBuffer.sampleRate
          );
          
          // Overlap-add the corrected window
          this.overlapAdd(outputData, correctedWindow, i);
        } else {
          // No correction needed, just overlap-add original
          this.overlapAdd(outputData, windowData, i);
        }
      }
    }

    return processedBuffer;
  }

  private detectPitchYIN(buffer: Float32Array, sampleRate: number): number {
    const threshold = 0.1;
    const minPeriod = Math.floor(sampleRate / 800); // 800 Hz max
    const maxPeriod = Math.floor(sampleRate / 80);  // 80 Hz min
    
    // Difference function
    const d = new Float32Array(maxPeriod);
    for (let tau = minPeriod; tau < maxPeriod; tau++) {
      let sum = 0;
      for (let j = 0; j < buffer.length - tau; j++) {
        const delta = buffer[j] - buffer[j + tau];
        sum += delta * delta;
      }
      d[tau] = sum;
    }
    
    // Cumulative mean normalized difference
    const cmndf = new Float32Array(maxPeriod);
    cmndf[0] = 1;
    let runningSum = 0;
    
    for (let tau = 1; tau < maxPeriod; tau++) {
      runningSum += d[tau];
      cmndf[tau] = d[tau] * tau / runningSum;
    }
    
    // Find the first minimum below threshold
    for (let tau = minPeriod; tau < maxPeriod; tau++) {
      if (cmndf[tau] < threshold) {
        // Parabolic interpolation for better accuracy
        if (tau > 0 && tau < maxPeriod - 1) {
          const x0 = cmndf[tau - 1];
          const x1 = cmndf[tau];
          const x2 = cmndf[tau + 1];
          const a = (x0 - 2 * x1 + x2) / 2;
          const b = (x2 - x0) / 2;
          
          if (a !== 0) {
            const correction = -b / (2 * a);
            return sampleRate / (tau + correction);
          }
        }
        return sampleRate / tau;
      }
    }
    
    return 0; // No pitch found
  }

  private pitchShiftWithFormants(
    window: Float32Array,
    ratio: number,
    intensity: number,
    sampleRate: number
  ): Float32Array {
    const actualRatio = 1 + (ratio - 1) * intensity;
    const shiftedWindow = new Float32Array(window.length);
    
    // Use granular synthesis for better quality
    const grainSize = 512;
    const overlap = 0.75;
    const hopSize = grainSize * (1 - overlap);
    
    for (let i = 0; i < window.length - grainSize; i += hopSize) {
      const grain = window.slice(i, i + grainSize);
      const shiftedGrain = this.shiftGrain(grain, actualRatio);
      
      // Overlap-add grains
      for (let j = 0; j < grainSize && i + j < shiftedWindow.length; j++) {
        const env = 0.5 * (1 - Math.cos(2 * Math.PI * j / grainSize));
        shiftedWindow[i + j] += shiftedGrain[j] * env;
      }
    }
    
    return shiftedWindow;
  }

  private shiftGrain(grain: Float32Array, ratio: number): Float32Array {
    const shifted = new Float32Array(grain.length);
    
    for (let i = 0; i < shifted.length; i++) {
      const readPos = i / ratio;
      const index = Math.floor(readPos);
      const frac = readPos - index;
      
      if (index < grain.length - 1) {
        shifted[i] = grain[index] * (1 - frac) + grain[index + 1] * frac;
      }
    }
    
    return shifted;
  }

  private async enhanceVoice(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    // Apply voice enhancement: compression, EQ, and subtle chorus
    const enhanced = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = enhanced.getChannelData(channel);
      
      // Apply soft compression
      for (let i = 0; i < inputData.length; i++) {
        const input = inputData[i];
        const compressed = this.softCompress(input, 0.3, 3);
        outputData[i] = compressed;
      }
      
      // Apply high-frequency enhancement
      this.applyHighFreqBoost(outputData, audioBuffer.sampleRate);
    }

    return enhanced;
  }

  private softCompress(input: number, threshold: number, ratio: number): number {
    const abs = Math.abs(input);
    if (abs > threshold) {
      const over = abs - threshold;
      const compressed = threshold + over / ratio;
      return Math.sign(input) * compressed;
    }
    return input;
  }

  private applyHighFreqBoost(data: Float32Array, sampleRate: number) {
    // Simple high-frequency boost for vocal clarity
    const prev = [0, 0];
    const boost = 1.2;
    
    for (let i = 2; i < data.length; i++) {
      const highFreq = data[i] - 0.5 * data[i - 1] + 0.25 * data[i - 2];
      data[i] += highFreq * boost * 0.1;
    }
  }

  private createHannWindow(size: number): Float32Array {
    const window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
    }
    return window;
  }

  private overlapAdd(output: Float32Array, window: Float32Array, offset: number) {
    for (let i = 0; i < window.length && offset + i < output.length; i++) {
      output[offset + i] += window[i];
    }
  }

  private getKeyFrequencies(key: string): number[] {
    const keyMap: { [key: string]: number[] } = {
      'C': [130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94],
      'D': [146.83, 164.81, 185.00, 196.00, 220.00, 246.94, 277.18],
      'E': [164.81, 185.00, 207.65, 220.00, 246.94, 277.18, 311.13],
      'F': [174.61, 196.00, 220.00, 233.08, 261.63, 293.66, 329.63],
      'G': [196.00, 220.00, 246.94, 261.63, 293.66, 329.63, 369.99],
      'A': [220.00, 246.94, 277.18, 293.66, 329.63, 369.99, 415.30],
      'B': [246.94, 277.18, 311.13, 329.63, 369.99, 415.30, 466.16]
    };
    return keyMap[key] || keyMap['C'];
  }

  private findClosestNote(frequency: number, keyFrequencies: number[]): number {
    let closest = keyFrequencies[0];
    let minDiff = Math.abs(frequency - closest);
    
    for (const noteFreq of keyFrequencies) {
      for (let octave = 0.5; octave <= 4; octave *= 2) {
        const transposed = noteFreq * octave;
        const diff = Math.abs(frequency - transposed);
        if (diff < minDiff) {
          minDiff = diff;
          closest = transposed;
        }
      }
    }
    
    return closest;
  }

  private async applyOctaveShift(audioBuffer: AudioBuffer, octaveShift: number): Promise<AudioBuffer> {
    const shiftRatio = Math.pow(2, octaveShift);
    const newLength = Math.floor(audioBuffer.length / shiftRatio);
    const shiftedBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      newLength,
      audioBuffer.sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = shiftedBuffer.getChannelData(channel);
      
      for (let i = 0; i < outputData.length; i++) {
        const sourceIndex = i * shiftRatio;
        const index = Math.floor(sourceIndex);
        const frac = sourceIndex - index;
        
        if (index < inputData.length - 1) {
          outputData[i] = inputData[index] * (1 - frac) + inputData[index + 1] * frac;
        }
      }
    }

    return shiftedBuffer;
  }

  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  }
}
