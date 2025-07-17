
'use server';

/**
 * @fileOverview A Text-to-Speech (TTS) AI agent, rebuilt for reliability.
 *
 * - textToSpeech - Converts text to speech.
 * - TextToSpeechInput - The input type for the textToSpeech function.
 * - TextToSpeechOutput - The return type for the textToSpeech function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/googleai';
import wav from 'wav';

const TextToSpeechInputSchema = z.object({
  text: z.string().describe('The text to convert to speech.'),
  language: z.string().describe('The language code for the speech (e.g., "en-US", "hi-IN").'),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

const TextToSpeechOutputSchema = z.object({
  audioDataUri: z.string().describe("The generated audio as a data URI in WAV format. Expected format: 'data:audio/wav;base64,<encoded_data>'."),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;


async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000, // Gemini TTS outputs at 24kHz
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const buffers: Buffer[] = [];
    writer.on('data', (chunk) => buffers.push(chunk));
    writer.on('end', () => resolve(Buffer.concat(buffers).toString('base64')));
    writer.on('error', reject);

    writer.write(pcmData);
    writer.end();
  });
}

const textToSpeechFlow = ai.defineFlow(
    {
        name: 'textToSpeechFlow',
        inputSchema: TextToSpeechInputSchema,
        outputSchema: TextToSpeechOutputSchema,
    },
    async (input) => {
        const { media } = await ai.generate({
            model: googleAI.model('gemini-2.5-flash-preview-tts'),
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    languageCode: input.language,
                },
            },
            prompt: input.text,
        });

        if (!media?.url) {
            throw new Error('Audio generation failed. No media was returned from the model.');
        }

        // The data URI is base64 encoded PCM data, format: 'data:audio/L16;rate=24000;channels=1;base64,...'
        const audioBuffer = Buffer.from(
            media.url.substring(media.url.indexOf(',') + 1),
            'base64'
        );

        const wavBase64 = await toWav(audioBuffer);

        return {
            audioDataUri: `data:audio/wav;base64,${wavBase64}`,
        };
    }
);

export async function textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechOutput> {
  return textToSpeechFlow(input);
}
