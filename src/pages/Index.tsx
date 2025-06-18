
import { useState } from 'react';
import VoiceTrackRecorder from '@/components/VoiceTrackRecorder';
import EnhancedTrackMixer from '@/components/EnhancedTrackMixer';
import VocalsSection from '@/components/VocalsSection';
import KeyDetection from '@/components/KeyDetection';
import Header from '@/components/Header';

const Index = () => {
  const [tracks, setTracks] = useState<any[]>([]);
  const [detectedKey, setDetectedKey] = useState<string>('');

  const handleTrackCreated = (newTrack: any) => {
    setTracks(prevTracks => [...prevTracks, newTrack]);
  };

  const handleVocalTrackCreated = (vocalTrack: any) => {
    setTracks(prevTracks => [...prevTracks, vocalTrack]);
  };

  const handleKeyDetected = (key: string) => {
    setDetectedKey(key);
  };

  const handleSetAllTracksToKey = (key: string) => {
    const updatedTracks = tracks.map(track => ({
      ...track,
      key: key,
      effects: [...track.effects, `tuned-to-${key}`]
    }));
    setTracks(updatedTracks);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Left Column - Recording and Key Detection */}
          <div className="space-y-8">
            <KeyDetection 
              tracks={tracks}
              onKeyDetected={handleKeyDetected}
              onSetAllTracksToKey={handleSetAllTracksToKey}
            />
            
            <VoiceTrackRecorder onTrackCreated={handleTrackCreated} />
            
            <VocalsSection 
              onVocalTrackCreated={handleVocalTrackCreated}
              detectedKey={detectedKey}
            />
            
            {/* Instructions */}
            <div className="bg-muted/10 p-6 rounded-lg border border-dark-border">
              <h3 className="text-lg font-semibold text-white mb-3">How to Use:</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <p>1. Add instrument tracks by selecting type and recording</p>
                <p>2. Record vocals with auto-tune and octave controls</p>
                <p>3. The AI will detect your song's key automatically</p>
                <p>4. Set all instruments to the same key for harmony</p>
                <p>5. Use voice commands to add effects</p>
              </div>
              
              <div className="mt-4 pt-4 border-t border-dark-border">
                <p className="text-xs text-gray-400 mb-2">Voice Examples:</p>
                <div className="grid grid-cols-1 gap-1 text-xs">
                  <p className="text-neon-blue">🥁 "boom bap boom boom bap tss"</p>
                  <p className="text-neon-green">🎸 "strum down up down up"</p>
                  <p className="text-neon-pink">🎵 "la la la do re mi"</p>
                  <p className="text-neon-purple">🎛️ "add reverb and delay to this track"</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column - Track Mixer */}
          <div className="space-y-8">
            <EnhancedTrackMixer 
              tracks={tracks}
              onTracksUpdated={setTracks}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
