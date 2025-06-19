
export interface WebSample {
  id: string;
  title: string;
  source: string;
  audioUrl: string;
  downloadUrl?: string;
  user?: string;
  duration?: string;
  bpm?: number;
  tags: string[];
  instrument?: string;
}

export class WebSampleScraper {
  private corsProxy = 'https://cors-anywhere.herokuapp.com/';
  private cache: Map<string, WebSample[]> = new Map();
  
  async searchSamples(query: string, instrument?: string): Promise<WebSample[]> {
    const cacheKey = `${query}-${instrument || 'all'}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // For demo purposes, we'll use a mock API that simulates web scraping
      // In production, you'd need a backend service to handle actual scraping
      const samples = await this.mockWebScraping(query, instrument);
      this.cache.set(cacheKey, samples);
      return samples;
    } catch (error) {
      console.error('Web scraping error:', error);
      return this.getFallbackSamples(query, instrument);
    }
  }

  private async mockWebScraping(query: string, instrument?: string): Promise<WebSample[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockSamples: WebSample[] = [
      {
        id: 'loop_001',
        title: `${instrument || 'Acoustic'} ${query} Loop`,
        source: 'looperman.com',
        audioUrl: 'https://looperman.com/media/loops/sample1.wav',
        downloadUrl: 'https://looperman.com/download/sample1',
        user: 'ProducerX',
        duration: '0:08',
        bpm: 120,
        tags: [query, instrument || 'acoustic', 'loop'],
        instrument: instrument
      },
      {
        id: 'sample_002',
        title: `${query} Sample Pack`,
        source: 'samplefocus.com',
        audioUrl: 'https://samplefocus.com/samples/sample2.wav',
        downloadUrl: 'https://samplefocus.com/download/sample2',
        user: 'BeatMaker',
        duration: '0:12',
        bpm: 140,
        tags: [query, instrument || 'electronic', 'sample'],
        instrument: instrument
      },
      {
        id: 'free_003',
        title: `Free ${instrument || 'Synth'} ${query}`,
        source: 'freesound.org',
        audioUrl: 'https://freesound.org/data/previews/sample3.mp3',
        downloadUrl: 'https://freesound.org/download/sample3',
        user: 'AudioCreator',
        duration: '0:06',
        bpm: 128,
        tags: [query, instrument || 'synth', 'creative-commons'],
        instrument: instrument
      }
    ];

    // Filter by instrument if specified
    if (instrument) {
      return mockSamples.filter(sample => 
        sample.instrument === instrument || 
        sample.tags.includes(instrument.toLowerCase())
      );
    }

    return mockSamples;
  }

  private getFallbackSamples(query: string, instrument?: string): WebSample[] {
    return [
      {
        id: 'fallback_001',
        title: `${instrument || 'Generic'} ${query} (Fallback)`,
        source: 'local',
        audioUrl: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBz2W2fbBeSMFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBz2W2fbBeSMFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBz2W2fbBeSMFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBz2W2fbBeSMFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBz2W2fbBeSMFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBz2W2fbBeSMFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBz2W2fbBeSMFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBz2W2fbBeSMFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBz2W2fbBeSMFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBz2W2fbBeSMFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBz2W2fbBeSMFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBz2W2fbBeSMF',
        tags: [query, 'fallback'],
        instrument: instrument
      }
    ];
  }

  async downloadSample(sample: WebSample): Promise<Blob | null> {
    try {
      const response = await fetch(sample.audioUrl, {
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.blob();
    } catch (error) {
      console.error('Download error:', error);
      return null;
    }
  }

  // Get samples based on voice/instrument detection
  async getSamplesForInstrument(detectedInstrument: string, voiceCharacteristics?: any): Promise<WebSample[]> {
    const searchTerms = this.getSearchTermsForInstrument(detectedInstrument, voiceCharacteristics);
    const allSamples: WebSample[] = [];
    
    for (const term of searchTerms) {
      const samples = await this.searchSamples(term, detectedInstrument);
      allSamples.push(...samples);
    }
    
    // Remove duplicates and limit results
    const uniqueSamples = allSamples.filter((sample, index, self) => 
      index === self.findIndex(s => s.id === sample.id)
    );
    
    return uniqueSamples.slice(0, 10);
  }

  private getSearchTermsForInstrument(instrument: string, characteristics?: any): string[] {
    const baseTerms: { [key: string]: string[] } = {
      piano: ['piano', 'keys', 'acoustic piano', 'grand piano'],
      guitar: ['guitar', 'acoustic guitar', 'fingerpicked', 'strummed'],
      electricguitar: ['electric guitar', 'guitar riff', 'guitar solo', 'distorted guitar'],
      bass: ['bass', 'bass guitar', 'bassline', 'deep bass'],
      violin: ['violin', 'strings', 'orchestral', 'classical'],
      drums: ['drums', 'percussion', 'beats', 'rhythm'],
      synth: ['synth', 'synthesizer', 'electronic', 'pad']
    };
    
    return baseTerms[instrument] || [instrument, 'music', 'audio'];
  }
}

export const webSampleScraper = new WebSampleScraper();
