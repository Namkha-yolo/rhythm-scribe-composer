
import OpenAI from 'openai';
import { MelodyAnalysis } from './types';

// Initialize Rilla API client
const client = new OpenAI({
  baseURL: "https://litellm.rillavoice.com/v1",
  apiKey: "sk-rilla-vibes",
  dangerouslyAllowBrowser: true
});

// Analyze melody sequence using Claude 3.5 Sonnet
export const analyzeMelodyWithRilla = async (noteSequence: string[], instrumentType: string): Promise<MelodyAnalysis> => {
  try {
    const prompt = `
    Analyze this melody sequence captured from a human voice for music production.
    
    Raw note sequence: ${noteSequence.join(' → ')}
    Target instrument: ${instrumentType}
    
    Please provide a musical analysis and return JSON with:
    {
      "cleanMelody": [array of MIDI note numbers for the main melodic phrase],
      "detectedKey": "key signature (e.g., C, Am, F#, etc.)",
      "tempo": estimated BPM number,
      "confidence": confidence level 0-1,
      "musicalStructure": "description of the melodic pattern"
    }
    
    Filter out repeated notes, focus on the main melodic contour, and quantize to a musically coherent phrase that would work well for ${instrumentType}.
    Remove any NaN values and create a clean melodic sequence.
    `;

    const response = await client.chat.completions.create({
      model: "claude-3-5-sonnet",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });
    
    const responseText = response.choices[0].message.content || '';
    console.log('Rilla melody analysis response:', responseText);
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      return {
        cleanMelody: analysis.cleanMelody || [60, 62, 64, 65, 67], // fallback C major scale
        detectedKey: analysis.detectedKey || 'C',
        tempo: analysis.tempo || 120,
        confidence: analysis.confidence || 0.8,
        musicalStructure: analysis.musicalStructure || 'Simple melodic phrase'
      };
    }
    
    throw new Error('Could not parse melody analysis response');
  } catch (error) {
    console.error('Rilla melody analysis error:', error);
    // Fallback analysis
    return {
      cleanMelody: [60, 62, 64, 65, 67, 69, 71, 72], // C major scale
      detectedKey: 'C',
      tempo: 120,
      confidence: 0.7,
      musicalStructure: 'Fallback melodic pattern'
    };
  }
};
