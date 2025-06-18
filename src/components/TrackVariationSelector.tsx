
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TrackVariation {
  id: string;
  name: string;
  type: string;
  audioUrl: string;
  confidence: number;
}

interface TrackVariationSelectorProps {
  variations: TrackVariation[];
  onSelectVariation: (variation: TrackVariation) => void;
  isGenerating: boolean;
}

const TrackVariationSelector = ({ variations, onSelectVariation, isGenerating }: TrackVariationSelectorProps) => {
  const { toast } = useToast();

  const playVariation = (variation: TrackVariation) => {
    if (variation.audioUrl) {
      const audio = new Audio(variation.audioUrl);
      audio.play();
      toast({
        title: "Playing Variation",
        description: `Playing ${variation.name}`,
      });
    }
  };

  if (isGenerating) {
    return (
      <div className="text-center space-y-2">
        <div className="w-6 h-6 border-2 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-neon-blue">
          AI is analyzing your voice and creating instrument variations...
        </p>
      </div>
    );
  }

  if (variations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-300">
        Choose Your Favorite Sound ({variations.length} variations generated)
      </h4>
      
      <div className="grid grid-cols-1 gap-2">
        {variations.map((variation) => (
          <div
            key={variation.id}
            className="flex items-center justify-between p-3 bg-muted/10 rounded-lg border border-dark-border hover:border-neon-blue/30 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="text-sm">
                <p className="font-medium text-gray-200">{variation.name}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {variation.type}
                  </Badge>
                  <span className="text-xs text-gray-400">
                    {Math.round(variation.confidence * 100)}% match
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => playVariation(variation)}
                variant="ghost"
                size="sm"
                className="text-neon-green hover:text-neon-blue"
              >
                <Play className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={() => onSelectVariation(variation)}
                size="sm"
                className="bg-gradient-to-r from-neon-green to-neon-blue hover:shadow-lg"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Track
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrackVariationSelector;
