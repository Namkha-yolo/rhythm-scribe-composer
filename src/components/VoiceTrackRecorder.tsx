
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Mic, Square, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceTrackRecorderProps {
  onTrackCreated: (track: any) => void;
}

const VoiceTrackRecorder = ({ onTrackCreated }: VoiceTrackRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [instrumentDescription, setInstrumentDescription] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordedVoiceUrl, setRecordedVoiceUrl] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    if (!instrumentDescription.trim()) {
      toast({
        title: "Describe the instrument",
        description: "Tell us what instrument you're mimicking (e.g., 'heavy kick drum', 'electric guitar', 'deep bass')",
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
        description: `Make sounds like: ${instrumentDescription}`,
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
      // Convert to base64 for AI analysis
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Let AI analyze the voice and determine the best instrument match
      const analysisPrompt = `
      I have a voice recording where someone is trying to mimic: "${instrumentDescription}"
      
      Analyze this voice recording and:
      1. Determine the exact type of instrument this sounds like
      2. Extract the rhythm, timing, and pattern
      3. Identify the pitch characteristics
      4. Generate parameters to create authentic ${instrumentDescription} sounds
      
      Return a detailed JSON object:
      {
        "detectedInstrument": "kick_drum",
        "instrumentFamily": "drums",
        "characteristics": {
          "pitch": "low",
          "tone": "punchy",
          "attack": "sharp",
          "sustain": "short"
        },
        "rhythm": {
          "pattern": [
            {"time": 0.0, "velocity": 0.8, "duration": 0.2},
            {"time": 0.5, "velocity": 0.6, "duration": 0.1}
          ],
          "bpm": 120,
          "timeSignature": "4/4"
        },
        "soundGeneration": {
          "baseFrequency": 60,
          "harmonics": [1.0, 0.5, 0.25],
          "envelope": {
            "attack": 0.01,
            "decay": 0.1,
            "sustain": 0.3,
            "release": 0.5
          },
          "effects": ["compression", "eq"]
        },
        "trackName": "Heavy Kick Drum Track",
        "confidence": 0.9
      }

      Voice description: "${instrumentDescription}"
      Audio data sample: ${base64Audio.substring(0, 500)}
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
        // Fallback params based on user description
        trackParams = generateFallbackParams(instrumentDescription);
      }

      // Generate the actual audio
      const generatedAudioUrl = await generateInstrumentAudio(trackParams);

      // Create track object
      const newTrack = {
        id: Date.now(),
        name: trackParams.trackName || `${instrumentDescription} Track`,
        type: trackParams.instrumentFamily || 'unknown',
        instrument: trackParams.detectedInstrument || 'custom',
        params: trackParams,
        volume: 0.8,
        muted: false,
        effects: trackParams.soundGeneration?.effects || [],
        color: getInstrumentColor(trackParams.instrumentFamily || 'unknown'),
        audioUrl: generatedAudioUrl,
        originalVoice: recordedVoiceUrl,
        userDescription: instrumentDescription
      };

      onTrackCreated(newTrack);
      
      toast({
        title: "Track Created!",
        description: `${trackParams.detectedInstrument || instrumentDescription} track generated from your voice`,
      });
    } catch (error) {
      console.error('Voice processing error:', error);
      toast({
        title: "Processing Error",
        description: "Could not convert voice to track. Try describing the instrument more specifically.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateFallbackParams = (description: string) => {
    const lowerDesc = description.toLowerCase();
    
    // Determine instrument type from description
    let instrumentFamily = 'unknown';
    let detectedInstrument = 'custom';
    let baseFreq = 440;
    
    if (lowerDesc.includes('drum') || lowerDesc.includes('kick') || lowerDesc.includes('snare') || lowerDesc.includes('hi-hat') || lowerDesc.includes('cymbal')) {
      instrumentFamily = 'drums';
      if (lowerDesc.includes('kick')) {
        detectedInstrument = 'kick_drum';
        baseFreq = 60;
      } else if (lowerDesc.includes('snare')) {
        detectedInstrument = 'snare_drum';
        baseFreq = 200;
      } else if (lowerDesc.includes('hi-hat') || lowerDesc.includes('hihat')) {
        detectedInstrument = 'hi_hat';
        baseFreq = 8000;
      }
    } else if (lowerDesc.includes('guitar')) {
      instrumentFamily = 'guitar';
      detectedInstrument = lowerDesc.includes('electric') ? 'electric_guitar' : 'acoustic_guitar';
      baseFreq = 220;
    } else if (lowerDesc.includes('bass')) {
      instrumentFamily = 'bass';
      detectedInstrument = lowerDesc.includes('808') ? '808_bass' : 'bass_guitar';
      baseFreq = 80;
    } else if (lowerDesc.includes('piano') || lowerDesc.includes('key')) {
      instrumentFamily = 'keys';
      detectedInstrument = 'piano';
      baseFreq = 440;
    } else if (lowerDesc.includes('synth')) {
      instrumentFamily = 'synth';
      detectedInstrument = 'synth_lead';
      baseFreq = 440;
    }

    return {
      detectedInstrument,
      instrumentFamily,
      characteristics: {
        pitch: baseFreq < 200 ? 'low' : baseFreq > 1000 ? 'high' : 'mid',
        tone: 'warm',
        attack: 'medium',
        sustain: 'medium'
      },
      rhythm: {
        pattern: [
          {"time": 0.0, "velocity": 0.8, "duration": 0.3},
          {"time": 0.5, "velocity": 0.6, "duration": 0.3},
          {"time": 1.0, "velocity": 0.7, "duration": 0.3}
        ],
        bpm: 120,
        timeSignature: "4/4"
      },
      soundGeneration: {
        baseFrequency: baseFreq,
        harmonics: [1.0, 0.5, 0.25],
        envelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.3,
          release: 0.5
        },
        effects: ['compression']
      },
      trackName: `${description} Track`,
      confidence: 0.7
    };
  };

  const generateInstrumentAudio = async (params: any): Promise<string> => {
    // Generate audio using Web Audio API based on AI-determined parameters
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 4; // 4 seconds
    const bufferLength = sampleRate * duration;
    const audioBuffer = audioContext.createBuffer(1, bufferLength, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    const soundGen = params.soundGeneration || {};
    const baseFreq = soundGen.baseFrequency || 440;
    const envelope = soundGen.envelope || { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.5 };

    // Generate sounds based on the rhythm pattern
    params.rhythm.pattern.forEach((beat: any) => {
      const startSample = Math.floor(beat.time * sampleRate);
      const beatDuration = Math.floor((beat.duration || 0.3) * sampleRate);
      
      for (let i = 0; i < beatDuration && startSample + i < bufferLength; i++) {
        const time = i / sampleRate;
        let sample = 0;

        // Generate different sounds based on detected instrument
        switch (params.detectedInstrument) {
          case 'kick_drum':
            sample = Math.sin(2 * Math.PI * baseFreq * time) * Math.exp(-time * 20) * beat.velocity;
            break;
          case 'snare_drum':
            sample = (Math.random() * 2 - 1) * Math.exp(-time * 15) * beat.velocity * 0.4;
            break;
          case 'hi_hat':
            sample = (Math.random() * 2 - 1) * Math.exp(-time * 40) * beat.velocity * 0.2;
            break;
          case 'electric_guitar':
          case 'acoustic_guitar':
            sample = (Math.sin(2 * Math.PI * baseFreq * time) + 
                     0.5 * Math.sin(2 * Math.PI * baseFreq * 2 * time) +
                     0.25 * Math.sin(2 * Math.PI * baseFreq * 3 * time)) * 
                     Math.exp(-time * 8) * beat.velocity * 0.3;
            break;
          case 'bass_guitar':
          case '808_bass':
            sample = Math.sin(2 * Math.PI * baseFreq * time) * Math.exp(-time * 4) * beat.velocity;
            break;
          case 'synth_lead':
            sample = Math.sin(2 * Math.PI * baseFreq * time) * Math.exp(-time * 6) * beat.velocity;
            break;
          default:
            // Generic oscillator
            sample = Math.sin(2 * Math.PI * baseFreq * time) * Math.exp(-time * 5) * beat.velocity;
        }

        // Apply envelope
        const envelopeValue = calculateEnvelope(time, envelope, beat.duration || 0.3);
        channelData[startSample + i] += sample * envelopeValue * 0.5;
      }
    });

    // Convert to WAV and return URL
    const wavBuffer = audioBufferToWav(audioBuffer);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  };

  const calculateEnvelope = (time: number, envelope: any, duration: number): number => {
    const { attack, decay, sustain, release } = envelope;
    const totalTime = duration;
    
    if (time < attack) {
      return time / attack;
    } else if (time < attack + decay) {
      return 1 - (1 - sustain) * ((time - attack) / decay);
    } else if (time < totalTime - release) {
      return sustain;
    } else {
      return sustain * (totalTime - time) / release;
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

  const getInstrumentColor = (instrument: string): string => {
    const colors = {
      drums: "from-red-500 to-red-600",
      guitar: "from-orange-500 to-orange-600",
      bass: "from-purple-500 to-purple-600",
      keys: "from-blue-500 to-blue-600",
      synth: "from-green-500 to-green-600",
      vocal: "from-pink-500 to-pink-600",
      brass: "from-yellow-500 to-yellow-600",
      strings: "from-indigo-500 to-indigo-600"
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
          Describe any instrument, then record yourself mimicking it - AI will create the real sound
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Free-form Instrument Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            What instrument sound do you want to create?
          </label>
          <Input
            value={instrumentDescription}
            onChange={(e) => setInstrumentDescription(e.target.value)}
            placeholder="e.g., heavy kick drum, funky bass guitar, bright electric guitar, deep 808, smooth piano..."
            className="bg-muted/20 border-dark-border text-white placeholder:text-gray-400"
          />
          <p className="text-xs text-gray-400">
            Be specific! Try: "punchy snare drum", "distorted electric guitar", "warm piano chords", "booming 808 bass"
          </p>
        </div>

        {/* Recording Control */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing || !instrumentDescription.trim()}
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
            Recording... Make sounds like: {instrumentDescription}
          </p>
        )}
        
        {isProcessing && (
          <div className="text-center space-y-2">
            <div className="w-6 h-6 border-2 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-neon-blue">
              AI is analyzing your voice and creating {instrumentDescription} sounds...
            </p>
          </div>
        )}

        {recordedVoiceUrl && (
          <div className="text-center">
            <p className="text-xs text-green-400">
              ✓ Voice recorded! Click play button to hear your original voice.
            </p>
          </div>
        )}

        {/* Examples */}
        <div className="bg-muted/10 p-3 rounded-lg border border-dark-border">
          <p className="text-xs text-gray-400 mb-2">Example descriptions:</p>
          <div className="text-xs space-y-1">
            <p className="text-gray-300">• "heavy kick drum that booms"</p>
            <p className="text-gray-300">• "crisp snare with lots of snap"</p>
            <p className="text-gray-300">• "funky slap bass guitar"</p>
            <p className="text-gray-300">• "bright electric guitar chords"</p>
            <p className="text-gray-300">• "deep 808 sub bass"</p>
            <p className="text-gray-300">• "smooth jazz piano"</p>
            <p className="text-gray-300">• "analog synthesizer lead"</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceTrackRecorder;
