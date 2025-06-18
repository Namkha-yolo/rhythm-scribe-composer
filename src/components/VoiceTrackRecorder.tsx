
import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import InstrumentSelector, { INSTRUMENT_OPTIONS } from './InstrumentSelector';
import VoiceRecorder from './VoiceRecorder';
import TrackVariationSelector from './TrackVariationSelector';

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
        description: `Hum your melody - we'll capture the pitch sequence for ${instrument?.name}`,
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

      // Analyze pitch from the audio blob
      const pitchData = await extractPitchSequence(audioBlob);
      setDetectedMelody(pitchData);
      
      // Convert to musical notes and find best key
      const melody = pitchData.map(p => p.frequency);
      const bestKey = findBestKey(melody);
      const quantizedNotes = quantizeToKey(melody, bestKey);
      
      console.log('Detected melody:', pitchData.map(p => p.note));
      console.log('Best key:', bestKey);
      console.log('Quantized notes:', quantizedNotes);

      // Generate multiple variations for the selected instrument
      const variations: TrackVariation[] = [];
      
      for (let i = 0; i < Math.min(3, instrument.variations.length); i++) {
        const variationType = instrument.variations[i];
        const audioUrl = await generateMelodicAudio(instrument.id, variationType, quantizedNotes, bestKey);
        
        variations.push({
          id: `${instrument.id}-${variationType}-${Date.now()}-${i}`,
          name: `${formatVariationName(variationType)} in ${bestKey}`,
          type: variationType,
          audioUrl,
          confidence: 0.9 - (i * 0.1),
          melody: quantizedNotes
        });
      }

      setTrackVariations(variations);
      
      toast({
        title: "Melody Captured!",
        description: `Created ${variations.length} ${instrument.name} variations with your melody in ${bestKey}`,
      });
    } catch (error) {
      console.error('Pitch analysis error:', error);
      toast({
        title: "Processing Error",
        description: "Could not analyze pitch sequence",
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
            
            if (frequency > 80 && frequency < 2000) { // Valid vocal range
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
    // Autocorrelation-based pitch detection
    const correlations = new Array(buffer.length).fill(0);
    
    for (let lag = 1; lag < buffer.length; lag++) {
      let correlation = 0;
      for (let i = 0; i < buffer.length - lag; i++) {
        correlation += buffer[i] * buffer[i + lag];
      }
      correlations[lag] = correlation;
    }
    
    // Find the lag with maximum correlation (first peak after zero)
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

  const findBestKey = (frequencies: number[]): string => {
    const notes = frequencies.map(f => frequencyToNote(f));
    const noteClasses = notes.map(note => note.replace(/\d+/, ''));
    
    // Count occurrences of each note class
    const noteCounts: { [key: string]: number } = {};
    noteClasses.forEach(note => {
      noteCounts[note] = (noteCounts[note] || 0) + 1;
    });
    
    // Find the most common note - likely the tonic
    const mostCommonNote = Object.keys(noteCounts).reduce((a, b) => 
      noteCounts[a] > noteCounts[b] ? a : b
    );
    
    return mostCommonNote || 'C';
  };

  const quantizeToKey = (frequencies: number[], key: string): number[] => {
    // Major scale intervals (semitones from root)
    const majorScale = [0, 2, 4, 5, 7, 9, 11];
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const keyIndex = noteNames.indexOf(key);
    
    return frequencies.map(freq => {
      const note = frequencyToNote(freq);
      const noteClass = note.replace(/\d+/, '');
      const noteIndex = noteNames.indexOf(noteClass);
      
      // Find closest note in the key
      const relativeNote = (noteIndex - keyIndex + 12) % 12;
      const closestScaleNote = majorScale.reduce((prev, curr) => 
        Math.abs(curr - relativeNote) < Math.abs(prev - relativeNote) ? curr : prev
      );
      
      const quantizedNoteIndex = (keyIndex + closestScaleNote) % 12;
      const octave = parseInt(note.replace(/[A-G]#?/, '')) || 4;
      
      // Convert back to frequency
      const c0 = 16.35; // C0 frequency
      const semitones = quantizedNoteIndex + (octave * 12);
      return c0 * Math.pow(2, semitones / 12);
    });
  };

  const generateMelodicAudio = async (instrumentId: string, variationType: string, melody: number[], key: string): Promise<string> => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const noteDuration = 0.5; // seconds per note
    const totalDuration = melody.length * noteDuration;
    const bufferLength = sampleRate * totalDuration;
    const audioBuffer = audioContext.createBuffer(1, bufferLength, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    melody.forEach((frequency, noteIndex) => {
      const startSample = Math.floor(noteIndex * noteDuration * sampleRate);
      const endSample = Math.floor((noteIndex + 1) * noteDuration * sampleRate);
      
      for (let i = startSample; i < endSample && i < bufferLength; i++) {
        const time = (i - startSample) / sampleRate;
        const envelope = Math.exp(-time * 2) * (1 - Math.exp(-time * 20)); // ADSR envelope
        
        let sample = generateInstrumentSample(instrumentId, variationType, time, frequency);
        sample *= envelope * 0.3;
        
        channelData[i] += sample;
      }
    });

    // Convert to WAV
    const wavBuffer = audioBufferToWav(audioBuffer);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  };

  const generateInstrumentSample = (instrumentId: string, variationType: string, time: number, frequency: number): number => {
    switch (instrumentId) {
      case 'guitar':
        return (Math.sin(2 * Math.PI * frequency * time) + 
               0.3 * Math.sin(2 * Math.PI * frequency * 2 * time) +
               0.1 * Math.sin(2 * Math.PI * frequency * 3 * time)) * 0.7;
      case 'piano':
        return (Math.sin(2 * Math.PI * frequency * time) + 
               0.5 * Math.sin(2 * Math.PI * frequency * 2 * time) +
               0.2 * Math.sin(2 * Math.PI * frequency * 4 * time)) * 0.8;
      case 'violin':
        return (Math.sin(2 * Math.PI * frequency * time) + 
               0.4 * Math.sin(2 * Math.PI * frequency * 3 * time) +
               0.1 * Math.sin(2 * Math.PI * frequency * 5 * time)) * 0.6;
      case 'synth':
        if (variationType.includes('saw')) {
          return (2 / Math.PI) * Math.atan(Math.tan((Math.PI * frequency * time) % (2 * Math.PI))) * 0.8;
        }
        return Math.sin(2 * Math.PI * frequency * time) * 0.7;
      case 'bass':
        return Math.sin(2 * Math.PI * frequency * time) + 
               0.3 * Math.sin(2 * Math.PI * frequency * 0.5 * time);
      default:
        return Math.sin(2 * Math.PI * frequency * time);
    }
  };

  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    return arrayBuffer;
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
      title: "Melodic Track Added!",
      description: `${variation.name} with your melody added to mixer`,
    });

    // Reset for next recording
    setTrackVariations([]);
    setRecordedVoiceUrl('');
    setDetectedMelody([]);
  };

  return (
    <Card className="bg-dark-surface border-dark-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mic className="w-5 h-5 text-neon-blue" />
          <span>Voice to Melody</span>
        </CardTitle>
        <CardDescription>
          Hum or sing a melody - we'll capture the pitch sequence and convert it to your chosen instrument
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
            <h4 className="text-sm font-medium text-gray-300 mb-2">Detected Melody:</h4>
            <div className="text-xs text-gray-400">
              <p>Notes captured: {detectedMelody.map(p => p.note).join(' → ')}</p>
              <p>Duration: {detectedMelody.length} notes</p>
            </div>
          </div>
        )}

        <TrackVariationSelector
          variations={trackVariations}
          onSelectVariation={handleVariationSelected}
          isGenerating={isProcessing}
        />
      </CardContent>
    </Card>
  );
};

export default VoiceTrackRecorder;
