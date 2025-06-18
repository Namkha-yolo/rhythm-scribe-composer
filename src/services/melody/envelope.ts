
export const createRealisticEnvelope = (instrumentType: string, noteProgress: number): number => {
  switch (instrumentType) {
    case 'piano':
      // Piano: quick attack, medium decay, sustain, gradual release
      if (noteProgress < 0.01) return noteProgress / 0.01; // Attack
      if (noteProgress < 0.1) return 1 - (noteProgress - 0.01) * 0.3 / 0.09; // Decay
      if (noteProgress < 0.8) return 0.7; // Sustain
      return 0.7 * (1 - (noteProgress - 0.8) / 0.2); // Release
      
    case 'guitar':
      // Guitar: medium attack, quick decay, long sustain
      if (noteProgress < 0.05) return noteProgress / 0.05; // Attack
      if (noteProgress < 0.15) return 1 - (noteProgress - 0.05) * 0.2 / 0.1; // Decay
      return 0.8 * Math.exp(-noteProgress * 2); // Exponential decay
      
    case 'violin':
      // Violin: slow attack, long sustain
      if (noteProgress < 0.1) return noteProgress / 0.1; // Slow attack
      if (noteProgress < 0.9) return 1; // Long sustain
      return 1 - (noteProgress - 0.9) / 0.1; // Quick release
      
    case 'synth':
      // Synth: variable based on type
      if (noteProgress < 0.02) return noteProgress / 0.02; // Quick attack
      return Math.exp(-noteProgress * 1.5); // Exponential decay
      
    default:
      // Default envelope
      if (noteProgress < 0.1) return noteProgress / 0.1;
      return Math.exp(-noteProgress * 3);
  }
};
