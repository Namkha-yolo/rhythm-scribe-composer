
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface InstrumentOption {
  id: string;
  name: string;
  family: string;
  variations: string[];
}

const INSTRUMENT_OPTIONS: InstrumentOption[] = [
  {
    id: 'guitar',
    name: 'Guitar',
    family: 'strings',
    variations: ['acoustic-bright', 'acoustic-mellow', 'electric-clean', 'electric-distorted', 'classical']
  },
  {
    id: 'piano',
    name: 'Piano',
    family: 'keys',
    variations: ['grand-piano', 'upright-piano', 'electric-piano', 'soft-piano', 'jazz-piano']
  },
  {
    id: 'drums',
    name: 'Drums',
    family: 'percussion',
    variations: ['kick-punchy', 'kick-deep', 'snare-crisp', 'snare-fat', 'hi-hat-tight']
  },
  {
    id: 'bass',
    name: 'Bass',
    family: 'bass',
    variations: ['electric-bass', 'upright-bass', 'synth-bass', '808-bass', 'fretless-bass']
  },
  {
    id: 'synth',
    name: 'Synthesizer',
    family: 'synth',
    variations: ['lead-bright', 'lead-warm', 'pad-ambient', 'bass-deep', 'arp-plucky']
  },
  {
    id: 'violin',
    name: 'Violin',
    family: 'strings',
    variations: ['classical', 'folk', 'electric', 'pizzicato', 'tremolo']
  }
];

interface InstrumentSelectorProps {
  selectedInstrument: string;
  onInstrumentChange: (instrumentId: string) => void;
}

const InstrumentSelector = ({ selectedInstrument, onInstrumentChange }: InstrumentSelectorProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-300">
        Select Instrument Type
      </label>
      <Select value={selectedInstrument} onValueChange={onInstrumentChange}>
        <SelectTrigger className="bg-muted/20 border-dark-border text-white">
          <SelectValue placeholder="Choose an instrument..." />
        </SelectTrigger>
        <SelectContent className="bg-dark-surface border-dark-border">
          {INSTRUMENT_OPTIONS.map((instrument) => (
            <SelectItem 
              key={instrument.id} 
              value={instrument.id}
              className="text-white hover:bg-muted/20"
            >
              {instrument.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-gray-400">
        Record yourself humming or making sounds - we'll create multiple variations that match your voice
      </p>
    </div>
  );
};

export { InstrumentSelector, INSTRUMENT_OPTIONS };
export default InstrumentSelector;
