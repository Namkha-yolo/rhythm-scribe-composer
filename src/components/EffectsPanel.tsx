
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Wand2, Volume2, Zap, Waves } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Effect {
  id: string;
  name: string;
  enabled: boolean;
  parameters: { [key: string]: number };
}

interface EffectsPanelProps {
  tracks: any[];
  onTracksUpdated: (tracks: any[]) => void;
}

const AVAILABLE_EFFECTS = [
  {
    id: 'reverb',
    name: 'Reverb',
    icon: Waves,
    parameters: {
      roomSize: 50,
      decay: 30,
      wetness: 25
    }
  },
  {
    id: 'delay',
    name: 'Delay',
    icon: Volume2,
    parameters: {
      time: 250,
      feedback: 30,
      mix: 20
    }
  },
  {
    id: 'chorus',
    name: 'Chorus',
    icon: Wand2,
    parameters: {
      rate: 50,
      depth: 40,
      mix: 35
    }
  },
  {
    id: 'distortion',
    name: 'Distortion',
    icon: Zap,
    parameters: {
      drive: 25,
      tone: 50,
      level: 70
    }
  }
];

const EffectsPanel = ({ tracks, onTracksUpdated }: EffectsPanelProps) => {
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const { toast } = useToast();

  const selectedTrack = tracks.find(track => track.id === selectedTrackId);

  const addEffect = (effectType: string) => {
    if (!selectedTrack) return;

    const effectDefinition = AVAILABLE_EFFECTS.find(e => e.id === effectType);
    if (!effectDefinition) return;

    const newEffect: Effect = {
      id: `${effectType}-${Date.now()}`,
      name: effectDefinition.name,
      enabled: true,
      parameters: { ...effectDefinition.parameters }
    };

    const updatedTracks = tracks.map(track =>
      track.id === selectedTrackId
        ? {
            ...track,
            effects: [...(track.effects || []), `${effectDefinition.name} (${Object.values(newEffect.parameters).join('/')})}`],
            audioEffects: [...(track.audioEffects || []), newEffect]
          }
        : track
    );

    onTracksUpdated(updatedTracks);
    
    toast({
      title: "Effect Added",
      description: `${effectDefinition.name} added to ${selectedTrack.name}`,
    });
  };

  const updateEffectParameter = (effectId: string, parameter: string, value: number) => {
    if (!selectedTrack) return;

    const updatedTracks = tracks.map(track =>
      track.id === selectedTrackId
        ? {
            ...track,
            audioEffects: (track.audioEffects || []).map((effect: Effect) =>
              effect.id === effectId
                ? { ...effect, parameters: { ...effect.parameters, [parameter]: value } }
                : effect
            )
          }
        : track
    );

    onTracksUpdated(updatedTracks);
  };

  const toggleEffect = (effectId: string) => {
    if (!selectedTrack) return;

    const updatedTracks = tracks.map(track =>
      track.id === selectedTrackId
        ? {
            ...track,
            audioEffects: (track.audioEffects || []).map((effect: Effect) =>
              effect.id === effectId
                ? { ...effect, enabled: !effect.enabled }
                : effect
            )
          }
        : track
    );

    onTracksUpdated(updatedTracks);
  };

  const removeEffect = (effectId: string) => {
    if (!selectedTrack) return;

    const updatedTracks = tracks.map(track =>
      track.id === selectedTrackId
        ? {
            ...track,
            audioEffects: (track.audioEffects || []).filter((effect: Effect) => effect.id !== effectId)
          }
        : track
    );

    onTracksUpdated(updatedTracks);
  };

  if (tracks.length === 0) {
    return (
      <Card className="bg-dark-surface border-dark-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wand2 className="w-5 h-5 text-neon-purple" />
            <span>Effects Panel</span>
          </CardTitle>
          <CardDescription>
            Add tracks to apply audio effects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-400">
            <Wand2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tracks available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-dark-surface border-dark-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Wand2 className="w-5 h-5 text-neon-purple" />
          <span>Effects Panel</span>
        </CardTitle>
        <CardDescription>
          Add and configure audio effects for your tracks
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Track Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">Select Track</label>
          <div className="grid grid-cols-1 gap-2">
            {tracks.map((track) => (
              <Button
                key={track.id}
                onClick={() => setSelectedTrackId(track.id)}
                variant={selectedTrackId === track.id ? "default" : "outline"}
                className={`justify-start ${
                  selectedTrackId === track.id 
                    ? 'bg-neon-purple text-white' 
                    : 'text-gray-300 hover:text-neon-purple'
                }`}
              >
                <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${track.color} mr-2`} />
                {track.name}
                {track.audioEffects?.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {track.audioEffects.length}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>

        {selectedTrack && (
          <>
            {/* Available Effects */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300">Add Effects</label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_EFFECTS.map((effect) => {
                  const Icon = effect.icon;
                  return (
                    <Button
                      key={effect.id}
                      onClick={() => addEffect(effect.id)}
                      variant="outline"
                      className="text-gray-300 hover:text-neon-purple hover:border-neon-purple"
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {effect.name}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Active Effects */}
            {selectedTrack.audioEffects && selectedTrack.audioEffects.length > 0 && (
              <div className="space-y-4">
                <label className="text-sm font-medium text-gray-300">Active Effects</label>
                
                {selectedTrack.audioEffects.map((effect: Effect) => (
                  <div
                    key={effect.id}
                    className="p-4 bg-muted/10 rounded-lg border border-dark-border space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Switch
                          checked={effect.enabled}
                          onCheckedChange={() => toggleEffect(effect.id)}
                        />
                        <span className="font-medium text-gray-200">{effect.name}</span>
                      </div>
                      
                      <Button
                        onClick={() => removeEffect(effect.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove
                      </Button>
                    </div>
                    
                    {effect.enabled && (
                      <div className="space-y-3">
                        {Object.entries(effect.parameters).map(([param, value]) => (
                          <div key={param} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-400 capitalize">
                                {param.replace(/([A-Z])/g, ' $1')}
                              </span>
                              <span className="text-neon-purple">{value}%</span>
                            </div>
                            <Slider
                              value={[value]}
                              onValueChange={(newValue) => 
                                updateEffectParameter(effect.id, param, newValue[0])
                              }
                              max={100}
                              step={1}
                              className="w-full"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EffectsPanel;
