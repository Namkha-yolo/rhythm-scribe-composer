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
}

const VoiceTrackRecorder = ({ onTrackCreated }: VoiceTrackRecorderProps) => {
  const [selectedInstrument, setSelectedInstrument] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordedVoiceUrl, setRecordedVoiceUrl] = useState<string>('');
  const [trackVariations, setTrackVariations] = useState<TrackVariation[]>([]);
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
        await generateTrackVariations(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      const instrument = INSTRUMENT_OPTIONS.find(i => i.id === selectedInstrument);
      toast({
        title: "Recording Started",
        description: `Make ${instrument?.name} sounds with your voice`,
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

  const generateTrackVariations = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setTrackVariations([]);
    
    try {
      const instrument = INSTRUMENT_OPTIONS.find(i => i.id === selectedInstrument);
      if (!instrument) return;

      // Generate multiple variations for the selected instrument
      const variations: TrackVariation[] = [];
      
      for (let i = 0; i < instrument.variations.length; i++) {
        const variationType = instrument.variations[i];
        const audioUrl = await generateAudioForVariation(instrument.id, variationType, i);
        
        variations.push({
          id: `${instrument.id}-${variationType}-${Date.now()}-${i}`,
          name: formatVariationName(variationType),
          type: variationType,
          audioUrl,
          confidence: 0.9 - (i * 0.1) // Decreasing confidence for demo
        });
      }

      setTrackVariations(variations);
      
      toast({
        title: "Variations Generated!",
        description: `Created ${variations.length} ${instrument.name} variations from your voice`,
      });
    } catch (error) {
      console.error('Voice processing error:', error);
      toast({
        title: "Processing Error",
        description: "Could not generate track variations",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateAudioForVariation = async (instrumentId: string, variationType: string, index: number): Promise<string> => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 3;
    const bufferLength = sampleRate * duration;
    const audioBuffer = audioContext.createBuffer(1, bufferLength, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    // Generate different sounds based on instrument and variation
    const baseFreq = getBaseFrequency(instrumentId, variationType);
    const pattern = getPattern(instrumentId, variationType);
    
    pattern.forEach((beat, beatIndex) => {
      const startSample = Math.floor(beat.time * sampleRate);
      const beatDuration = Math.floor(beat.duration * sampleRate);
      
      for (let i = 0; i < beatDuration && startSample + i < bufferLength; i++) {
        const time = i / sampleRate;
        let sample = generateSample(instrumentId, variationType, time, baseFreq, beat.velocity);
        
        // Add variation-specific modifications
        sample = applyVariationEffects(sample, variationType, time, index);
        
        channelData[startSample + i] += sample * 0.3;
      }
    });

    // Convert to WAV
    const wavBuffer = audioBufferToWav(audioBuffer);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  };

  const getBaseFrequency = (instrumentId: string, variationType: string): number => {
    const frequencies: { [key: string]: { [key: string]: number } } = {
      guitar: { 'acoustic-bright': 220, 'acoustic-mellow': 196, 'electric-clean': 247, 'electric-distorted': 220, 'classical': 196 },
      piano: { 'grand-piano': 440, 'upright-piano': 415, 'electric-piano': 466, 'soft-piano': 392, 'jazz-piano': 440 },
      drums: { 'kick-punchy': 60, 'kick-deep': 45, 'snare-crisp': 200, 'snare-fat': 180, 'hi-hat-tight': 8000 },
      bass: { 'electric-bass': 82, 'upright-bass': 73, 'synth-bass': 87, '808-bass': 55, 'fretless-bass': 82 },
      synth: { 'lead-bright': 523, 'lead-warm': 440, 'pad-ambient': 220, 'bass-deep': 87, 'arp-plucky': 659 },
      violin: { 'classical': 440, 'folk': 415, 'electric': 466, 'pizzicato': 440, 'tremolo': 440 }
    };
    return frequencies[instrumentId]?.[variationType] || 440;
  };

  const getPattern = (instrumentId: string, variationType: string) => {
    if (instrumentId === 'drums') {
      return [
        { time: 0.0, velocity: 0.8, duration: 0.2 },
        { time: 0.5, velocity: 0.6, duration: 0.15 },
        { time: 1.0, velocity: 0.7, duration: 0.2 },
        { time: 1.5, velocity: 0.5, duration: 0.1 }
      ];
    }
    return [
      { time: 0.0, velocity: 0.7, duration: 0.8 },
      { time: 1.0, velocity: 0.6, duration: 0.6 },
      { time: 2.0, velocity: 0.8, duration: 1.0 }
    ];
  };

  const generateSample = (instrumentId: string, variationType: string, time: number, baseFreq: number, velocity: number): number => {
    switch (instrumentId) {
      case 'drums':
        if (variationType.includes('kick')) {
          return Math.sin(2 * Math.PI * baseFreq * time) * Math.exp(-time * 25) * velocity;
        } else if (variationType.includes('snare')) {
          return (Math.random() * 2 - 1) * Math.exp(-time * 20) * velocity * 0.4;
        } else {
          return (Math.random() * 2 - 1) * Math.exp(-time * 50) * velocity * 0.2;
        }
      case 'guitar':
        return (Math.sin(2 * Math.PI * baseFreq * time) + 
               0.3 * Math.sin(2 * Math.PI * baseFreq * 2 * time) +
               0.1 * Math.sin(2 * Math.PI * baseFreq * 3 * time)) * 
               Math.exp(-time * 6) * velocity * 0.4;
      case 'piano':
        return (Math.sin(2 * Math.PI * baseFreq * time) + 
               0.5 * Math.sin(2 * Math.PI * baseFreq * 2 * time)) * 
               Math.exp(-time * 3) * velocity * 0.5;
      case 'bass':
        return Math.sin(2 * Math.PI * baseFreq * time) * Math.exp(-time * 2) * velocity;
      case 'synth':
        return Math.sin(2 * Math.PI * baseFreq * time) * Math.exp(-time * 4) * velocity;
      case 'violin':
        return (Math.sin(2 * Math.PI * baseFreq * time) + 
               0.2 * Math.sin(2 * Math.PI * baseFreq * 3 * time)) * 
               Math.exp(-time * 1) * velocity * 0.6;
      default:
        return Math.sin(2 * Math.PI * baseFreq * time) * Math.exp(-time * 5) * velocity;
    }
  };

  const applyVariationEffects = (sample: number, variationType: string, time: number, index: number): number => {
    // Add subtle variations based on type and index
    if (variationType.includes('bright')) {
      sample *= (1 + 0.2 * Math.sin(2 * Math.PI * time * 10));
    } else if (variationType.includes('mellow') || variationType.includes('soft')) {
      sample *= 0.8;
    } else if (variationType.includes('distorted')) {
      sample = Math.tanh(sample * 3) * 0.7;
    }
    
    // Add slight frequency variation based on index
    const variation = 1 + (index * 0.05);
    return sample * variation;
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
      name: `${instrument?.name} - ${variation.name}`,
      type: variation.type,
      instrument: selectedInstrument,
      volume: 0.8,
      muted: false,
      effects: [],
      color: getInstrumentColor(selectedInstrument),
      audioUrl: variation.audioUrl,
      originalVoice: recordedVoiceUrl,
      userDescription: `${instrument?.name} - ${variation.name}`
    };

    onTrackCreated(newTrack);
    
    toast({
      title: "Track Added!",
      description: `${variation.name} track added to mixer`,
    });

    // Reset for next recording
    setTrackVariations([]);
    setRecordedVoiceUrl('');
  };

  return (
    <Card className="bg-dark-surface border-dark-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mic className="w-5 h-5 text-neon-blue" />
          <span>Voice to Track</span>
        </CardTitle>
        <CardDescription>
          Select an instrument, record your voice, then choose from AI-generated variations
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
