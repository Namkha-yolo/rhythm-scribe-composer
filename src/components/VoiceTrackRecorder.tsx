import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import InstrumentSelector, { INSTRUMENT_OPTIONS } from './InstrumentSelector';
import VoiceRecorder from './VoiceRecorder';
import TrackVariationSelector from './TrackVariationSelector';
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

interface PitchData {
  time: number;
  frequency: number;
  note: string;
  confidence: number;
}

const VoiceTrackRecorder = ({ onTrackCreated }: VoiceTrackRecorderProps) => {
  const [selectedInstrument, setSelectedInstrument] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordedVoiceUrl, setRecordedVoiceUrl] = useState<string>('');
  const [trackVariations, setTrackVariations] = useState<TrackVariation[]>([]);
  const [detectedMelody, setDetectedMelody] = useState<PitchData[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    if (!selectedInstrument) {
      toast({
        title: "Select an instrument",
        description: "Choose an instrument type first",
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        const voiceUrl = URL.createObjectURL(audioBlob);
        setRecordedVoiceUrl(voiceUrl);
        await analyzePitchAndGenerateVariations(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      const instrument = INSTRUMENT_OPTIONS.find(i => i.id === selectedInstrument);
      toast({
        title: "Recording Started",
        description: `Hum your melody - Rilla AI will capture the pitch sequence for ${instrument?.name}`,
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const analyzePitchAndGenerateVariations = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setTrackVariations([]);
    
    try {
      const instrument = INSTRUMENT_OPTIONS.find(i => i.id === selectedInstrument);
      if (!instrument) return;

      // Step 1: Extract basic pitch data locally
      const localPitchData = await extractPitchSequence(audioBlob);
      setDetectedMelody(localPitchData);
      
      // Step 2: Clean and filter the note sequence
      const cleanNotes = localPitchData
        .map(p => p.note)
        .filter(note => note && !note.includes('NaN') && note !== 'C4') // Filter out NaN and default values
        .reduce((acc, note, index, array) => {
          // Remove excessive repetition - only keep if different from previous or part of a short sequence
          if (index === 0 || note !== array[index - 1]) {
            acc.push(note);
          } else if (acc.length > 0 && acc[acc.length - 1] === note) {
            // Skip if same as previous note (already added)
            return acc;
          }
          return acc;
        }, [] as string[]);

      console.log('Cleaned note sequence:', cleanNotes);
      
      // Step 3: Use Rilla AI to analyze and clean up the melody
      toast({
        title: "Rilla AI Processing",
        description: "Analyzing your melody with Claude 3.5 Sonnet...",
      });

      const rillaAnalysis = await analyzeMelodyWithRilla(cleanNotes, instrument.id);
      
      console.log('Rilla AI melody analysis:', rillaAnalysis);

      // Step 4: Generate instrument tracks using Rilla AI
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

  const formatVariationName = (variationType: string): string => {
    return variationType.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getInstrumentColor = (instrumentId: string): string => {
    const colors: { [key: string]: string } = {
      guitar: "from-orange-500 to-orange-600",
      piano: "from-blue-500 to-blue-600",
      drums: "from-red-500 to-red-600",
      bass: "from-purple-500 to-purple-600",
      synth: "from-green-500 to-green-600",
      violin: "from-indigo-500 to-indigo-600"
    };
    return colors[instrumentId] || "from-gray-500 to-gray-600";
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
    setRecordedVoiceUrl('');
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
          onStopRecording={stopRecording}
          recordedVoiceUrl={recordedVoiceUrl}
          disabled={isProcessing || !selectedInstrument}
        />

        {detectedMelody.length > 0 && (
          <div className="bg-muted/10 p-4 rounded-lg border border-dark-border">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Melody Captured:</h4>
            <div className="text-xs text-gray-400">
              <p>Notes detected: {detectedMelody.map(p => p.note).filter(note => note && !note.includes('NaN')).slice(0, 20).join(' → ')}{detectedMelody.length > 20 ? '...' : ''}</p>
              <p>Duration: {detectedMelody.filter(p => p.note && !p.note.includes('NaN')).length} clean notes (processing with Rilla AI...)</p>
            </div>
          </div>
        )}

        <TrackVariationSelector
          variations={trackVariations}
          onSelectVariation={handleVariationSelected}
          isGenerating={isProcessing}
        />

        {/* Rilla AI Info */}
        {!isProcessing && (
          <div className="bg-muted/10 p-3 rounded-lg border border-dark-border">
            <p className="text-xs text-gray-400 mb-1">Powered by Rilla AI + Enhanced Audio:</p>
            <div className="text-xs space-y-1">
              <p className="text-neon-blue">• Claude 3.5 Sonnet - Melody Analysis & Musical Theory</p>
              <p className="text-neon-green">• LLaMA 4 Maverick - Instrument Parameter Generation</p>
              <p className="text-neon-purple">• Enhanced Audio Synthesis - Realistic Instrument Modeling</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceTrackRecorder;
