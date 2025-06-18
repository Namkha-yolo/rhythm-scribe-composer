
interface PitchData {
  time: number;
  frequency: number;
  note: string;
  confidence: number;
}

interface MelodyDisplayProps {
  detectedMelody: PitchData[];
}

const MelodyDisplay = ({ detectedMelody }: MelodyDisplayProps) => {
  if (detectedMelody.length === 0) return null;

  return (
    <div className="bg-muted/10 p-4 rounded-lg border border-dark-border">
      <h4 className="text-sm font-medium text-gray-300 mb-2">Melody Captured:</h4>
      <div className="text-xs text-gray-400">
        <p>Notes detected: {detectedMelody.map(p => p.note).filter(note => note && !note.includes('NaN')).slice(0, 20).join(' → ')}{detectedMelody.length > 20 ? '...' : ''}</p>
        <p>Duration: {detectedMelody.filter(p => p.note && !p.note.includes('NaN')).length} clean notes (processing with Rilla AI...)</p>
      </div>
    </div>
  );
};

export default MelodyDisplay;
