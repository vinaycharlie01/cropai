
'use server';

/**
 * @fileOverview A Text-to-Speech (TTS) AI agent.
 *
 * - textToSpeech - Converts text to speech.
 * - TextToSpeechInput - The input type for the textToSpeech function.
 * - TextToSpeechOutput - The return type for the textToSpeech function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getTtsLanguageCode } from '@/lib/translations';
import { Buffer } from 'buffer';

const TextToSpeechInputSchema = z.object({
  text: z.string().describe('The text to convert to speech.'),
  language: z.string().describe('The language code for the speech (e.g., "en", "hi").'),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

const TextToSpeechOutputSchema = z.object({
  audioDataUri: z.string().describe("The generated audio as a data URI in WAV format. Expected format: 'data:audio/wav;base64,<encoded_data>'."),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;


// Helper function to create a WAV file header.
function createWavHeader(options: {
  numFrames: number;
  sampleRate: number;
  numChannels: number;
  bytesPerSample: number;
}): Buffer {
  const { numFrames, sampleRate, numChannels, bytesPerSample } = options;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const buffer = Buffer.alloc(44);

  // RIFF identifier
  buffer.write('RIFF', 0);
  // file length
  buffer.writeUInt32LE(36 + dataSize, 4);
  // RIFF type
  buffer.write('WAVE', 8);
  // format chunk identifier
  buffer.write('fmt ', 12);
  // format chunk length
  buffer.writeUInt32LE(16, 16);
  // sample format (raw)
  buffer.writeUInt16LE(1, 20);
  // channel count
  buffer.writeUInt16LE(numChannels, 22);
  // sample rate
  buffer.writeUInt32LE(sampleRate, 24);
  // byte rate (sample rate * block align)
  buffer.writeUInt32LE(byteRate, 28);
  // block align (channel count * bytes per sample)
  buffer.writeUInt16LE(blockAlign, 32);
  // bits per sample
  buffer.writeUInt16LE(bytesPerSample * 8, 34);
  // data chunk identifier
  buffer.write('data', 36);
  // data chunk length
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}


const textToSpeechFlow = ai.defineFlow(
    {
        name: 'textToSpeechFlow',
        inputSchema: TextToSpeechInputSchema,
        outputSchema: TextToSpeechOutputSchema,
    },
    async (input) => {
        const ttsLanguageCode = getTtsLanguageCode(input.language);
        
        const { media } = await ai.generate({
            model: 'googleai/gemini-2.5-flash-preview-tts',
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    languageCode: ttsLanguageCode,
                },
            },
            prompt: input.text,
        });

        if (!media?.url) {
            throw new Error('Audio generation failed. No media was returned from the model.');
        }
        
        // The Gemini TTS model returns audio in raw PCM format.
        // Most browsers can't play this directly. We need to add a WAV header.
        const pcmData = Buffer.from(
            media.url.substring(media.url.indexOf(',') + 1),
            'base64'
        );
        
        const wavHeader = createWavHeader({
          numFrames: pcmData.length / 2, // 16-bit PCM has 2 bytes per frame
          sampleRate: 24000,
          numChannels: 1,
          bytesPerSample: 2,
        });

        const wavData = Buffer.concat([wavHeader, pcmData]);
        const wavBase64 = wavData.toString('base64');

        return {
            audioDataUri: `data:audio/wav;base64,${wavBase64}`,
        };
    }
);

export async function textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechOutput> {
  return textToSpeechFlow(input);
}
