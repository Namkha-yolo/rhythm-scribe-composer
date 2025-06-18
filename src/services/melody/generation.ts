
import OpenAI from 'openai';
import { VoiceProcessor } from '../audio-processing';

// Initialize Rilla API client
const client = new OpenAI({
  baseURL: "https://litellm.rillavoice.com/v1",
  apiKey: "sk-rilla-vibes",
  dangerouslyAllowBrowser: true
});

// Generate instrument track using real samples and professional processing
export const generateInstrumentTrackWithRilla = async (
  melody: number[], 
  key: string, 
  instrumentType: string, 
  variationType: string,
  tempo: number
): Promise<string> => {
  try {
    console.log('Generating professional instrument track with real samples...');

    const prompt = `
    Generate high-quality ${instrumentType} audio using real sample libraries.
    
    Melody (MIDI notes): ${melody.join(', ')}
    Key: ${key}
    Variation: ${variationType}
    Tempo: ${tempo} BPM
    
    Create professional-quality ${instrumentType} sounds using:
    1. Real audio samples from professional sample libraries
    2. Proper pitch shifting and time stretching
    3. Advanced audio processing for ${variationType} style
    4. Studio-quality effects and mixing
    
    Focus on creating realistic, professional ${instrumentType} sounds that sound like real musicians.
    `;

    const response = await client.chat.completions.create({
      model: "llama-4-maverick-17b-instruct",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    console.log('Rilla professional instrument generation response:', response.choices[0].message.content);

    // Use the new VoiceProcessor with real sample generation
    const voiceProcessor = new VoiceProcessor();
    const audioUrl = await voiceProcessor.generateInstrumentTrackFromMelody(
      melody, 
      instrumentType, 
      variationType, 
      tempo, 
      key
    );
    
    return audioUrl;
  } catch (error) {
    console.error('Rilla professional instrument generation error:', error);
    // Fallback to improved local generation with real samples
    const voiceProcessor = new VoiceProcessor();
    return await voiceProcessor.generateInstrumentTrackFromMelody(
      melody, 
      instrumentType, 
      variationType, 
      tempo, 
      key
    );
  }
};
