
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX, Download, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Track {
  id: number;
  name: string;
  type: string;
  url: string;
  volume: number;
  muted: boolean;
  color: string;
}

interface TrackMixerProps {
  tracks: Track[];
  onTracksUpdated: (tracks: Track[]) => void;
}

const TrackMixer = ({ tracks, onTracksUpdated }: TrackMixerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const { toast } = useToast();

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    
    if (!isPlaying) {
      toast({
        title: "Playback Started",
        description: "Playing all unmuted tracks",
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

  const downloadMix = () => {
    toast({
      title: "Download Started",
      description: "Rendering final mix...",
    });
    
    // Mock download process
    setTimeout(() => {
      toast({
        title: "Mix Ready",
        description: "Your track has been downloaded",
      });
    }, 2000);
  };

  const regenerateTrack = (trackId: number) => {
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      toast({
        title: "Regenerating Track",
        description: `Creating new ${track.type} track...`,
      });
      
      // Mock regeneration
      setTimeout(() => {
        toast({
          title: "Track Updated",
          description: `New ${track.type} track generated`,
        });
      }, 3000);
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
            Generated tracks will appear here for mixing
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <Volume2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No tracks generated yet</p>
            <p className="text-sm">Use the music generator to create tracks</p>
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
          Mix and control your generated tracks
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
                  : 'bg-gradient-to-r from-neon-green to-neon-blue hover:shadow-lg hover:shadow-neon-green/25'
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
          <h4 className="font-medium text-gray-200">Individual Tracks</h4>
          
          {tracks.map((track) => (
            <div
              key={track.id}
              className="p-4 bg-muted/10 rounded-lg border border-dark-border space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${track.color}`} />
                  <span className="font-medium text-gray-200">{track.name}</span>
                  <span className="text-xs text-gray-400 px-2 py-1 bg-muted/20 rounded">
                    {track.type}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => toggleTrackMute(track.id)}
                    variant="ghost"
                    size="sm"
                    className={track.muted ? "text-red-400" : "text-gray-400"}
                  >
                    {track.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  
                  <Button
                    onClick={() => regenerateTrack(track.id)}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-neon-blue"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
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

        {/* Export Controls */}
        <div className="pt-4 border-t border-dark-border">
          <Button
            onClick={downloadMix}
            className="w-full bg-gradient-to-r from-neon-green to-neon-blue hover:shadow-lg hover:shadow-neon-green/25"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Final Mix
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrackMixer;
