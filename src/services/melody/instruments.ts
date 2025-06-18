
export const generateRealisticInstrumentSample = (instrumentType: string, variationType: string, time: number, frequency: number): number => {
  const fundamental = Math.sin(2 * Math.PI * frequency * time);
  
  switch (instrumentType) {
    case 'guitar':
      // Guitar with realistic harmonics and slight inharmonicity
      const harmonics = [
        { freq: 1, amp: 1.0 },
        { freq: 2, amp: 0.6 },
        { freq: 3, amp: 0.4 },
        { freq: 4, amp: 0.3 },
        { freq: 5, amp: 0.2 }
      ];
      let guitarSample = 0;
      harmonics.forEach(h => {
        guitarSample += h.amp * Math.sin(2 * Math.PI * frequency * h.freq * time * (1 + 0.001 * h.freq));
      });
      // Add slight distortion for electric guitar
      if (variationType.includes('electric')) {
        guitarSample = Math.tanh(guitarSample * 1.5);
      }
      return guitarSample * 0.7;
             
    case 'piano':
      // Piano with complex harmonic series and inharmonicity
      let pianoSample = fundamental;
      for (let harmonic = 2; harmonic <= 8; harmonic++) {
        const inharmonicity = 1 + 0.0001 * harmonic * harmonic;
        const amplitude = 1 / (harmonic * harmonic);
        pianoSample += amplitude * Math.sin(2 * Math.PI * frequency * harmonic * inharmonicity * time);
      }
      // Add slight noise for realism
      pianoSample += (Math.random() - 0.5) * 0.05;
      return pianoSample * 0.6;
             
    case 'violin':
      // Violin with strong odd harmonics and vibrato
      const vibrato = 1 + 0.02 * Math.sin(2 * Math.PI * 5 * time); // 5Hz vibrato
      let violinSample = Math.sin(2 * Math.PI * frequency * vibrato * time);
      violinSample += 0.7 * Math.sin(2 * Math.PI * frequency * 3 * vibrato * time); // 3rd harmonic
      violinSample += 0.5 * Math.sin(2 * Math.PI * frequency * 5 * vibrato * time); // 5th harmonic
      violinSample += 0.3 * Math.sin(2 * Math.PI * frequency * 7 * vibrato * time); // 7th harmonic
      return violinSample * 0.6;
             
    case 'synth':
      if (variationType.includes('lead')) {
        // Lead synth with saw wave and filter sweep
        const sawWave = (2 / Math.PI) * Math.atan(Math.tan(Math.PI * frequency * time));
        const filterFreq = 800 + 400 * Math.sin(time * 2);
        const cutoff = Math.min(1, filterFreq / frequency);
        return sawWave * cutoff * 0.8;
      } else {
        // Pad synth with multiple detuned oscillators
        const osc1 = Math.sin(2 * Math.PI * frequency * time);
        const osc2 = Math.sin(2 * Math.PI * frequency * 1.005 * time);
        const osc3 = Math.sin(2 * Math.PI * frequency * 0.995 * time);
        return (osc1 + osc2 + osc3) * 0.5;
      }
             
    case 'bass':
      // Bass with sub harmonics and slight distortion
      let bassSample = fundamental;
      bassSample += 0.3 * Math.sin(2 * Math.PI * frequency * 0.5 * time); // Sub octave
      bassSample += 0.8 * Math.sin(2 * Math.PI * frequency * 2 * time); // Octave
      bassSample = Math.tanh(bassSample * 1.2); // Slight compression
      return bassSample * 0.9;
             
    default:
      return fundamental * 0.7;
  }
};
