
export const generateRealisticInstrumentSample = (instrumentType: string, variationType: string, time: number, frequency: number): number => {
  switch (instrumentType) {
    case 'guitar':
      return generateGuitarSample(variationType, time, frequency);
    case 'piano':
      return generatePianoSample(time, frequency);
    case 'violin':
      return generateViolinSample(time, frequency);
    case 'synth':
      return generateSynthSample(variationType, time, frequency);
    case 'bass':
      return generateBassSample(time, frequency);
    default:
      return generateDefaultSample(time, frequency);
  }
};

const generateGuitarSample = (variationType: string, time: number, frequency: number): number => {
  // Realistic guitar with string resonance
  let sample = 0;
  
  // Fundamental and harmonics with realistic amplitudes
  const harmonics = [1, 0.7, 0.5, 0.3, 0.2, 0.15, 0.1];
  
  for (let h = 0; h < harmonics.length; h++) {
    const harmonic = h + 1;
    const amplitude = harmonics[h];
    // Add slight inharmonicity for realism
    const freq = frequency * harmonic * (1 + 0.001 * harmonic);
    sample += amplitude * Math.sin(2 * Math.PI * freq * time);
  }
  
  // Add pluck attack simulation
  const pluckEnvelope = Math.exp(-time * 8);
  sample *= pluckEnvelope;
  
  // Electric guitar distortion
  if (variationType.includes('electric')) {
    sample = Math.tanh(sample * 2) * 0.7;
  }
  
  return sample * 0.6;
};

const generatePianoSample = (time: number, frequency: number): number => {
  let sample = 0;
  
  // Piano harmonics with realistic decay rates
  const harmonics = [
    { ratio: 1, amp: 1.0, decay: 1 },
    { ratio: 2, amp: 0.8, decay: 1.2 },
    { ratio: 3, amp: 0.6, decay: 1.5 },
    { ratio: 4, amp: 0.4, decay: 2 },
    { ratio: 5, amp: 0.3, decay: 2.5 },
    { ratio: 6, amp: 0.2, decay: 3 }
  ];
  
  for (const h of harmonics) {
    const freq = frequency * h.ratio;
    const envelope = Math.exp(-time * h.decay);
    sample += h.amp * Math.sin(2 * Math.PI * freq * time) * envelope;
  }
  
  // Add hammer noise for attack
  const attack = time < 0.01 ? Math.random() * 0.1 * Math.exp(-time * 100) : 0;
  
  return (sample + attack) * 0.5;
};

const generateViolinSample = (time: number, frequency: number): number => {
  // Violin with bow simulation and vibrato
  const vibrato = 1 + 0.015 * Math.sin(2 * Math.PI * 6 * time); // 6Hz vibrato
  
  let sample = 0;
  
  // Strong odd harmonics characteristic of bowed strings
  const harmonics = [1, 0.1, 0.8, 0.1, 0.6, 0.1, 0.4, 0.1, 0.3];
  
  for (let h = 0; h < harmonics.length; h++) {
    const harmonic = h + 1;
    const amplitude = harmonics[h];
    const freq = frequency * harmonic * vibrato;
    sample += amplitude * Math.sin(2 * Math.PI * freq * time);
  }
  
  // Bow noise for realism
  const bowNoise = (Math.random() - 0.5) * 0.02 * Math.sin(time * 20);
  
  return (sample + bowNoise) * 0.5;
};

const generateSynthSample = (variationType: string, time: number, frequency: number): number => {
  if (variationType.includes('lead')) {
    // Bright lead synth with filter sweep
    const saw = sawWave(frequency, time);
    const cutoffFreq = 1000 + 500 * Math.sin(time * 3);
    const resonance = 0.8;
    
    // Simple lowpass filter simulation
    const cutoffRatio = Math.min(1, cutoffFreq / (frequency * 4));
    return saw * cutoffRatio * 0.7;
  } else {
    // Warm pad with chorus effect
    const osc1 = Math.sin(2 * Math.PI * frequency * time);
    const osc2 = Math.sin(2 * Math.PI * frequency * 1.007 * time); // Slight detune
    const osc3 = Math.sin(2 * Math.PI * frequency * 0.993 * time); // Opposite detune
    
    return (osc1 + osc2 + osc3) * 0.4;
  }
};

const generateBassSample = (time: number, frequency: number): number => {
  // Deep bass with sub harmonics
  const fundamental = Math.sin(2 * Math.PI * frequency * time);
  const subOctave = Math.sin(2 * Math.PI * frequency * 0.5 * time) * 0.3;
  const secondHarmonic = Math.sin(2 * Math.PI * frequency * 2 * time) * 0.6;
  
  let sample = fundamental + subOctave + secondHarmonic;
  
  // Bass compression/saturation
  sample = Math.tanh(sample * 1.5) * 0.8;
  
  return sample;
};

const generateDefaultSample = (time: number, frequency: number): number => {
  // Clean sine wave with subtle harmonics
  const fundamental = Math.sin(2 * Math.PI * frequency * time);
  const second = Math.sin(2 * Math.PI * frequency * 2 * time) * 0.3;
  const third = Math.sin(2 * Math.PI * frequency * 3 * time) * 0.1;
  
  return (fundamental + second + third) * 0.6;
};

const sawWave = (frequency: number, time: number): number => {
  const period = 1 / frequency;
  const phase = (time % period) / period;
  return 2 * phase - 1;
};
