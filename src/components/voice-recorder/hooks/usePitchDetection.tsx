
import { useState } from 'react';

interface PitchData {
  time: number;
  frequency: number;
  note: string;
  confidence: number;
}

export const usePitchDetection = () => {
  const [detectedMelody, setDetectedMelody] = useState<PitchData[]>([]);

  const extractPitchSequence = async (audioBlob: Blob): Promise<PitchData[]> => {
    return new Promise((resolve) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const channelData = audioBuffer.getChannelData(0);
          const sampleRate = audioBuffer.sampleRate;
          
          const pitches: PitchData[] = [];
          const windowSize = 4096;
          const hopSize = windowSize / 4;
          
          for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
            const window = channelData.slice(i, i + windowSize);
            const frequency = detectPitch(window, sampleRate);
            
            if (frequency > 80 && frequency < 2000) {
              const note = frequencyToNote(frequency);
              pitches.push({
                time: i / sampleRate,
                frequency,
                note,
                confidence: 0.8
              });
            }
          }
          
          resolve(pitches);
        } catch (error) {
          console.error('Audio processing error:', error);
          resolve([]);
        }
      };
      
      reader.readAsArrayBuffer(audioBlob);
    });
  };

  const detectPitch = (buffer: Float32Array, sampleRate: number): number => {
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
    
    for (let lag = Math.floor(sampleRate / 800); lag < Math.floor(sampleRate / 80); lag++) {
      if (correlations[lag] > maxCorrelation) {
        maxCorrelation = correlations[lag];
        bestLag = lag;
      }
    }
    
    return bestLag > 0 ? sampleRate / bestLag : 0;
  };

  const frequencyToNote = (frequency: number): string => {
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
  };

  return {
    detectedMelody,
    setDetectedMelody,
    extractPitchSequence
  };
};
