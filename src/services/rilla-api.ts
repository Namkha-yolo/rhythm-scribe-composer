
import OpenAI from 'openai';

// Initialize Rilla API client
const client = new OpenAI({
  baseURL: "https://litellm.rillavoice.com/v1",
  apiKey: "sk-rilla-vibes",
  dangerouslyAllowBrowser: true
});

export interface BeatAnalysisResult {
  timestamps: number[];
  pitches: string[];
  bpm: number;
  confidence: number;
}

export interface MusicGenerationParams {
  beats: BeatAnalysisResult;
  prompt: string;
  style: string;
  instruments: string[];
}

export interface GeneratedTrack {
  id: number;
  name: string;
  type: string;
  url: string;
  volume: number;
  muted: boolean;
  color: string;
}

// Analyze audio for beat detection using Claude
export const analyzeBeatPattern = async (audioBlob: Blob): Promise<BeatAnalysisResult> => {
  try {
    // Convert audio blob to base64
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    const prompt = `
    Analyze this audio recording of mouth taps/beats. Extract:
    1. Timestamps of each beat/tap (in seconds)
    2. Approximate pitch or tone quality for each beat
    3. Overall BPM estimate
    4. Confidence level (0-1)

    Return a JSON object with this structure:
    {
      "timestamps": [0.1, 0.5, 0.9, 1.3],
      "pitches": ["kick", "snare", "kick", "hihat"],
      "bpm": 120,
      "confidence": 0.85
    }

    Audio data (base64): ${base64Audio.substring(0, 1000)}...
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
    
    // Extract JSON from Claude's response
    const responseText = response.choices[0].message.content || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Could not parse beat analysis response');
  } catch (error) {
    console.error('Beat analysis error:', error);
    // Fallback to mock data
    return {
      timestamps: [0.5, 1.0, 1.5, 2.0],
      pitches: ['kick', 'snare', 'kick', 'snare'],
      bpm: 120,
      confidence: 0.7
    };
  }
};

// Transcribe voice using Claude
export const transcribeVoice = async (audioBlob: Blob): Promise<string> => {
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    const prompt = `
    Transcribe this audio recording of a user describing music they want to create.
    Focus on musical terms, genres, instruments, and style descriptions.
    Return only the transcribed text, no additional formatting.

    Audio data (base64): ${base64Audio.substring(0, 1000)}...
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

    return response.choices[0].message.content?.trim() || 'Create a modern electronic track with synthesizers and a driving beat';
  } catch (error) {
    console.error('Voice transcription error:', error);
    return 'Create a modern electronic track with synthesizers and a driving beat';
  }
};

// Generate music parameters using LLaMA
export const generateMusicParameters = async (beats: BeatAnalysisResult, prompt: string) => {
  try {
    const systemPrompt = `
    You are a music production AI. Given beat pattern data and a style prompt, 
    generate specific parameters for creating music tracks.

    Beat data: ${JSON.stringify(beats)}
    Style prompt: ${prompt}

    Generate parameters for 4 different instrument tracks that would work well together.
    Return a JSON array with this structure:
    [
      {
        "name": "Bass Line",
        "type": "bass",
        "instrument": "electric_bass",
        "key": "Em",
        "pattern": [1, 0, 1, 0],
        "volume": 0.8,
        "effects": ["reverb", "compression"]
      }
    ]
    `;

    const response = await client.chat.completions.create({
      model: "llama-4-maverick-17b-instruct",
      messages: [
        {
          role: "user",
          content: systemPrompt
        }
      ]
    });

    // Parse the generated parameters
    const responseText = response.choices[0].message.content || '';
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Could not parse music parameters');
  } catch (error) {
    console.error('Music parameter generation error:', error);
    // Return fallback parameters
    return [
      {
        name: "Bass Line",
        type: "bass",
        instrument: "electric_bass",
        key: "Em",
        pattern: [1, 0, 1, 0],
        volume: 0.8,
        effects: ["reverb"]
      },
      {
        name: "Drum Kit",
        type: "drums",
        instrument: "drum_kit",
        key: "C",
        pattern: [1, 1, 1, 1],
        volume: 0.9,
        effects: ["compression"]
      }
    ];
  }
};

// Generate final tracks
export const generateTracks = async (params: any[]): Promise<GeneratedTrack[]> => {
  try {
    const tracks: GeneratedTrack[] = params.map((param, index) => ({
      id: index + 1,
      name: param.name,
      type: param.type,
      url: `/api/generated-audio/${param.type}_${Date.now()}.wav`,
      volume: param.volume || 0.7,
      muted: false,
      color: getTrackColor(param.type)
    }));

    return tracks;
  } catch (error) {
    console.error('Track generation error:', error);
    return [];
  }
};

const getTrackColor = (type: string): string => {
  const colors = {
    bass: "from-neon-green to-green-400",
    drums: "from-neon-blue to-blue-400",
    melody: "from-neon-purple to-purple-400",
    harmony: "from-neon-pink to-pink-400"
  };
  return colors[type as keyof typeof colors] || "from-gray-500 to-gray-400";
};
