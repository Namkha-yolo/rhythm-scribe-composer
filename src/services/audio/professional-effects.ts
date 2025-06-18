
export class ProfessionalEffects {
  private audioContext: AudioContext;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async applyAutoTune(audioBuffer: AudioBuffer, targetKey: string, intensity: number): Promise<AudioBuffer> {
    const keyFrequencies = this.getKeyFrequencies(targetKey);
    const processedBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);
      
      // Process in overlapping windows for smooth auto-tune
      const windowSize = 2048;
      const hopSize = windowSize / 4;
      
      for (let i = 0; i < inputData.length - windowSize; i += hopSize) {
        const window = inputData.slice(i, i + windowSize);
        const pitch = this.detectWindowPitch(window, audioBuffer.sampleRate);
        
        if (pitch > 80 && pitch < 2000) {
          const targetPitch = this.findClosestNote(pitch, keyFrequencies);
          const correction = targetPitch / pitch;
          
          if (Math.abs(correction - 1) > 0.01) {
            const correctedWindow = this.pitchShift(window, correction, intensity / 100);
            this.overlapAdd(outputData, correctedWindow, i, windowSize);
          } else {
            this.overlapAdd(outputData, window, i, windowSize);
          }
        } else {
          this.overlapAdd(outputData, window, i, windowSize);
        }
      }
    }

    return processedBuffer;
  }

  private detectWindowPitch(window: Float32Array, sampleRate: number): number {
    // Autocorrelation pitch detection
    const correlations = new Array(window.length).fill(0);
    
    for (let lag = 1; lag < window.length; lag++) {
      let correlation = 0;
      for (let i = 0; i < window.length - lag; i++) {
        correlation += window[i] * window[i + lag];
      }
      correlations[lag] = correlation;
    }
    
    let maxCorrelation = 0;
    let bestLag = 0;
    
    const minLag = Math.floor(sampleRate / 2000);
    const maxLag = Math.floor(sampleRate / 80);
    
    for (let lag = minLag; lag < maxLag && lag < correlations.length; lag++) {
      if (correlations[lag] > maxCorrelation) {
        maxCorrelation = correlations[lag];
        bestLag = lag;
      }
    }
    
    return bestLag > 0 ? sampleRate / bestLag : 0;
  }

  private pitchShift(window: Float32Array, ratio: number, intensity: number): Float32Array {
    const shiftedWindow = new Float32Array(window.length);
    const actualRatio = 1 + (ratio - 1) * intensity;
    
    for (let i = 0; i < shiftedWindow.length; i++) {
      const readPos = i / actualRatio;
      const index = Math.floor(readPos);
      const frac = readPos - index;
      
      if (index < window.length - 1) {
        shiftedWindow[i] = window[index] * (1 - frac) + window[index + 1] * frac;
      }
    }
    
    return shiftedWindow;
  }

  private overlapAdd(output: Float32Array, window: Float32Array, offset: number, windowSize: number) {
    // Apply Hann window for smooth overlap
    for (let i = 0; i < window.length && offset + i < output.length; i++) {
      const hannValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / (window.length - 1)));
      output[offset + i] += window[i] * hannValue;
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
      // Check all octaves
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

  async applyReverb(audioBuffer: AudioBuffer, roomSize: number, decay: number, wetness: number): Promise<AudioBuffer> {
    // Create a simple reverb using multiple delay lines
    const processedBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length + Math.floor(audioBuffer.sampleRate * decay),
      audioBuffer.sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);
      
      // Copy original signal
      for (let i = 0; i < inputData.length; i++) {
        outputData[i] = inputData[i] * (1 - wetness / 100);
      }
      
      // Add reverb tails
      const delayTimes = [0.03, 0.05, 0.07, 0.11, 0.13, 0.17]; // Prime number delays
      
      for (const delayTime of delayTimes) {
        const delaySamples = Math.floor(delayTime * audioBuffer.sampleRate * roomSize / 100);
        const feedback = Math.pow(0.5, delayTime / (decay / 1000));
        
        for (let i = 0; i < inputData.length; i++) {
          const delayIndex = i + delaySamples;
          if (delayIndex < outputData.length) {
            outputData[delayIndex] += inputData[i] * feedback * (wetness / 100);
          }
        }
      }
    }

    return processedBuffer;
  }

  audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
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
