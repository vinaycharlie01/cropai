
'use server';

/**
 * @fileOverview A robust Genkit flow for converting text to speech.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import wav from 'wav';
import { googleAI } from '@genkit-ai/googleai';


const TtsInputSchema = z.object({
    text: z.string().describe('The text to be converted to speech.'),
    languageCode: z.string().describe('The BCP-47 language code for the speech, e.g., "en-US", "hi-IN".'),
});
export type TtsInput = z.infer<typeof TtsInputSchema>;

const TtsOutputSchema = z.object({
    audioDataUri: z.string().nullable().describe("A data URI of the generated audio in WAV format, or null if generation failed. Format: 'data:audio/wav;base64,<encoded_data>'."),
});
export type TtsOutput = z.infer<typeof TtsOutputSchema>;


/**
 * Converts a string of text into a playable audio data URI.
 * @param input The text and language code.
 * @returns An object containing the audioDataUri, or null if an error occurred.
 */
export async function generateSpeech(input: TtsInput): Promise<TtsOutput> {
  return ttsFlow(input);
}


/**
 * Converts raw PCM audio buffer to a Base64 encoded WAV string.
 */
async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', (d) => bufs.push(d));
    writer.on('end', () => resolve(Buffer.concat(bufs).toString('base64')));

    writer.write(pcmData);
    writer.end();
  });
}

const ttsFlow = ai.defineFlow(
  {
    name: 'ttsFlow',
    inputSchema: TtsInputSchema,
    outputSchema: TtsOutputSchema,
  },
  async ({ text, languageCode }) => {
    // Prevent calling the API with empty text
    if (!text || text.trim() === '') {
        console.warn("TTS flow called with empty text.");
        return { audioDataUri: null };
    }
    
    try {
        const { media } = await ai.generate({
            model: googleAI.model('gemini-2.5-flash-preview-tts'),
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { languageCode: languageCode }
                  },
                },
            },
            prompt: text,
        });

        if (!media?.url) {
            console.error('TTS model did not return any media.');
            return { audioDataUri: null };
        }

        const audioBuffer = Buffer.from(
            media.url.substring(media.url.indexOf(',') + 1),
            'base64'
        );
        
        const wavBase64 = await toWav(audioBuffer);

        return {
            audioDataUri: 'data:audio/wav;base64,' + wavBase64,
        };

    } catch (error) {
        console.error("Error in TTS flow:", error);
        // Return a null URI to gracefully handle errors on the frontend
        return { audioDataUri: null };
    }
  }
);
