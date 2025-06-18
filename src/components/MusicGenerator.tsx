
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Wand2, Music, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MusicGeneratorProps {
  beats: { timestamps: number[], pitches: string[] };
  prompt: string;
  onTracksGenerated: (tracks: any[]) => void;
}

const MusicGenerator = ({ beats, prompt, onTracksGenerated }: MusicGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const generateMusic = async () => {
    if (beats.timestamps.length === 0) {
      toast({
        title: "No Rhythm Pattern",
        description: "Please record a rhythm pattern first",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      // Simulate AI music generation process
      const steps = [
        "Analyzing rhythm pattern...",
        "Processing voice prompt...", 
        "Generating bass line...",
        "Creating drum track...",
        "Adding melody...",
        "Mixing tracks..."
      ];

      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setProgress((i + 1) / steps.length * 100);
        
        if (i < steps.length - 1) {
          toast({
            title: "Generating...",
            description: steps[i],
          });
        }
      }

      // Mock generated tracks
      const mockTracks = [
        {
          id: 1,
          name: "Bass Line",
          type: "bass",
          url: "/api/mock-audio/bass.wav",
          volume: 0.8,
          muted: false,
          color: "from-neon-green to-green-400"
        },
        {
          id: 2, 
          name: "Drum Kit",
          type: "drums",
          url: "/api/mock-audio/drums.wav", 
          volume: 0.9,
          muted: false,
          color: "from-neon-blue to-blue-400"
        },
        {
          id: 3,
          name: "Lead Melody",
          type: "melody", 
          url: "/api/mock-audio/melody.wav",
          volume: 0.7,
          muted: false,
          color: "from-neon-purple to-purple-400"
        },
        {
          id: 4,
          name: "Harmony",
          type: "harmony",
          url: "/api/mock-audio/harmony.wav",
          volume: 0.6, 
          muted: false,
          color: "from-neon-pink to-pink-400"
        }
      ];

      onTracksGenerated(mockTracks);
      
      toast({
        title: "Music Generated!",
        description: "Your tracks are ready to mix and play",
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Error", 
        description: "Could not generate music",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const canGenerate = beats.timestamps.length > 0 && prompt.trim().length > 0;

  return (
    <Card className="bg-dark-surface border-dark-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Wand2 className="w-5 h-5 text-neon-purple" />
          <span>AI Music Generator</span>
        </CardTitle>
        <CardDescription>
          Transform your rhythm and prompt into full musical tracks
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Generation Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">Rhythm Pattern:</span>
            <span className={beats.timestamps.length > 0 ? "text-neon-green" : "text-gray-500"}>
              {beats.timestamps.length > 0 ? `${beats.timestamps.length} beats` : "Not recorded"}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">Style Prompt:</span>
            <span className={prompt.trim() ? "text-neon-green" : "text-gray-500"}>
              {prompt.trim() ? "Ready" : "Not provided"}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-center text-neon-green">
              Generating your music... {Math.round(progress)}%
            </p>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={generateMusic}
          disabled={!canGenerate || isGenerating}
          className="w-full bg-gradient-to-r from-neon-purple to-neon-pink hover:shadow-lg hover:shadow-neon-purple/25 disabled:opacity-50 disabled:cursor-not-allowed h-12 text-lg font-semibold"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              Generating Music...
            </>
          ) : (
            <>
              <Music className="w-5 h-5 mr-2" />
              Generate Music
            </>
          )}
        </Button>

        {/* Requirements Notice */}
        {!canGenerate && (
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-400">
              Complete these steps to generate music:
            </p>
            <div className="space-y-1 text-xs">
              {beats.timestamps.length === 0 && (
                <p className="text-red-400">• Record a rhythm pattern</p>
              )}
              {!prompt.trim() && (
                <p className="text-red-400">• Provide a style prompt</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MusicGenerator;
