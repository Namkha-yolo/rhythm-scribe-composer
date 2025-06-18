
import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BeatRecorderProps {
  onBeatsRecorded: (beats: { timestamps: number[], pitches: string[] }) => void;
  recordedBeats: { timestamps: number[], pitches: string[] };
}

const BeatRecorder = ({ onBeatsRecorded, recordedBeats }: BeatRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100 
        } 
      });
      
      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Set up media recorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        processAudioForBeats(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start audio level monitoring
      monitorAudioLevel();
      
      toast({
        title: "Recording Started",
        description: "Tap your mouth to create rhythm patterns",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  }, [isRecording]);

  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      setAudioLevel(average / 255);
      
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  }, []);

  const processAudioForBeats = async (audioBlob: Blob) => {
    // Simulate beat detection (in real app, this would use AWS Bedrock)
    const mockTimestamps = [0.5, 1.0, 1.5, 2.0, 2.5];
    const mockPitches = ['kick', 'snare', 'kick', 'snare', 'kick'];
    
    onBeatsRecorded({
      timestamps: mockTimestamps,
      pitches: mockPitches
    });

    toast({
      title: "Pattern Detected",
      description: `Found ${mockTimestamps.length} beats in your recording`,
    });
  };

  const clearRecording = () => {
    onBeatsRecorded({ timestamps: [], pitches: [] });
    toast({
      title: "Recording Cleared",
      description: "Ready to record a new pattern",
    });
  };

  return (
    <Card className="bg-dark-surface border-dark-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mic className="w-5 h-5 text-neon-green" />
          <span>Rhythm Recorder</span>
        </CardTitle>
        <CardDescription>
          Record mouth taps to create rhythm patterns
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Recording Controls */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-20 h-20 rounded-full text-lg font-bold transition-all duration-300 ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse-beat' 
                : 'bg-gradient-to-r from-neon-green to-neon-blue hover:shadow-lg hover:shadow-neon-green/25'
            }`}
          >
            {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </Button>
          
          {recordedBeats.timestamps.length > 0 && (
            <Button
              onClick={clearRecording}
              variant="outline"
              size="sm"
              className="border-dark-border hover:border-neon-green"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>

        {/* Audio Level Visualization */}
        {isRecording && (
          <div className="flex items-center justify-center space-x-1 h-16">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-2 bg-gradient-to-t from-neon-green to-neon-blue rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(10, (audioLevel * 100) + (Math.random() * 20))}%`,
                  opacity: audioLevel > 0.1 ? 1 : 0.3
                }}
              />
            ))}
          </div>
        )}

        {/* Beat Pattern Display */}
        {recordedBeats.timestamps.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-300">Detected Pattern:</h4>
            <div className="flex flex-wrap gap-2">
              {recordedBeats.timestamps.map((timestamp, index) => (
                <div
                  key={index}
                  className="px-3 py-1 bg-neon-green/20 border border-neon-green/30 rounded-full text-xs"
                >
                  {recordedBeats.pitches[index]} @ {timestamp.toFixed(1)}s
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BeatRecorder;
