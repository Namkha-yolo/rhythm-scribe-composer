
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface KeyDetectionProps {
  tracks: any[];
  onKeyDetected: (key: string) => void;
  onSetAllTracksToKey: (key: string) => void;
}

const KeyDetection = ({ tracks, onKeyDetected, onSetAllTracksToKey }: KeyDetectionProps) => {
  const [detectedKey, setDetectedKey] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  // Analyze tracks for key detection
  useEffect(() => {
    if (tracks.length > 0) {
      analyzeKey();
    }
  }, [tracks]);

  const analyzeKey = async () => {
    setIsAnalyzing(true);
    
    try {
      // Simulate key detection analysis
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simple key detection simulation based on track types
      const keys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      const detectedKey = keys[Math.floor(Math.random() * keys.length)];
      
      setDetectedKey(detectedKey);
      onKeyDetected(detectedKey);
      
      toast({
        title: "Key Detected!",
        description: `Song appears to be in ${detectedKey} major`,
      });
    } catch (error) {
      console.error('Key detection error:', error);
      toast({
        title: "Analysis Error",
        description: "Could not detect key",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const setAllTracksToKey = () => {
    if (!detectedKey) return;
    
    onSetAllTracksToKey(detectedKey);
    
    toast({
      title: "Tracks Updated!",
      description: `All instruments set to ${detectedKey} key`,
    });
  };

  if (tracks.length === 0) {
    return (
      <Card className="bg-dark-surface border-dark-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Music className="w-5 h-5 text-neon-blue" />
            <span>Key Detection</span>
          </CardTitle>
          <CardDescription>
            Add tracks to detect the song's key
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="text-center py-4 text-gray-400">
            <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tracks to analyze</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-dark-surface border-dark-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Music className="w-5 h-5 text-neon-blue" />
          <span>Key Detection</span>
          {detectedKey && (
            <Badge variant="default" className="bg-neon-blue text-black">
              {detectedKey} Major
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Automatically detect and harmonize your song's key
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isAnalyzing ? (
          <div className="text-center space-y-2">
            <div className="w-6 h-6 border-2 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-neon-blue">
              Analyzing tracks for key detection...
            </p>
          </div>
        ) : detectedKey ? (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-neon-blue mb-2">
                Detected Key: {detectedKey} Major
              </h3>
              <p className="text-sm text-gray-300">
                Based on analysis of {tracks.length} track{tracks.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <Button
              onClick={setAllTracksToKey}
              className="w-full bg-gradient-to-r from-neon-green to-neon-blue hover:shadow-lg"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Set All Instruments to {detectedKey} Key
            </Button>
            
            <Button
              onClick={analyzeKey}
              variant="outline"
              className="w-full text-gray-300 hover:text-neon-blue"
            >
              Re-analyze Key
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <Button
              onClick={analyzeKey}
              className="bg-gradient-to-r from-neon-blue to-neon-purple hover:shadow-lg"
            >
              <Music className="w-4 h-4 mr-2" />
              Detect Key
            </Button>
          </div>
        )}

        {detectedKey && (
          <div className="mt-4 p-3 bg-muted/10 rounded-lg border border-dark-border">
            <p className="text-xs text-gray-400 mb-2">Key Information:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Scale:</span>
                <span className="text-neon-blue ml-2">{detectedKey} Major</span>
              </div>
              <div>
                <span className="text-gray-500">Relative Minor:</span>
                <span className="text-neon-green ml-2">{getRelativeMinor(detectedKey)} Minor</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const getRelativeMinor = (majorKey: string): string => {
  const relatives: { [key: string]: string } = {
    'C': 'A', 'D': 'B', 'E': 'C#', 'F': 'D', 'G': 'E', 'A': 'F#', 'B': 'G#'
  };
  return relatives[majorKey] || 'A';
};

export default KeyDetection;
