import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Mic, Square, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { transcribeVoice } from '@/services/rilla-api';

interface VoicePromptProps {
  onPromptRecorded: (prompt: string) => void;
  currentPrompt: string;
}

const VoicePrompt = ({ onPromptRecorded, currentPrompt }: VoicePromptProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { toast } = useToast();

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        await transcribeWithRilla(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      toast({
        title: "Voice Recording Started",
        description: "Describe the music style you want",
      });
    } catch (error) {
      console.error('Error starting voice recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeWithRilla = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    
    try {
      toast({
        title: "Rilla AI Transcribing",
        description: "Processing your voice with Claude...",
      });

      const transcription = await transcribeVoice(audioBlob);
      onPromptRecorded(transcription);
      
      toast({
        title: "Voice Transcribed by Rilla AI",
        description: "Your prompt has been processed by Claude",
      });
    } catch (error) {
      console.error('Rilla transcription error:', error);
      toast({
        title: "Transcription Error",
        description: "Could not process audio with Rilla AI",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <Card className="bg-dark-surface border-dark-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Volume2 className="w-5 h-5 text-neon-blue" />
          <span>Rilla AI Voice Transcription</span>
        </CardTitle>
        <CardDescription>
          Describe your music style - transcribed by Claude AI
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Voice Recording Control */}
        <div className="flex items-center justify-center">
          <Button
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            disabled={isTranscribing}
            className={`w-16 h-16 rounded-full ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-gradient-to-r from-neon-blue to-neon-purple hover:shadow-lg hover:shadow-neon-blue/25'
            }`}
          >
            {isRecording ? <Square className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>
        </div>

        {/* Status */}
        {isRecording && (
          <p className="text-center text-sm text-neon-blue animate-pulse">
            Recording... Describe your desired music style
          </p>
        )}
        
        {isTranscribing && (
          <div className="text-center space-y-2">
            <div className="w-6 h-6 border-2 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-neon-blue">
              Rilla AI (Claude) is transcribing your voice...
            </p>
          </div>
        )}

        {/* Text Prompt Display/Edit */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            Music Style Prompt (Rilla AI Enhanced):
          </label>
          <Textarea
            value={currentPrompt}
            onChange={(e) => onPromptRecorded(e.target.value)}
            placeholder="Describe the music style, instruments, mood, or genre you want..."
            className="bg-muted/20 border-dark-border text-white placeholder:text-gray-500 min-h-[100px]"
          />
        </div>

        {/* Example Prompts */}
        <div className="space-y-2">
          <p className="text-xs text-gray-400">Example prompts for Rilla AI:</p>
          <div className="flex flex-wrap gap-2">
            {[
              "Lo-fi hip hop with vinyl crackle and jazz chords",
              "Energetic rock with electric guitar and driving drums",
              "Ambient electronic with evolving synth pads",
              "Jazz fusion with saxophone and complex rhythms"
            ].map((example, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => onPromptRecorded(example)}
                className="text-xs border-dark-border hover:border-neon-blue text-gray-300 hover:text-white"
              >
                {example}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoicePrompt;
