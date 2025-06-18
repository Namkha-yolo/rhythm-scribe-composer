
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import InstrumentSelector, { INSTRUMENT_OPTIONS } from '../InstrumentSelector';
import VoiceRecorder from '../VoiceRecorder';
import TrackVariationSelector from '../TrackVariationSelector';
import MelodyDisplay from './MelodyDisplay';
import RillaAIInfo from './RillaAIInfo';
import { useVoiceRecording } from './hooks/useVoiceRecording';
import { usePitchDetection } from './hooks/usePitchDetection';
import { cleanNoteSequence, formatVariationName, getInstrumentColor } from './utils/audioUtils';
import { analyzeMelodyWithRilla, generateInstrumentTrackWithRilla } from '@/services/melody-rilla-api';

interface VoiceTrackRecorderProps {
  onTrackCreated: (track: any) => void;
}

interface TrackVariation {
  id: string;
  name: string;
  type: string;
  audioUrl: string;
  confidence: number;
  melody: number[];
}

const VoiceTrackRecorder = ({ onTrackCreated }: VoiceTrackRecorderProps) => {
  const [selectedInstrument, setSelectedInstrument] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [trackVariations, setTrackVariations] = useState<TrackVariation[]>([]);
  const { toast } = useToast();

  const {
    isRecording,
    recordedVoiceUrl,
    startRecording: startVoiceRecording,
    stopRecording,
    resetRecording
  } = useVoiceRecording();

  const {
    detectedMelody,
    setDetectedMelody,
    extractPitchSequence
  } = usePitchDetection();

  const startRecording = async () => {
    if (!selectedInstrument) {
      toast({
        title: "Select an instrument",
        description: "Choose an instrument type first",
        variant: "destructive",
      });
      return;
    }

    const success = await startVoiceRecording();
    if (success) {
      const instrument = INSTRUMENT_OPTIONS.find(i => i.id === selectedInstrument);
      toast({
        title: "Recording Started",
        description: `Hum your melody - Rilla AI will capture the pitch sequence for ${instrument?.name}`,
      });
    }
  };

  const handleRecordingStop = async () => {
    stopRecording();
    // Wait for the recorded voice URL to be set, then process
    setTimeout(() => {
      if (recordedVoiceUrl) {
        analyzePitchAndGenerateVariations();
      }
    }, 100);
  };

  const analyzePitchAndGenerateVariations = async () => {
    if (!recordedVoiceUrl) return;
    
    setIsProcessing(true);
    setTrackVariations([]);
    
    try {
      const instrument = INSTRUMENT_OPTIONS.find(i => i.id === selectedInstrument);
      if (!instrument) return;

      // Convert URL back to blob for processing
      const response = await fetch(recordedVoiceUrl);
      const audioBlob = await response.blob();

      const localPitchData = await extractPitchSequence(audioBlob);
      setDetectedMelody(localPitchData);
      
      const cleanNotes = cleanNoteSequence(localPitchData);
      console.log('Cleaned note sequence:', cleanNotes);
      
      toast({
        title: "Rilla AI Processing",
        description: "Analyzing your melody with Claude 3.5 Sonnet...",
      });

      const rillaAnalysis = await analyzeMelodyWithRilla(cleanNotes, instrument.id);
      console.log('Rilla AI melody analysis:', rillaAnalysis);

      const variations: TrackVariation[] = [];
      
      for (let i = 0; i < Math.min(3, instrument.variations.length); i++) {
        const variationType = instrument.variations[i];
        
        toast({
          title: "Generating Tracks",
          description: `Creating ${formatVariationName(variationType)} with improved audio synthesis...`,
        });

        const audioUrl = await generateInstrumentTrackWithRilla(
          rillaAnalysis.cleanMelody,
          rillaAnalysis.detectedKey,
          instrument.id,
          variationType,
          rillaAnalysis.tempo
        );
        
        variations.push({
          id: `${instrument.id}-${variationType}-${Date.now()}-${i}`,
          name: `${formatVariationName(variationType)} in ${rillaAnalysis.detectedKey}`,
          type: variationType,
          audioUrl,
          confidence: rillaAnalysis.confidence - (i * 0.1),
          melody: rillaAnalysis.cleanMelody
        });
      }

      setTrackVariations(variations);
      
      toast({
        title: "Rilla AI Success!",
        description: `Created ${variations.length} realistic ${instrument.name} variations`,
      });
    } catch (error) {
      console.error('Rilla AI melody processing error:', error);
      toast({
        title: "Rilla AI Error",
        description: "Could not process melody with Rilla AI",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVariationSelected = (variation: TrackVariation) => {
    const instrument = INSTRUMENT_OPTIONS.find(i => i.id === selectedInstrument);
    
    const newTrack = {
      id: Date.now(),
      name: variation.name,
      type: variation.type,
      instrument: selectedInstrument,
      volume: 0.8,
      muted: false,
      effects: [],
      color: getInstrumentColor(selectedInstrument),
      audioUrl: variation.audioUrl,
      originalVoice: recordedVoiceUrl,
      melody: variation.melody,
      userDescription: `${instrument?.name} melody - ${variation.name}`
    };

    onTrackCreated(newTrack);
    
    toast({
      title: "Rilla AI Track Added!",
      description: `${variation.name} with your melody added to mixer`,
    });

    setTrackVariations([]);
    resetRecording();
    setDetectedMelody([]);
  };

  return (
    <Card className="bg-dark-surface border-dark-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mic className="w-5 h-5 text-neon-blue" />
          <span>Voice to Melody (Rilla AI)</span>
        </CardTitle>
        <CardDescription>
          Hum or sing a melody - Rilla AI will capture the pitch sequence and create realistic instrument sounds
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <InstrumentSelector 
          selectedInstrument={selectedInstrument}
          onInstrumentChange={setSelectedInstrument}
        />

        <VoiceRecorder
          isRecording={isRecording}
          onStartRecording={startRecording}
          onStopRecording={handleRecordingStop}
          recordedVoiceUrl={recordedVoiceUrl}
          disabled={isProcessing || !selectedInstrument}
        />

        <MelodyDisplay detectedMelody={detectedMelody} />

        <TrackVariationSelector
          variations={trackVariations}
          onSelectVariation={handleVariationSelected}
          isGenerating={isProcessing}
        />

        <RillaAIInfo isProcessing={isProcessing} />
      </CardContent>
    </Card>
  );
};

export default VoiceTrackRecorder;
