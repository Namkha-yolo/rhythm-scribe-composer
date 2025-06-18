
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, Square, Play, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceTrackRecorderProps {
  onTrackCreated: (track: any) => void;
}

const VoiceTrackRecorder = ({ onTrackCreated }: VoiceTrackRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { toast } = useToast();

  const instruments = [
    { value: 'drums', label: 'Drums (boom, bap, tss)' },
    { value: 'guitar', label: 'Guitar (strum, pick)' },
    { value: 'bass', label: 'Bass (thump, wobble)' },
    { value: '808', label: '808 (sub bass)' },
    { value: 'synth', label: 'Synth (beep, woosh)' },
    { value: 'vocal', label: 'Vocal (melody, harmony)' }
  ];

  const startRecording = async () => {
    if (!selectedInstrument) {
      toast({
        title: "Select Instrument",
        description: "Choose which instrument you're mimicking",
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
        await processVoiceToTrack(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      toast({
        title: "Recording Started",
        description: `Make ${selectedInstrument} sounds with your voice`,
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

  const processVoiceToTrack = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Convert to base64 for API
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Create a prompt for voice-to-instrument conversion
      const prompt = `
      Analyze this voice recording where someone is mimicking a ${selectedInstrument} instrument.
      Extract the rhythm pattern, timing, and convert the vocal sounds to ${selectedInstrument} sounds.
      
      Generate parameters for creating a ${selectedInstrument} track that matches this vocal pattern:
      - Timing of each sound/note
      - Intensity/velocity
      - Pitch information (if applicable)
      - Rhythm pattern
      
      Return a JSON object with this structure:
      {
        "instrument": "${selectedInstrument}",
        "pattern": [
          {"time": 0.1, "sound": "kick", "velocity": 0.8},
          {"time": 0.5, "sound": "snare", "velocity": 0.6}
        ],
        "bpm": 120,
        "key": "C",
        "duration": 4
      }

      Audio data (base64): ${base64Audio.substring(0, 1000)}...
      `;

      // Call Rilla API to process the voice
      const response = await fetch('https://litellm.rillavoice.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-rilla-vibes'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet',
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json();
      const analysisText = data.choices[0].message.content;
      
      // Extract JSON from response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      let trackParams;
      
      if (jsonMatch) {
        trackParams = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback params
        trackParams = {
          instrument: selectedInstrument,
          pattern: [
            {"time": 0.1, "sound": "hit", "velocity": 0.8},
            {"time": 0.5, "sound": "hit", "velocity": 0.6}
          ],
          bpm: 120,
          key: "C",
          duration: 4
        };
      }

      // Create track object
      const newTrack = {
        id: Date.now(),
        name: `${selectedInstrument.charAt(0).toUpperCase() + selectedInstrument.slice(1)} Track`,
        type: selectedInstrument,
        params: trackParams,
        volume: 0.8,
        muted: false,
        effects: [],
        color: getInstrumentColor(selectedInstrument),
        audioUrl: URL.createObjectURL(audioBlob) // Store original voice recording
      };

      onTrackCreated(newTrack);
      
      toast({
        title: "Track Created!",
        description: `${selectedInstrument} track generated from your voice`,
      });
    } catch (error) {
      console.error('Voice processing error:', error);
      toast({
        title: "Processing Error",
        description: "Could not convert voice to track",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getInstrumentColor = (instrument: string): string => {
    const colors = {
      drums: "from-red-500 to-red-600",
      guitar: "from-orange-500 to-orange-600",
      bass: "from-purple-500 to-purple-600",
      '808': "from-blue-500 to-blue-600",
      synth: "from-green-500 to-green-600",
      vocal: "from-pink-500 to-pink-600"
    };
    return colors[instrument as keyof typeof colors] || "from-gray-500 to-gray-600";
  };

  return (
    <Card className="bg-dark-surface border-dark-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mic className="w-5 h-5 text-neon-blue" />
          <span>Voice to Track</span>
        </CardTitle>
        <CardDescription>
          Record yourself mimicking instrument sounds
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Instrument Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            What instrument are you mimicking?
          </label>
          <Select value={selectedInstrument} onValueChange={setSelectedInstrument}>
            <SelectTrigger className="bg-muted/20 border-dark-border">
              <SelectValue placeholder="Choose an instrument" />
            </SelectTrigger>
            <SelectContent>
              {instruments.map((instrument) => (
                <SelectItem key={instrument.value} value={instrument.value}>
                  {instrument.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Recording Control */}
        <div className="flex items-center justify-center">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing || !selectedInstrument}
            className={`w-20 h-20 rounded-full ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-gradient-to-r from-neon-blue to-neon-purple hover:shadow-lg'
            }`}
          >
            {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </Button>
        </div>

        {/* Status */}
        {isRecording && (
          <p className="text-center text-sm text-neon-blue animate-pulse">
            Recording... Make {selectedInstrument} sounds!
          </p>
        )}
        
        {isProcessing && (
          <div className="text-center space-y-2">
            <div className="w-6 h-6 border-2 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-neon-blue">
              Converting voice to {selectedInstrument} track...
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-muted/10 p-3 rounded-lg border border-dark-border">
          <p className="text-xs text-gray-400 mb-2">Voice examples:</p>
          <div className="text-xs space-y-1">
            <p className="text-gray-300">• Drums: "boom bap boom boom bap"</p>
            <p className="text-gray-300">• Guitar: "strum strum pick pick"</p>
            <p className="text-gray-300">• Bass: "thump wobble thump"</p>
            <p className="text-gray-300">• 808: "sub bass womp womp"</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceTrackRecorder;
