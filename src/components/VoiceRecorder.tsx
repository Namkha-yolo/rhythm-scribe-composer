
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  recordedVoiceUrl?: string;
  disabled?: boolean;
}

const VoiceRecorder = ({ 
  isRecording, 
  onStartRecording, 
  onStopRecording, 
  recordedVoiceUrl,
  disabled 
}: VoiceRecorderProps) => {
  const { toast } = useToast();

  const playOriginalVoice = () => {
    if (recordedVoiceUrl) {
      const audio = new Audio(recordedVoiceUrl);
      audio.play();
      toast({
        title: "Playing Original Voice",
        description: "Playing your recorded voice",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center space-x-4">
        <Button
          onClick={isRecording ? onStopRecording : onStartRecording}
          disabled={disabled}
          className={`w-20 h-20 rounded-full ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-gradient-to-r from-neon-blue to-neon-purple hover:shadow-lg'
          }`}
        >
          {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
        </Button>

        {recordedVoiceUrl && (
          <Button
            onClick={playOriginalVoice}
            variant="outline"
            className="w-16 h-16 rounded-full border-neon-green text-neon-green hover:bg-neon-green/20"
          >
            <Play className="w-6 h-6" />
          </Button>
        )}
      </div>

      {isRecording && (
        <p className="text-center text-sm text-neon-blue animate-pulse">
          Recording... Hum, sing, or make instrument sounds
        </p>
      )}

      {recordedVoiceUrl && (
        <div className="text-center">
          <p className="text-xs text-green-400">
            ✓ Voice recorded! Click play button to hear your original voice.
          </p>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
