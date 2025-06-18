
import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Mic, Play, Square, ArrowUp, ArrowDown, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { VoiceProcessor } from '@/services/audio-processing';

interface VocalsSectionProps {
  onVocalTrackCreated: (track: any) => void;
  detectedKey: string;
}

const VocalsSection = ({ onVocalTrackCreated, detectedKey }: VocalsSectionProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVoiceUrl, setRecordedVoiceUrl] = useState<string>('');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [octave, setOctave] = useState(0);
  const [autoTuneIntensity, setAutoTuneIntensity] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceProcessorRef = useRef<VoiceProcessor | null>(null);
  const { toast } = useToast();

  // Initialize voice processor
  if (!voiceProcessorRef.current) {
    voiceProcessorRef.current = new VoiceProcessor();
  }

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
        setRecordedBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      toast({
        title: "Recording Vocals",
        description: "Sing or hum your melody - your voice will be auto-tuned",
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

  const processVocalTrack = async () => {
    if (!recordedBlob || !voiceProcessorRef.current) {
      toast({
        title: "No Recording",
        description: "Please record your voice first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const keyToUse = detectedKey || 'C';
      
      toast({
        title: "Processing Voice",
        description: "Applying professional auto-tune with formant preservation...",
      });

      // Use the new professional voice processing system
      const processedAudioUrl = await voiceProcessorRef.current.processVoiceWithAutoTune(
        recordedBlob,
        keyToUse,
        autoTuneIntensity,
        octave
      );
      
      const vocalTrack = {
        id: Date.now(),
        name: `Pro Auto-tuned Vocals ${octave > 0 ? `+${octave}` : octave < 0 ? octave : ''}`,
        type: 'vocals',
        instrument: 'vocals',
        volume: 0.8,
        muted: false,
        effects: [`professional-autotune-${autoTuneIntensity}%`, `octave-${octave}`, `key-${keyToUse}`, 'formant-preserved'],
        color: 'from-pink-500 to-purple-600',
        audioUrl: processedAudioUrl,
        originalVoice: recordedVoiceUrl,
        octave,
        autoTune: autoTuneIntensity,
        key: keyToUse,
        audioEffects: ['compression', 'eq', 'chorus']
      };

      onVocalTrackCreated(vocalTrack);
      
      toast({
        title: "Professional Vocal Track Created!",
        description: `Added studio-quality auto-tuned vocals in ${keyToUse} key with formant preservation`,
      });
    } catch (error) {
      console.error('Professional vocal processing error:', error);
      toast({
        title: "Processing Error",
        description: "Could not process vocal track with professional system",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
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
          Record vocals with real auto-tune and octave controls
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

        {/* Process Button */}
        {recordedBlob && !isProcessing && (
          <Button
            onClick={processVocalTrack}
            className="w-full bg-gradient-to-r from-neon-green to-neon-blue hover:shadow-lg"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Process with Auto-tune
          </Button>
        )}

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
            <span>Natural Voice</span>
            <span>Heavy Auto-tune</span>
          </div>
        </div>

        {isRecording && (
          <p className="text-center text-sm text-neon-pink animate-pulse">
            Recording vocals... Your voice will be auto-tuned to {detectedKey || 'C'} key
          </p>
        )}

        {isProcessing && (
          <div className="text-center space-y-2">
            <div className="w-6 h-6 border-2 border-neon-pink border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-neon-pink">
              Processing your voice with real auto-tune...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VocalsSection;
