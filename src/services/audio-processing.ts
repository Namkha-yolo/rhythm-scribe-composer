
import { AdvancedPitchDetector } from './audio/advanced-pitch-detection';
import { ProfessionalEffects } from './audio/professional-effects';

export class VoiceProcessor {
  private pitchDetector: AdvancedPitchDetector;
  private effects: ProfessionalEffects;
  
  constructor() {
    this.pitchDetector = new AdvancedPitchDetector();
    this.effects = new ProfessionalEffects();
  }

  async processVoiceWithAutoTune(
    audioBlob: Blob, 
    targetKey: string, 
    autoTuneIntensity: number, 
    octaveShift: number
  ): Promise<string> {
    try {
      console.log('Processing voice with professional auto-tune...');
      
      // Convert blob to audio buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      console.log('Audio buffer created, length:', audioBuffer.length);
      
      // Apply octave shift if needed
      let processedBuffer = audioBuffer;
      if (octaveShift !== 0) {
        processedBuffer = await this.applyOctaveShift(audioBuffer, octaveShift);
      }
      
      // Apply auto-tune
      const autoTunedBuffer = await this.effects.applyAutoTune(
        processedBuffer, 
        targetKey, 
        autoTuneIntensity
      );
      
      console.log('Auto-tune applied successfully');
      
      // Convert back to WAV
      const wavBuffer = this.effects.audioBufferToWav(autoTunedBuffer);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
      
    } catch (error) {
      console.error('Voice processing error:', error);
      throw error;
    }
  }

  private async applyOctaveShift(audioBuffer: AudioBuffer, octaveShift: number): Promise<AudioBuffer> {
    const shiftRatio = Math.pow(2, octaveShift);
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a new buffer with adjusted length to maintain pitch
    const newLength = Math.floor(audioBuffer.length / shiftRatio);
    const shiftedBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      newLength,
      audioBuffer.sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = shiftedBuffer.getChannelData(channel);
      
      // Resample to change pitch
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
      
      // Apply each effect in sequence
      for (const effect of effects) {
        if (effect.name === 'Reverb' && effect.enabled) {
          audioBuffer = await this.effects.applyReverb(
            audioBuffer,
            effect.parameters.roomSize,
            effect.parameters.decay,
            effect.parameters.wetness
          );
        }
        // Add more effects as needed
      }
      
      const wavBuffer = this.effects.audioBufferToWav(audioBuffer);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Effects processing error:', error);
      throw error;
    }
  }
}
