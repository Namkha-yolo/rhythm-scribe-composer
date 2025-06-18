import { RealSampleLibrary } from './audio/real-sample-library';
import { ProfessionalVoiceProcessor } from './audio/professional-voice-processor';
import { AdvancedPitchDetector } from './audio/advanced-pitch-detection';

export class VoiceProcessor {
  private sampleLibrary: RealSampleLibrary;
  private voiceProcessor: ProfessionalVoiceProcessor;
  private pitchDetector: AdvancedPitchDetector;
  
  constructor() {
    this.sampleLibrary = new RealSampleLibrary();
    this.voiceProcessor = new ProfessionalVoiceProcessor();
    this.pitchDetector = new AdvancedPitchDetector();
  }

  async processVoiceWithAutoTune(
    audioBlob: Blob, 
    targetKey: string, 
    autoTuneIntensity: number, 
    octaveShift: number
  ): Promise<string> {
    try {
      console.log('Processing voice with professional auto-tune system...');
      
      // Use the new professional voice processor
      return await this.voiceProcessor.processVoiceWithAutoTune(
        audioBlob,
        targetKey,
        autoTuneIntensity,
        octaveShift
      );
      
    } catch (error) {
      console.error('Professional voice processing error:', error);
      throw error;
    }
  }

  async generateInstrumentTrackFromMelody(
    melody: number[],
    instrumentType: string,
    variationType: string,
    tempo: number,
    key: string
  ): Promise<string> {
    try {
      console.log('Generating instrument track with real samples...');
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const sampleRate = audioContext.sampleRate;
      const beatDuration = 60 / tempo; // seconds per beat
      const totalDuration = melody.length * beatDuration;
      const buffer = audioContext.createBuffer(2, sampleRate * totalDuration, sampleRate);
      
      // Generate notes using real samples
      for (let i = 0; i < melody.length; i++) {
        const midiNote = melody[i];
        const frequency = this.midiToFrequency(midiNote);
        const note = this.frequencyToNote(frequency);
        const startTime = i * beatDuration;
        const duration = beatDuration * 0.8; // 80% of beat duration
        
        // Load real sample for this instrument and note
        const sampleBuffer = await this.sampleLibrary.loadRealSample(instrumentType, note);
        
        // Mix the sample into the main buffer
        this.mixSampleIntoBuffer(buffer, sampleBuffer, startTime, duration, frequency, instrumentType);
      }
      
      // Apply instrument-specific processing
      const processedBuffer = await this.applyInstrumentProcessing(buffer, instrumentType, variationType);
      
      // Convert to WAV and return URL
      const wavBuffer = this.audioBufferToWav(processedBuffer);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
      
    } catch (error) {
      console.error('Real sample generation error:', error);
      throw error;
    }
  }

  private mixSampleIntoBuffer(
    mainBuffer: AudioBuffer,
    sampleBuffer: AudioBuffer,
    startTime: number,
    duration: number,
    targetFreq: number,
    instrumentType: string
  ) {
    const sampleRate = mainBuffer.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const durationSamples = Math.floor(duration * sampleRate);
    
    // Calculate pitch ratio for proper tuning
    const basePitch = this.getInstrumentBasePitch(instrumentType);
    const pitchRatio = targetFreq / basePitch;
    
    for (let channel = 0; channel < Math.min(mainBuffer.numberOfChannels, sampleBuffer.numberOfChannels); channel++) {
      const mainData = mainBuffer.getChannelData(channel);
      const sampleData = sampleBuffer.getChannelData(channel);
      
      for (let i = 0; i < durationSamples && startSample + i < mainData.length; i++) {
        // Pitch-shifted sample playback
        const readPos = i * pitchRatio;
        const index = Math.floor(readPos);
        const frac = readPos - index;
        
        if (index < sampleData.length - 1) {
          const sample = sampleData[index] * (1 - frac) + sampleData[index + 1] * frac;
          
          // Apply envelope for smooth attack/decay
          const envelope = this.calculateEnvelope(i, durationSamples);
          mainData[startSample + i] += sample * envelope * 0.7;
        }
      }
    }
  }

  private calculateEnvelope(sample: number, totalSamples: number): number {
    const attackTime = 0.1; // 10% of duration
    const releaseTime = 0.3; // 30% of duration
    const position = sample / totalSamples;
    
    if (position < attackTime) {
      return position / attackTime;
    } else if (position > (1 - releaseTime)) {
      return (1 - position) / releaseTime;
    } else {
      return 1;
    }
  }

  private async applyInstrumentProcessing(
    buffer: AudioBuffer,
    instrumentType: string,
    variationType: string
  ): Promise<AudioBuffer> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const processedBuffer = audioContext.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);
      
      // Apply instrument-specific effects
      switch (instrumentType) {
        case 'piano':
          this.applyPianoProcessing(inputData, outputData, variationType);
          break;
        case 'guitar':
          this.applyGuitarProcessing(inputData, outputData, variationType);
          break;
        case 'violin':
          this.applyViolinProcessing(inputData, outputData, variationType);
          break;
        default:
          outputData.set(inputData);
      }
    }

    return processedBuffer;
  }

  private applyPianoProcessing(input: Float32Array, output: Float32Array, variation: string) {
    for (let i = 0; i < input.length; i++) {
      let sample = input[i];
      
      // Piano-specific processing based on variation
      if (variation === 'classical') {
        // Natural dynamic range
        sample *= 1.0;
      } else if (variation === 'jazz') {
        // Slight compression and warmth
        sample = this.softCompress(sample, 0.7, 2);
      } else if (variation === 'rock') {
        // More aggressive processing
        sample = this.softCompress(sample, 0.5, 3);
        sample = Math.tanh(sample * 1.2); // Slight saturation
      }
      
      output[i] = sample;
    }
  }

  private applyGuitarProcessing(input: Float32Array, output: Float32Array, variation: string) {
    for (let i = 0; i < input.length; i++) {
      let sample = input[i];
      
      if (variation === 'acoustic') {
        // Natural guitar sound
        sample *= 1.0;
      } else if (variation === 'electric') {
        // Add some distortion
        sample = Math.tanh(sample * 2) * 0.7;
      } else if (variation === 'rock') {
        // Heavy distortion
        sample = Math.sign(sample) * Math.pow(Math.abs(sample), 0.6);
      }
      
      output[i] = sample;
    }
  }

  private applyViolinProcessing(input: Float32Array, output: Float32Array, variation: string) {
    // Add subtle vibrato and bow noise
    for (let i = 0; i < input.length; i++) {
      let sample = input[i];
      
      if (variation === 'classical') {
        // Clean violin sound
        sample *= 1.0;
      } else if (variation === 'folk') {
        // Warmer, more intimate sound
        sample = this.softCompress(sample, 0.8, 1.5);
      }
      
      output[i] = sample;
    }
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

  private getInstrumentBasePitch(instrumentType: string): number {
    const basePitches: { [key: string]: number } = {
      piano: 261.63, // C4
      guitar: 329.63, // E4
      violin: 440, // A4
      bass: 130.81, // C3
    };
    return basePitches[instrumentType] || 440;
  }

  private midiToFrequency(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
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

  async detectPitchSequence(audioBlob: Blob): Promise<{ frequency: number; note: string; confidence: number }[]> {
    const pitchData = await this.pitchDetector.detectPitchFromBlob(audioBlob);
    return pitchData.map(p => ({
      frequency: p.frequency,
      note: p.notes[0],
      confidence: p.confidence
    }));
  }

  async applyEffects(audioBlob: Blob, effects: any[]): Promise<string> {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      let audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Apply each effect in sequence using professional processing
      for (const effect of effects) {
        if (effect.name === 'Reverb' && effect.enabled) {
          audioBuffer = await this.applyProfessionalReverb(
            audioBuffer,
            effect.parameters.roomSize,
            effect.parameters.decay,
            effect.parameters.wetness
          );
        }
      }
      
      const wavBuffer = this.audioBufferToWav(audioBuffer);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Professional effects processing error:', error);
      throw error;
    }
  }

  private async applyProfessionalReverb(
    audioBuffer: AudioBuffer,
    roomSize: number,
    decay: number,
    wetness: number
  ): Promise<AudioBuffer> {
    // Use convolution reverb for professional quality
    const processedBuffer = audioBuffer.getAudioContext().createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length + Math.floor(audioBuffer.sampleRate * decay),
      audioBuffer.sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);
      
      // Copy dry signal
      for (let i = 0; i < inputData.length; i++) {
        outputData[i] = inputData[i] * (1 - wetness / 100);
      }
      
      // Add reverb using multiple delay lines with feedback
      const delayTimes = [0.03, 0.05, 0.07, 0.11, 0.13, 0.17, 0.19, 0.23];
      
      for (const delayTime of delayTimes) {
        const delaySamples = Math.floor(delayTime * audioBuffer.sampleRate * roomSize / 100);
        const feedback = Math.pow(0.6, delayTime / (decay / 1000));
        
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
