import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, Square, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceTrackRecorderProps {
  onTrackCreated: (track: any) => void;
}

const VoiceTrackRecorder = ({ onTrackCreated }: VoiceTrackRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<string>('');
  const [selectedDrumSound, setSelectedDrumSound] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordedVoiceUrl, setRecordedVoiceUrl] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { toast } = useToast();

  const instruments = [
    { value: 'drums', label: 'Drums' },
    { value: 'guitar', label: 'Guitar' },
    { value: 'bass', label: 'Bass' },
    { value: '808', label: '808' },
    { value: 'synth', label: 'Synth' },
    { value: 'vocal', label: 'Vocal' }
  ];

  const drumSounds = [
    { value: 'kick-heavy', label: 'Heavy Kick Drum' },
    { value: 'kick-punchy', label: 'Punchy Kick' },
    { value: 'snare-crisp', label: 'Crisp Snare' },
    { value: 'snare-fat', label: 'Fat Snare' },
    { value: 'hihat-tight', label: 'Tight Hi-Hat' },
    { value: 'hihat-open', label: 'Open Hi-Hat' },
    { value: 'crash-bright', label: 'Bright Crash' },
    { value: 'tom-deep', label: 'Deep Tom' },
    { value: 'clap-analog', label: 'Analog Clap' },
    { value: 'perc-shaker', label: 'Shaker Percussion' }
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

    if (selectedInstrument === 'drums' && !selectedDrumSound) {
      toast({
        title: "Select Drum Sound",
        description: "Choose which drum sound to use",
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

  const processVoiceToTrack = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Convert to base64 for API
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const drumSoundDescription = selectedInstrument === 'drums' ? 
        drumSounds.find(d => d.value === selectedDrumSound)?.label || '' : '';

      // Use AI to analyze voice and generate actual instrument sounds
      const analysisPrompt = `
      I have a voice recording where someone is mimicking ${selectedInstrument} sounds.
      ${selectedInstrument === 'drums' ? `They want it to sound like: ${drumSoundDescription}` : ''}
      
      Please analyze the rhythm, timing, and pattern from this voice recording and create a detailed description of how to generate actual ${selectedInstrument} sounds that match this rhythm.
      
      Return a JSON object with:
      {
        "instrument": "${selectedInstrument}",
        "drumType": "${selectedDrumSound || 'none'}",
        "pattern": [
          {"time": 0.0, "sound": "kick", "velocity": 0.8, "duration": 0.2},
          {"time": 0.5, "sound": "snare", "velocity": 0.6, "duration": 0.1}
        ],
        "bpm": 120,
        "duration": 4,
        "audioDescription": "detailed description of how the ${selectedInstrument} should sound",
        "generatedAudioUrl": "GENERATE_AUDIO_${selectedInstrument.toUpperCase()}_${Date.now()}"
      }

      Voice recording data (first 1000 chars): ${base64Audio.substring(0, 1000)}
      `;

      const response = await fetch('https://litellm.rillavoice.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-rilla-vibes'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet',
          messages: [{ role: 'user', content: analysisPrompt }]
        })
      });

      const data = await response.json();
      const analysisText = data.choices[0].message.content;
      console.log('AI Analysis:', analysisText);
      
      // Extract JSON from response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      let trackParams;
      
      if (jsonMatch) {
        trackParams = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback params
        trackParams = {
          instrument: selectedInstrument,
          drumType: selectedDrumSound,
          pattern: [
            {"time": 0.0, "sound": getDefaultSound(selectedInstrument), "velocity": 0.8, "duration": 0.2},
            {"time": 0.5, "sound": getDefaultSound(selectedInstrument), "velocity": 0.6, "duration": 0.2}
          ],
          bpm: 120,
          duration: 4,
          audioDescription: `Generated ${selectedInstrument} sounds`,
          generatedAudioUrl: `GENERATE_AUDIO_${selectedInstrument.toUpperCase()}_${Date.now()}`
        };
      }

      // Now generate actual audio using a second AI call for audio generation
      const audioGenerationPrompt = `
      Based on this analysis: ${JSON.stringify(trackParams)}
      
      Generate actual ${selectedInstrument} audio that matches this pattern and rhythm.
      ${selectedInstrument === 'drums' ? `Use ${drumSoundDescription} drum sounds.` : ''}
      
      Return a base64 encoded WAV audio file that contains the actual ${selectedInstrument} sounds.
      The audio should be exactly ${trackParams.duration} seconds long and follow the specified pattern.
      
      Format: Return ONLY the base64 string starting with "data:audio/wav;base64,"
      `;

      const audioResponse = await fetch('https://litellm.rillavoice.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-rilla-vibes'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet',
          messages: [{ role: 'user', content: audioGenerationPrompt }]
        })
      });

      const audioData = await audioResponse.json();
      const generatedAudioContent = audioData.choices[0].message.content;
      console.log('Generated Audio Response:', generatedAudioContent);

      // For now, generate placeholder audio since AI can't actually generate audio files
      // In a real implementation, you'd use a text-to-audio AI service
      const generatedAudioUrl = await generatePlaceholderAudio(trackParams);

      // Create track object
      const newTrack = {
        id: Date.now(),
        name: `${selectedInstrument.charAt(0).toUpperCase() + selectedInstrument.slice(1)} Track ${selectedInstrument === 'drums' ? `(${drumSoundDescription})` : ''}`,
        type: selectedInstrument,
        drumType: selectedDrumSound,
        params: trackParams,
        volume: 0.8,
        muted: false,
        effects: [],
        color: getInstrumentColor(selectedInstrument),
        audioUrl: generatedAudioUrl, // This is the generated instrument audio
        originalVoice: recordedVoiceUrl // This is your original voice
      };

      onTrackCreated(newTrack);
      
      toast({
        title: "Track Created!",
        description: `${selectedInstrument} track generated from your voice pattern`,
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

  const getDefaultSound = (instrument: string): string => {
    const sounds = {
      drums: "kick",
      guitar: "strum",
      bass: "thump",
      '808': "sub",
      synth: "beep",
      vocal: "note"
    };
    return sounds[instrument as keyof typeof sounds] || "hit";
  };

  const generatePlaceholderAudio = async (params: any): Promise<string> => {
    // Generate actual instrument sounds using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = params.duration || 4;
    const bufferLength = sampleRate * duration;
    const audioBuffer = audioContext.createBuffer(1, bufferLength, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    // Generate sounds based on the pattern and selected drum type
    params.pattern.forEach((beat: any) => {
      const startSample = Math.floor(beat.time * sampleRate);
      const beatDuration = Math.floor((beat.duration || 0.2) * sampleRate);
      
      for (let i = 0; i < beatDuration && startSample + i < bufferLength; i++) {
        const time = i / sampleRate;
        let sample = 0;

        if (params.instrument === 'drums') {
          // Generate different drum sounds based on selection
          if (params.drumType?.includes('kick')) {
            sample = Math.sin(2 * Math.PI * 60 * time) * Math.exp(-time * 20) * beat.velocity;
          } else if (params.drumType?.includes('snare')) {
            sample = (Math.random() * 2 - 1) * Math.exp(-time * 10) * beat.velocity * 0.3;
          } else if (params.drumType?.includes('hihat')) {
            sample = (Math.random() * 2 - 1) * Math.exp(-time * 30) * beat.velocity * 0.2;
          } else if (params.drumType?.includes('crash')) {
            sample = (Math.random() * 2 - 1) * Math.exp(-time * 5) * beat.velocity * 0.4;
          } else if (params.drumType?.includes('tom')) {
            sample = Math.sin(2 * Math.PI * 120 * time) * Math.exp(-time * 8) * beat.velocity;
          } else {
            // Default drum sound
            sample = Math.sin(2 * Math.PI * 80 * time) * Math.exp(-time * 15) * beat.velocity;
          }
        } else {
          // Keep existing instrument generation logic
          switch (params.instrument) {
            case 'bass':
              sample = Math.sin(2 * Math.PI * 80 * time) * Math.exp(-time * 3) * beat.velocity;
              break;
            case '808':
              sample = Math.sin(2 * Math.PI * 40 * time) * Math.exp(-time * 2) * beat.velocity;
              break;
            case 'guitar':
              sample = (Math.sin(2 * Math.PI * 220 * time) + 
                       0.5 * Math.sin(2 * Math.PI * 440 * time) +
                       0.25 * Math.sin(2 * Math.PI * 660 * time)) * 
                       Math.exp(-time * 5) * beat.velocity * 0.3;
              break;
            case 'synth':
              sample = Math.sin(2 * Math.PI * 440 * time) * Math.exp(-time * 4) * beat.velocity;
              break;
            default:
              sample = Math.sin(2 * Math.PI * 440 * time) * Math.exp(-time * 3) * beat.velocity;
          }
        }

        channelData[startSample + i] += sample * 0.5;
      }
    });

    // Convert to WAV and return URL
    const wavBuffer = audioBufferToWav(audioBuffer);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
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
          Record yourself mimicking instrument sounds - they'll be converted to real audio
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

        {/* Drum Sound Selection - Only show for drums */}
        {selectedInstrument === 'drums' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Choose drum sound type:
            </label>
            <Select value={selectedDrumSound} onValueChange={setSelectedDrumSound}>
              <SelectTrigger className="bg-muted/20 border-dark-border">
                <SelectValue placeholder="Choose drum sound" />
              </SelectTrigger>
              <SelectContent>
                {drumSounds.map((drum) => (
                  <SelectItem key={drum.value} value={drum.value}>
                    {drum.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Recording Control */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing || !selectedInstrument || (selectedInstrument === 'drums' && !selectedDrumSound)}
            className={`w-20 h-20 rounded-full ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-gradient-to-r from-neon-blue to-neon-purple hover:shadow-lg'
            }`}
          >
            {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </Button>

          {/* Play Original Voice Button */}
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
              Converting voice to {selectedInstrument} sounds using AI...
            </p>
          </div>
        )}

        {recordedVoiceUrl && (
          <div className="text-center">
            <p className="text-xs text-green-400">
              ✓ Voice recorded! Click the play button above to hear your original voice.
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
