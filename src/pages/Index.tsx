
import { useState } from 'react';
import BeatRecorder from '@/components/BeatRecorder';
import VoicePrompt from '@/components/VoicePrompt';
import MusicGenerator from '@/components/MusicGenerator';
import TrackMixer from '@/components/TrackMixer';
import Header from '@/components/Header';

const Index = () => {
  const [recordedBeats, setRecordedBeats] = useState<{ timestamps: number[], pitches: string[] }>({
    timestamps: [],
    pitches: []
  });
  const [voicePrompt, setVoicePrompt] = useState<string>('');
  const [generatedTracks, setGeneratedTracks] = useState<any[]>([]);

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-8">
            <BeatRecorder 
              onBeatsRecorded={setRecordedBeats} 
              recordedBeats={recordedBeats}
            />
            
            <VoicePrompt 
              onPromptRecorded={setVoicePrompt}
              currentPrompt={voicePrompt}
            />
            
            <MusicGenerator 
              beats={recordedBeats}
              prompt={voicePrompt}
              onTracksGenerated={setGeneratedTracks}
            />
          </div>
          
          {/* Right Column - Output */}
          <div className="space-y-8">
            <TrackMixer 
              tracks={generatedTracks}
              onTracksUpdated={setGeneratedTracks}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
