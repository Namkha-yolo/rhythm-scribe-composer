
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume2, VolumeX, Mic, Wand2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Track {
  id: number;
  name: string;
  type: string;
  params: any;
  volume: number;
  muted: boolean;
  effects: string[];
  color: string;
  audioUrl?: string;
}

interface EnhancedTrackMixerProps {
  tracks: Track[];
  onTracksUpdated: (tracks: Track[]) => void;
}

const EnhancedTrackMixer = ({ tracks, onTracksUpdated }: EnhancedTrackMixerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [isRecordingEffects, setIsRecordingEffects] = useState(false);
  const [selectedTrackForEffects, setSelectedTrackForEffects] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { toast } = useToast();

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    
    if (!isPlaying) {
      toast({
        title: "Playback Started",
        description: "Playing all tracks",
      });
    }
  };

  const updateTrackVolume = (trackId: number, volume: number) => {
    const updatedTracks = tracks.map(track =>
      track.id === trackId ? { ...track, volume: volume / 100 } : track
    );
    onTracksUpdated(updatedTracks);
  };

  const toggleTrackMute = (trackId: number) => {
    const updatedTracks = tracks.map(track =>
      track.id === trackId ? { ...track, muted: !track.muted } : track
    );
    onTracksUpdated(updatedTracks);
  };

  const startEffectsRecording = async (trackId: number) => {
    setSelectedTrackForEffects(trackId);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        await processEffectsCommand(audioBlob, trackId);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecordingEffects(true);
      
      const track = tracks.find(t => t.id === trackId);
      toast({
        title: "Recording Effects Command",
        description: `Say what effects to add to ${track?.name}`,
      });
    } catch (error) {
      console.error('Error starting effects recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopEffectsRecording = () => {
    if (mediaRecorderRef.current && isRecordingEffects) {
      mediaRecorderRef.current.stop();
      setIsRecordingEffects(false);
      setSelectedTrackForEffects(null);
    }
  };

  const processEffectsCommand = async (audioBlob: Blob, trackId: number) => {
    try {
      // Convert to base64 for API
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const track = tracks.find(t => t.id === trackId);
      const prompt = `
      Transcribe this voice command about adding audio effects to a ${track?.type} track.
      The user is describing what effects they want to add (reverb, delay, distortion, chorus, etc.)
      
      Extract the effects mentioned and return a JSON array of effect names.
      Common effects: reverb, delay, chorus, distortion, compression, eq, filter, phaser, flanger
      
      Return only a JSON array like: ["reverb", "delay", "compression"]
      
      Audio data (base64): ${base64Audio.substring(0, 1000)}...
      `;

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
      const responseText = data.choices[0].message.content;
      
      // Extract JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
      let newEffects: string[] = [];
      
      if (jsonMatch) {
        newEffects = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback - try to extract effect names from text
        const commonEffects = ['reverb', 'delay', 'chorus', 'distortion', 'compression', 'eq', 'filter'];
        newEffects = commonEffects.filter(effect => 
          responseText.toLowerCase().includes(effect)
        );
      }

      if (newEffects.length > 0) {
        const updatedTracks = tracks.map(track =>
          track.id === trackId 
            ? { ...track, effects: [...track.effects, ...newEffects] }
            : track
        );
        onTracksUpdated(updatedTracks);
        
        toast({
          title: "Effects Added!",
          description: `Added: ${newEffects.join(', ')}`,
        });
      } else {
        toast({
          title: "No Effects Detected",
          description: "Try saying 'add reverb' or 'add delay'",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Effects processing error:', error);
      toast({
        title: "Processing Error",
        description: "Could not process effects command",
        variant: "destructive",
      });
    }
  };

  const removeEffect = (trackId: number, effectToRemove: string) => {
    const updatedTracks = tracks.map(track =>
      track.id === trackId 
        ? { ...track, effects: track.effects.filter(effect => effect !== effectToRemove) }
        : track
    );
    onTracksUpdated(updatedTracks);
  };

  const playOriginalVoice = (track: Track) => {
    if (track.audioUrl) {
      const audio = new Audio(track.audioUrl);
      audio.play();
      toast({
        title: "Playing Original Voice",
        description: `Playing your ${track.type} recording`,
      });
    }
  };

  if (tracks.length === 0) {
    return (
      <Card className="bg-dark-surface border-dark-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Volume2 className="w-5 h-5 text-neon-green" />
            <span>Track Mixer</span>
          </CardTitle>
          <CardDescription>
            Your voice-generated tracks will appear here
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <Volume2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No tracks created yet</p>
            <p className="text-sm">Record your voice to create tracks</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-dark-surface border-dark-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Volume2 className="w-5 h-5 text-neon-green" />
          <span>Track Mixer</span>
        </CardTitle>
        <CardDescription>
          Mix your voice-generated tracks and add effects
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Master Controls */}
        <div className="space-y-4 p-4 bg-muted/20 rounded-lg border border-dark-border">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-200">Master Controls</h4>
            <Button
              onClick={togglePlayback}
              className={`w-12 h-12 rounded-full ${
                isPlaying 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-gradient-to-r from-neon-green to-neon-blue hover:shadow-lg'
              }`}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Master Volume</span>
              <span className="text-neon-green">{Math.round(masterVolume * 100)}%</span>
            </div>
            <Slider
              value={[masterVolume * 100]}
              onValueChange={(value) => setMasterVolume(value[0] / 100)}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        {/* Individual Tracks */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-200">Voice-Generated Tracks</h4>
          
          {tracks.map((track) => (
            <div
              key={track.id}
              className="p-4 bg-muted/10 rounded-lg border border-dark-border space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${track.color}`} />
                  <span className="font-medium text-gray-200">{track.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {track.type}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-2">
                  {track.audioUrl && (
                    <Button
                      onClick={() => playOriginalVoice(track)}
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-neon-purple"
                      title="Play original voice recording"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => toggleTrackMute(track.id)}
                    variant="ghost"
                    size="sm"
                    className={track.muted ? "text-red-400" : "text-gray-400"}
                  >
                    {track.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Effects */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Effects:</span>
                  <Button
                    onClick={
                      isRecordingEffects && selectedTrackForEffects === track.id
                        ? stopEffectsRecording
                        : () => startEffectsRecording(track.id)
                    }
                    variant="ghost"
                    size="sm"
                    className={`text-xs ${
                      isRecordingEffects && selectedTrackForEffects === track.id
                        ? 'text-red-400 animate-pulse'
                        : 'text-neon-blue hover:text-neon-purple'
                    }`}
                  >
                    <Mic className="w-3 h-3 mr-1" />
                    {isRecordingEffects && selectedTrackForEffects === track.id ? 'Stop' : 'Add Effects'}
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {track.effects.length > 0 ? (
                    track.effects.map((effect, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs cursor-pointer hover:bg-red-500/20"
                        onClick={() => removeEffect(track.id, effect)}
                      >
                        {effect} ×
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500">No effects</span>
                  )}
                </div>
              </div>
              
              {/* Volume Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Volume</span>
                  <span className="text-gray-300">{Math.round(track.volume * 100)}%</span>
                </div>
                <Slider
                  value={[track.volume * 100]}
                  onValueChange={(value) => updateTrackVolume(track.id, value[0])}
                  max={100}
                  step={1}
                  disabled={track.muted}
                  className="w-full"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        {isRecordingEffects && (
          <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20">
            <p className="text-sm text-red-400 text-center">
              🎤 Say effects to add: "add reverb and delay" or "put some distortion on this"
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedTrackMixer;
