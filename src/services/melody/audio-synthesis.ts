
import { createRealisticEnvelope } from './envelope';
import { generateRealisticInstrumentSample } from './instruments';
import { applyBasicMastering, audioBufferToWav } from './audio-utils';

// Generate high-quality musical audio with proper pitch detection and harmony
export const generateRealisticAudioWithSamples = async (
  melody: number[], 
  instrumentType: string, 
  variationType: string, 
  tempo: number,
  key: string
): Promise<string> => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const sampleRate = audioContext.sampleRate;
  
  // Create longer, more musical phrases
  const noteDuration = 60 / (tempo * 0.75); // Slower, more musical timing
  const totalDuration = melody.length * noteDuration + 2; // Add reverb tail
  const bufferLength = sampleRate * totalDuration;
  const audioBuffer = audioContext.createBuffer(2, bufferLength, sampleRate);
  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = audioBuffer.getChannelData(1);

  // Quantize melody to a musical scale for better harmony
  const quantizedMelody = quantizeToScale(melody, key);
  
  // Generate each note with realistic instrument modeling and harmonies
  quantizedMelody.forEach((midiNote, noteIndex) => {
    const frequency = midiToFrequency(midiNote);
    const startSample = Math.floor(noteIndex * noteDuration * sampleRate);
    const endSample = Math.floor((noteIndex + 1) * noteDuration * sampleRate);
    
    for (let i = startSample; i < endSample && i < bufferLength; i++) {
      const time = (i - startSample) / sampleRate;
      const noteProgress = time / noteDuration;
      
      // Create realistic envelope
      const envelope = createRealisticEnvelope(instrumentType, noteProgress);
      
      // Generate main instrument sample
      const mainSample = generateRealisticInstrumentSample(instrumentType, variationType, time, frequency);
      
      // Add subtle harmonies for richness
      const harmony = generateHarmony(instrumentType, time, frequency, noteProgress);
      
      // Combine main and harmony with envelope
      const finalSample = (mainSample + harmony * 0.3) * envelope * 0.5;
      
      // Apply stereo imaging
      const stereoWidth = 0.2;
      leftChannel[i] += finalSample * (1 - stereoWidth + Math.sin(time * 0.8) * stereoWidth);
      rightChannel[i] += finalSample * (1 - stereoWidth - Math.sin(time * 0.8) * stereoWidth);
    }
  });

  // Add subtle reverb effect
  addSimpleReverb(leftChannel, sampleRate);
  addSimpleReverb(rightChannel, sampleRate);

  // Apply mastering
  applyBasicMastering(leftChannel);
  applyBasicMastering(rightChannel);

  // Convert to WAV
  const wavBuffer = audioBufferToWav(audioBuffer);
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};

// Convert MIDI note to frequency
const midiToFrequency = (midiNote: number): number => {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
};

// Quantize melody to a musical scale for better harmony
const quantizeToScale = (melody: number[], key: string): number[] => {
  // Major scale intervals (semitones from root)
  const majorScale = [0, 2, 4, 5, 7, 9, 11];
  const keyOffsets: { [key: string]: number } = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
  };
  
  const keyOffset = keyOffsets[key] || 0;
  const baseNote = 60 + keyOffset; // C4 + key offset
  
  return melody.map(note => {
    // Quantize to nearest scale note
    const octave = Math.floor((note - baseNote) / 12);
    const noteInScale = (note - baseNote) % 12;
    
    // Find closest scale note
    let closestScale = majorScale[0];
    let minDistance = Math.abs(noteInScale - closestScale);
    
    for (const scaleNote of majorScale) {
      const distance = Math.abs(noteInScale - scaleNote);
      if (distance < minDistance) {
        minDistance = distance;
        closestScale = scaleNote;
      }
    }
    
    return baseNote + octave * 12 + closestScale;
  });
};

// Generate harmonic content for richness
const generateHarmony = (instrumentType: string, time: number, frequency: number, noteProgress: number): number => {
  // Add subtle third and fifth harmonies
  const third = Math.sin(2 * Math.PI * frequency * 1.26 * time) * 0.3; // Major third
  const fifth = Math.sin(2 * Math.PI * frequency * 1.5 * time) * 0.2;  // Perfect fifth
  
  // Fade in harmonies gradually
  const harmonyEnvelope = Math.min(1, noteProgress * 4);
  
  return (third + fifth) * harmonyEnvelope;
};

// Add simple reverb effect
const addSimpleReverb = (channelData: Float32Array, sampleRate: number) => {
  const delayTime = 0.05; // 50ms delay
  const delayLength = Math.floor(delayTime * sampleRate);
  const feedback = 0.3;
  const mix = 0.2;
  
  for (let i = delayLength; i < channelData.length; i++) {
    const delayedSample = channelData[i - delayLength] * feedback;
    channelData[i] = channelData[i] * (1 - mix) + delayedSample * mix;
  }
};
