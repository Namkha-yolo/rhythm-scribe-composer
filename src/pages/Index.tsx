
import { useState } from 'react';
import VoiceTrackRecorder from '@/components/VoiceTrackRecorder';
import EnhancedTrackMixer from '@/components/EnhancedTrackMixer';
import Header from '@/components/Header';

const Index = () => {
  const [tracks, setTracks] = useState<any[]>([]);

  const handleTrackCreated = (newTrack: any) => {
    setTracks(prevTracks => [...prevTracks, newTrack]);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Left Column - Voice Recording */}
          <div className="space-y-8">
            <VoiceTrackRecorder onTrackCreated={handleTrackCreated} />
            
            {/* Instructions */}
            <div className="bg-muted/10 p-6 rounded-lg border border-dark-border">
              <h3 className="text-lg font-semibold text-white mb-3">How to Use:</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <p>1. Select an instrument type</p>
                <p>2. Record yourself making those sounds</p>
                <p>3. The AI will create a playable track</p>
                <p>4. Add more tracks for layering</p>
                <p>5. Use voice to add effects to any track</p>
              </div>
              
              <div className="mt-4 pt-4 border-t border-dark-border">
                <p className="text-xs text-gray-400 mb-2">Voice Examples:</p>
                <div className="grid grid-cols-1 gap-1 text-xs">
                  <p className="text-neon-blue">🥁 "boom bap boom boom bap tss"</p>
                  <p className="text-neon-green">🎸 "strum down up down up"</p>
                  <p className="text-neon-purple">🎵 "do re mi fa sol la"</p>
                  <p className="text-neon-pink">🎛️ "add reverb and delay to this track"</p>
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
