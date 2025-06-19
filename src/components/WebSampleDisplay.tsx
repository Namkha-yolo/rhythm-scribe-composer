
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Download, ExternalLink, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { webSampleScraper, WebSample } from '@/services/web-sample-scraper';

interface WebSampleDisplayProps {
  detectedInstrument?: string;
  voiceCharacteristics?: any;
  searchTrigger?: boolean;
}

const WebSampleDisplay = ({ detectedInstrument, voiceCharacteristics, searchTrigger }: WebSampleDisplayProps) => {
  const [samples, setSamples] = useState<WebSample[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<Map<string, HTMLAudioElement>>(new Map());
  const { toast } = useToast();

  useEffect(() => {
    if (detectedInstrument && searchTrigger) {
      searchWebSamples();
    }
  }, [detectedInstrument, searchTrigger]);

  const searchWebSamples = async () => {
    if (!detectedInstrument) return;

    setLoading(true);
    try {
      toast({
        title: "Searching Web Samples",
        description: `Finding real ${detectedInstrument} samples from the web...`,
      });

      const webSamples = await webSampleScraper.getSamplesForInstrument(
        detectedInstrument, 
        voiceCharacteristics
      );
      
      setSamples(webSamples);
      
      toast({
        title: "Web Samples Found!",
        description: `Found ${webSamples.length} real samples from various sources`,
      });
    } catch (error) {
      console.error('Web sample search error:', error);
      toast({
        title: "Search Error",
        description: "Could not fetch web samples. Showing fallback results.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const playWebSample = async (sample: WebSample) => {
    try {
      // Stop currently playing audio
      if (currentlyPlaying && audioElements.has(currentlyPlaying)) {
        const currentAudio = audioElements.get(currentlyPlaying);
        currentAudio?.pause();
        currentAudio!.currentTime = 0;
      }

      // Create or get audio element for this sample
      let audio = audioElements.get(sample.id);
      if (!audio) {
        audio = new Audio(sample.audioUrl);
        audio.crossOrigin = 'anonymous';
        
        // Handle audio end
        audio.onended = () => {
          setCurrentlyPlaying(null);
        };
        
        // Handle errors
        audio.onerror = () => {
          toast({
            title: "Playback Error",
            description: "Could not play this sample. It may not be available.",
            variant: "destructive",
          });
          setCurrentlyPlaying(null);
        };
        
        setAudioElements(prev => new Map(prev.set(sample.id, audio!)));
      }

      if (currentlyPlaying === sample.id) {
        // Pause if already playing
        audio.pause();
        setCurrentlyPlaying(null);
      } else {
        // Play sample
        await audio.play();
        setCurrentlyPlaying(sample.id);
        
        toast({
          title: "Playing Web Sample",
          description: `${sample.title} from ${sample.source}`,
        });
      }
    } catch (error) {
      console.error('Play error:', error);
      toast({
        title: "Playback Error",
        description: "Could not play this sample",
        variant: "destructive",
      });
    }
  };

  const downloadWebSample = async (sample: WebSample) => {
    if (sample.downloadUrl) {
      window.open(sample.downloadUrl, '_blank');
      toast({
        title: "Download Started",
        description: `Downloading ${sample.title}`,
      });
    } else {
      toast({
        title: "Download Not Available",
        description: "This sample doesn't have a download link",
        variant: "destructive",
      });
    }
  };

  if (!detectedInstrument || samples.length === 0) {
    return null;
  }

  return (
    <Card className="bg-dark-surface border-dark-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Globe className="w-5 h-5 text-neon-blue" />
          <span>Real Web Samples</span>
        </CardTitle>
        <CardDescription>
          Found {samples.length} real {detectedInstrument} samples from the web
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {loading && (
          <div className="text-center space-y-2">
            <div className="w-6 h-6 border-2 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-neon-blue">Scraping web for real samples...</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
          {samples.map((sample) => (
            <div
              key={sample.id}
              className="flex items-center justify-between p-4 bg-muted/10 rounded-lg border border-dark-border hover:border-neon-blue/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="font-medium text-gray-200 truncate">{sample.title}</h4>
                  <Badge variant="outline" className="text-xs">
                    {sample.source}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-4 text-xs text-gray-400">
                  {sample.user && <span>by {sample.user}</span>}
                  {sample.duration && <span>{sample.duration}</span>}
                  {sample.bpm && <span>{sample.bpm} BPM</span>}
                </div>
                
                <div className="flex flex-wrap gap-1 mt-2">
                  {sample.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                <Button
                  onClick={() => playWebSample(sample)}
                  variant="ghost"
                  size="sm"
                  className={`${
                    currentlyPlaying === sample.id 
                      ? 'text-neon-green hover:text-neon-blue' 
                      : 'text-gray-400 hover:text-neon-green'
                  }`}
                >
                  {currentlyPlaying === sample.id ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                
                {sample.downloadUrl && (
                  <Button
                    onClick={() => downloadWebSample(sample)}
                    variant="ghost"
                    size="sm"
                    className="text-neon-blue hover:text-neon-purple"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                )}
                
                <Button
                  onClick={() => window.open(`https://${sample.source}`, '_blank')}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-neon-blue"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-4 border-t border-dark-border">
          <p className="text-xs text-gray-400 mb-2">
            Samples sourced from: Looperman, SampleFocus, Freesound, and more
          </p>
          <Button
            onClick={searchWebSamples}
            variant="outline"
            size="sm"
            disabled={loading}
            className="border-neon-blue text-neon-blue hover:bg-neon-blue/10"
          >
            <Globe className="w-4 h-4 mr-2" />
            Refresh Web Search
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebSampleDisplay;
