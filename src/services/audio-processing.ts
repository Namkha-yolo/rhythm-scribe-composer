
export class VoiceProcessor {
  private audioContext: AudioContext;
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async processVoiceWithAutoTune(
    audioBlob: Blob, 
    targetKey: string, 
    autoTuneIntensity: number, 
    octaveShift: number
  ): Promise<string> {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Extract pitch information from the original recording
      const pitchData = await this.extractPitchData(audioBuffer);
      
      // Apply auto-tune corrections
      const correctedAudio = await this.applyAutoTune(
        audioBuffer, 
        pitchData, 
        targetKey, 
        autoTuneIntensity, 
        octaveShift
      );
      
      // Convert back to WAV
      const wavBuffer = this.audioBufferToWav(correctedAudio);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
      
    } catch (error) {
      console.error('Voice processing error:', error);
      throw error;
    }
  }

  private async extractPitchData(audioBuffer: AudioBuffer) {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const windowSize = 2048;
    const hopSize = windowSize / 4;
    
    const pitchData = [];
    
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      const window = channelData.slice(i, i + windowSize);
      const pitch = this.detectPitch(window, sampleRate);
      
      if (pitch > 80 && pitch < 800) { // Human vocal range
        pitchData.push({
          time: i / sampleRate,
          frequency: pitch,
          amplitude: this.getRMS(window)
        });
      }
    }
    
    return pitchData;
  }

  private detectPitch(buffer: Float32Array, sampleRate: number): number {
    // Auto-correlation pitch detection
    const correlations = new Array(buffer.length).fill(0);
    
    for (let lag = 1; lag < buffer.length; lag++) {
      let correlation = 0;
      for (let i = 0; i < buffer.length - lag; i++) {
        correlation += buffer[i] * buffer[i + lag];
      }
      correlations[lag] = correlation;
    }
    
    let maxCorrelation = 0;
    let bestLag = 0;
    
    // Look for fundamental frequency in vocal range
    const minLag = Math.floor(sampleRate / 800); // 800Hz max
    const maxLag = Math.floor(sampleRate / 80);  // 80Hz min
    
    for (let lag = minLag; lag < maxLag; lag++) {
      if (correlations[lag] > maxCorrelation) {
        maxCorrelation = correlations[lag];
        bestLag = lag;
      }
    }
    
    return bestLag > 0 ? sampleRate / bestLag : 0;
  }

  private getRMS(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  private async applyAutoTune(
    audioBuffer: AudioBuffer,
    pitchData: any[],
    targetKey: string,
    intensity: number,
    octaveShift: number
  ): Promise<AudioBuffer> {
    const keyFrequencies = this.getKeyFrequencies(targetKey);
    const processedBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    // Copy original audio
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);
      outputData.set(inputData);
    }
    
    // Apply pitch corrections
    const channelData = processedBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    for (const pitch of pitchData) {
      const startSample = Math.floor(pitch.time * sampleRate);
      const windowSize = Math.floor(0.05 * sampleRate); // 50ms window
      
      // Find closest note in target key
      const targetFreq = this.findClosestNote(pitch.frequency, keyFrequencies);
      const pitchRatio = targetFreq / pitch.frequency;
      
      // Apply octave shift
      const finalRatio = pitchRatio * Math.pow(2, octaveShift);
      
      // Apply pitch shift with intensity control
      const actualRatio = 1 + (finalRatio - 1) * (intensity / 100);
      
      if (Math.abs(actualRatio - 1) > 0.01) { // Only shift if significant
        this.applyPitchShift(channelData, startSample, windowSize, actualRatio);
      }
    }
    
    return processedBuffer;
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
      const diff = Math.abs(frequency - noteFreq);
      if (diff < minDiff) {
        minDiff = diff;
        closest = noteFreq;
      }
    }
    
    return closest;
  }

  private applyPitchShift(
    buffer: Float32Array, 
    startSample: number, 
    windowSize: number, 
    pitchRatio: number
  ) {
    const endSample = Math.min(startSample + windowSize, buffer.length);
    const window = buffer.slice(startSample, endSample);
    
    // Simple time-domain pitch shifting using overlap-add
    const shiftedWindow = new Float32Array(window.length);
    const readStep = 1 / pitchRatio;
    
    for (let i = 0; i < shiftedWindow.length; i++) {
      const readPos = i * readStep;
      const index = Math.floor(readPos);
      const frac = readPos - index;
      
      if (index < window.length - 1) {
        shiftedWindow[i] = window[index] * (1 - frac) + window[index + 1] * frac;
      }
    }
    
    // Apply Hann window to reduce artifacts
    for (let i = 0; i < shiftedWindow.length; i++) {
      const hannValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / (shiftedWindow.length - 1)));
      shiftedWindow[i] *= hannValue;
    }
    
    // Copy back to buffer
    for (let i = 0; i < shiftedWindow.length && startSample + i < buffer.length; i++) {
      buffer[startSample + i] = shiftedWindow[i];
    }
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
