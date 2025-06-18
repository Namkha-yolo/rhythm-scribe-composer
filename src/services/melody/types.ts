
export interface MelodyAnalysis {
  cleanMelody: number[];
  detectedKey: string;
  tempo: number;
  confidence: number;
  musicalStructure: string;
}
