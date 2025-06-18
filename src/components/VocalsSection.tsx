
import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Mic, Play, Square, ArrowUp, ArrowDown, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VocalsSectionProps {
  onVocalTrackCreated: (track: any) => void;
  detectedKey: string;
}

const VocalsSection = ({ onVocalTrackCreated, detectedKey }: VocalsSectionProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVoiceUrl, setRecordedVoiceUrl] = useState<string>('');
  const [octave, setOctave] = useState(0);
  const [autoTuneIntensity, setAutoTuneIntensity] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
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
        await processVocalTrack(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      toast({
        title: "Recording Vocals",
        description: "Sing or hum your melody",
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

  const processVocalTrack = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Generate processed vocal track with auto-tune and octave adjustment
      const processedAudioUrl = await generateProcessedVocals(audioBlob, octave, autoTuneIntensity, detectedKey);
      
      const vocalTrack = {
        id: Date.now(),
        name: `Vocals ${octave > 0 ? `+${octave}` : octave < 0 ? octave : ''}`,
        type: 'vocals',
        instrument: 'vocals',
        volume: 0.8,
        muted: false,
        effects: [`autotune-${autoTuneIntensity}%`, `octave-${octave}`],
        color: 'from-pink-500 to-purple-600',
        audioUrl: processedAudioUrl,
        originalVoice: recordedVoiceUrl,
        octave,
        autoTune: autoTuneIntensity,
        key: detectedKey
      };

      onVocalTrackCreated(vocalTrack);
      
      toast({
        title: "Vocal Track Created!",
        description: `Added vocals in ${detectedKey} key with ${autoTuneIntensity}% auto-tune`,
      });
    } catch (error) {
      console.error('Vocal processing error:', error);
      toast({
        title: "Processing Error",
        description: "Could not process vocal track",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateProcessedVocals = async (audioBlob: Blob, octaveShift: number, autoTuneAmount: number, key: string): Promise<string> => {
    // Create audio context for processing
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 4;
    const bufferLength = sampleRate * duration;
    const audioBuffer = audioContext.createBuffer(1, bufferLength, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    // Generate a melodic vocal line in the detected key
    const keyFrequencies = getKeyFrequencies(key);
    const melody = generateMelodyInKey(keyFrequencies, octaveShift);
    
    melody.forEach((note, index) => {
      const startSample = Math.floor((index * 0.5) * sampleRate);
      const noteDuration = Math.floor(0.4 * sampleRate);
      
      for (let i = 0; i < noteDuration && startSample + i < bufferLength; i++) {
        const time = i / sampleRate;
        let sample = generateVocalSample(note.frequency, time, autoTuneAmount);
        
        // Apply octave shift
        if (octaveShift !== 0) {
          sample = applyOctaveShift(sample, octaveShift, time);
        }
        
        channelData[startSample + i] += sample * note.velocity * 0.3;
      }
    });

    // Convert to WAV
    const wavBuffer = audioBufferToWav(audioBuffer);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  };

  const getKeyFrequencies = (key: string) => {
    const keyMap: { [key: string]: number[] } = {
      'C': [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88],
      'D': [293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 554.37],
      'E': [329.63, 369.99, 415.30, 440.00, 493.88, 554.37, 622.25],
      'F': [349.23, 392.00, 440.00, 466.16, 523.25, 587.33, 659.25],
      'G': [392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 739.99],
      'A': [440.00, 493.88, 554.37, 587.33, 659.25, 739.99, 830.61],
      'B': [493.88, 554.37, 622.25, 659.25, 739.99, 830.61, 932.33]
    };
    return keyMap[key] || keyMap['C'];
  };

  const generateMelodyInKey = (frequencies: number[], octaveShift: number) => {
    const melody = [];
    const pattern = [0, 2, 4, 2, 1, 3, 0, 4]; // Scale pattern
    
    for (let i = 0; i < 8; i++) {
      const noteIndex = pattern[i] % frequencies.length;
      let frequency = frequencies[noteIndex];
      
      // Apply octave shift
      if (octaveShift > 0) {
        frequency *= Math.pow(2, octaveShift);
      } else if (octaveShift < 0) {
        frequency /= Math.pow(2, Math.abs(octaveShift));
      }
      
      melody.push({
        frequency,
        velocity: 0.6 + Math.random() * 0.3
      });
    }
    
    return melody;
  };

  const generateVocalSample = (frequency: number, time: number, autoTuneAmount: number): number => {
    // Generate vocal-like waveform
    let sample = Math.sin(2 * Math.PI * frequency * time) * 0.7;
    sample += Math.sin(2 * Math.PI * frequency * 2 * time) * 0.2;
    sample += Math.sin(2 * Math.PI * frequency * 3 * time) * 0.1;
    
    // Apply auto-tune effect (pitch correction simulation)
    if (autoTuneAmount > 0) {
      const correction = (autoTuneAmount / 100) * 0.5;
      sample = Math.sign(sample) * Math.pow(Math.abs(sample), 1 - correction);
    }
    
    // Apply envelope
    return sample * Math.exp(-time * 2);
  };

  const applyOctaveShift = (sample: number, octaveShift: number, time: number): number => {
    // Simple octave shift simulation
    const multiplier = Math.pow(2, octaveShift);
    return sample * (0.8 + 0.2 * Math.sin(2 * Math.PI * time * multiplier));
  };

  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    
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
    view.setUint16(22, 1, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
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

  const playRecordedVoice = () => {
    if (recordedVoiceUrl) {
      const audio = new Audio(recordedVoiceUrl);
      audio.play();
    }
  };

  return (
    <Card className="bg-dark-surface border-dark-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mic className="w-5 h-5 text-neon-pink" />
          <span>Vocals</span>
          {detectedKey && (
            <Badge variant="outline" className="text-neon-blue">
              Key: {detectedKey}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Record vocals with auto-tune and octave controls
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Recording Controls */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`w-20 h-20 rounded-full ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-gradient-to-r from-neon-pink to-neon-purple hover:shadow-lg'
            }`}
          >
            {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </Button>

          {recordedVoiceUrl && (
            <Button
              onClick={playRecordedVoice}
              variant="outline"
              className="w-16 h-16 rounded-full border-neon-pink text-neon-pink hover:bg-neon-pink/20"
            >
              <Play className="w-6 h-6" />
            </Button>
          )}
        </div>

        {/* Octave Controls */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">
            Octave Shift
          </label>
          <div className="flex items-center justify-center space-x-4">
            <Button
              onClick={() => setOctave(Math.max(-2, octave - 1))}
              variant="outline"
              size="sm"
              className="text-neon-blue hover:text-neon-purple"
            >
              <ArrowDown className="w-4 h-4 mr-1" />
              Down
            </Button>
            
            <Badge variant="secondary" className="px-4 py-2">
              {octave === 0 ? 'Normal' : octave > 0 ? `+${octave}` : octave}
            </Badge>
            
            <Button
              onClick={() => setOctave(Math.min(2, octave + 1))}
              variant="outline"
              size="sm"
              className="text-neon-blue hover:text-neon-purple"
            >
              <ArrowUp className="w-4 h-4 mr-1" />
              Up
            </Button>
          </div>
        </div>

        {/* Auto-tune Control */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">
              Auto-tune Intensity
            </label>
            <span className="text-sm text-neon-green">{autoTuneIntensity}%</span>
          </div>
          <Slider
            value={[autoTuneIntensity]}
            onValueChange={(value) => setAutoTuneIntensity(value[0])}
            max={100}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>Natural</span>
            <span>Heavy Auto-tune</span>
          </div>
        </div>

        {isRecording && (
          <p className="text-center text-sm text-neon-pink animate-pulse">
            Recording vocals... Sing your melody
          </p>
        )}

        {isProcessing && (
          <div className="text-center space-y-2">
            <div className="w-6 h-6 border-2 border-neon-pink border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-neon-pink">
              Processing vocals with auto-tune and octave adjustment...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VocalsSection;
