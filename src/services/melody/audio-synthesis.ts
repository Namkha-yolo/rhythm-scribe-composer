
import { createRealisticEnvelope } from './envelope';
import { generateRealisticInstrumentSample } from './instruments';
import { applyBasicMastering, audioBufferToWav } from './audio-utils';

// Generate realistic audio using Web Audio API with better synthesis
export const generateRealisticAudioWithSamples = async (
  melody: number[], 
  instrumentType: string, 
  variationType: string, 
  tempo: number,
  key: string
): Promise<string> => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const sampleRate = audioContext.sampleRate;
  const noteDuration = 60 / tempo; // seconds per note based on tempo
  const totalDuration = melody.length * noteDuration;
  const bufferLength = sampleRate * totalDuration;
  const audioBuffer = audioContext.createBuffer(2, bufferLength, sampleRate); // Stereo
  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = audioBuffer.getChannelData(1);

  // Generate each note with realistic instrument modeling
  melody.forEach((midiNote, noteIndex) => {
    const frequency = 440 * Math.pow(2, (midiNote - 69) / 12); // Convert MIDI to frequency
    const startSample = Math.floor(noteIndex * noteDuration * sampleRate);
    const endSample = Math.floor((noteIndex + 1) * noteDuration * sampleRate);
    
    for (let i = startSample; i < endSample && i < bufferLength; i++) {
      const time = (i - startSample) / sampleRate;
      const noteProgress = time / noteDuration;
      
      // Create realistic envelope
      const envelope = createRealisticEnvelope(instrumentType, noteProgress);
      
      // Generate instrument sample with harmonics
      const sample = generateRealisticInstrumentSample(instrumentType, variationType, time, frequency);
      
      // Apply envelope and add slight stereo width
      const finalSample = sample * envelope * 0.6;
      leftChannel[i] += finalSample * (0.9 + Math.sin(time * 0.5) * 0.1);
      rightChannel[i] += finalSample * (0.9 - Math.sin(time * 0.5) * 0.1);
    }
  });

  // Apply basic mastering
  applyBasicMastering(leftChannel);
  applyBasicMastering(rightChannel);

  // Convert to WAV
  const wavBuffer = audioBufferToWav(audioBuffer);
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};
