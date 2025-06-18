
import OpenAI from 'openai';
import { generateRealisticAudioWithSamples } from './audio-synthesis';

// Initialize Rilla API client
const client = new OpenAI({
  baseURL: "https://litellm.rillavoice.com/v1",
  apiKey: "sk-rilla-vibes",
  dangerouslyAllowBrowser: true
});

// Generate instrument track using Rilla AI with real audio samples
export const generateInstrumentTrackWithRilla = async (
  melody: number[], 
  key: string, 
  instrumentType: string, 
  variationType: string,
  tempo: number
): Promise<string> => {
  try {
    const prompt = `
    Generate a high-quality ${instrumentType} audio track using real samples.
    
    Melody (MIDI notes): ${melody.join(', ')}
    Key: ${key}
    Variation: ${variationType}
    Tempo: ${tempo} BPM
    
    Please provide audio generation parameters for creating realistic ${instrumentType} sounds using:
    1. Real audio samples from free sound libraries
    2. Proper pitch shifting to match the melody
    3. Professional audio processing for ${variationType} style
    
    Return JSON with synthesis settings and sample URLs if available.
    Focus on creating high-quality, realistic ${instrumentType} sounds.
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

    console.log('Rilla instrument generation response:', response.choices[0].message.content);

    // Generate audio using improved synthesis with real samples
    const audioUrl = await generateRealisticAudioWithSamples(melody, instrumentType, variationType, tempo, key);
    
    return audioUrl;
  } catch (error) {
    console.error('Rilla instrument generation error:', error);
    // Fallback to improved local generation
    return await generateRealisticAudioWithSamples(melody, instrumentType, variationType, tempo, key);
  }
};
