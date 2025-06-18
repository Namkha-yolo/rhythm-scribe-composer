
export const createRealisticEnvelope = (instrumentType: string, noteProgress: number): number => {
  switch (instrumentType) {
    case 'piano':
      // Piano: sharp attack, exponential decay
      if (noteProgress < 0.005) return noteProgress / 0.005; // Very quick attack
      return Math.exp(-noteProgress * 2.5) * 0.9; // Exponential decay
      
    case 'guitar':
      // Guitar: medium attack, sustained decay
      if (noteProgress < 0.02) return noteProgress / 0.02; // Quick attack
      return Math.exp(-noteProgress * 1.8) * 0.8; // Natural string decay
      
    case 'violin':
      // Violin: gradual attack, sustained tone
      if (noteProgress < 0.08) return Math.pow(noteProgress / 0.08, 0.5); // Smooth bow attack
      if (noteProgress < 0.85) return 1; // Sustained bow contact
      return Math.pow((1 - noteProgress) / 0.15, 0.3); // Gentle release
      
    case 'synth':
      // Synth: customizable envelope
      if (noteProgress < 0.01) return noteProgress / 0.01; // Quick attack
      if (noteProgress < 0.3) return 1 - (noteProgress - 0.01) * 0.2 / 0.29; // Decay
      if (noteProgress < 0.8) return 0.8; // Sustain
      return 0.8 * (1 - (noteProgress - 0.8) / 0.2); // Release
      
    case 'bass':
      // Bass: punchy attack, long sustain
      if (noteProgress < 0.01) return noteProgress / 0.01; // Sharp attack
      if (noteProgress < 0.9) return 0.95; // Long sustain
      return 0.95 * (1 - (noteProgress - 0.9) / 0.1); // Quick release
      
    default:
      // Default: simple ADSR
      if (noteProgress < 0.05) return noteProgress / 0.05;
      if (noteProgress < 0.8) return 0.8;
      return 0.8 * (1 - (noteProgress - 0.8) / 0.2);
  }
};
