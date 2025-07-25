
'use server';

/**
 * @fileOverview A central AI flow for converting text to speech.
 *
 * - generateSpeech - Converts a given text string into playable audio in a specified language.
 * - GenerateSpeechInput - The input type for the generateSpeech function.
 * - GenerateSpeechOutput - The return type for the generateSpeech function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import wav from 'wav';
import { getTtsLanguageCode } from '@/lib/translations';

const GenerateSpeechInputSchema = z.object({
  text: z.string().describe('The text to convert to speech.'),
  language: z.string().describe('The language code for the speech (e.g., "en", "hi").'),
});
export type GenerateSpeechInput = z.infer<typeof GenerateSpeechInputSchema>;

const GenerateSpeechOutputSchema = z.object({
  audioDataUri: z.string().describe("The generated audio as a data URI in WAV format. Expected format: 'data:audio/wav;base64,<encoded_data>'."),
});
export type GenerateSpeechOutput = z.infer<typeof GenerateSpeechOutputSchema>;

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
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

const ttsFlow = ai.defineFlow(
  {
    name: 'ttsFlow',
    inputSchema: GenerateSpeechInputSchema,
    outputSchema: GenerateSpeechOutputSchema,
  },
  async ({ text, language }) => {
    const ttsLang = getTtsLanguageCode(language);
    
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          languageCode: ttsLang,
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' },
          },
        },
      },
      prompt: text,
    });
    
    if (!media?.url) {
      throw new Error('TTS generation failed. No audio media was returned.');
    }
    
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


export async function generateSpeech(input: GenerateSpeechInput): Promise<GenerateSpeechOutput> {
  return ttsFlow(input);
}
