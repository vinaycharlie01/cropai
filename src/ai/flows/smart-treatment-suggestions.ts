// src/ai/flows/smart-treatment-suggestions.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting treatments for crop diseases, considering location and crop type.
 *
 * - suggestTreatment - A function that takes crop type, disease, and location as input and returns treatment suggestions.
 * - SuggestTreatmentInput - The input type for the suggestTreatment function.
 * - SuggestTreatmentOutput - The return type for the suggestTreatment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTreatmentInputSchema = z.object({
  cropType: z.string().describe('The type of crop affected by the disease.'),
  disease: z.string().describe('The name of the disease affecting the crop.'),
  location: z.string().describe('The geographical location where the crop is grown.'),
});

export type SuggestTreatmentInput = z.infer<typeof SuggestTreatmentInputSchema>;

const SuggestTreatmentOutputSchema = z.object({
  treatmentSuggestions: z.string().describe('Suggested treatments for the disease, considering the crop type and location.'),
});

export type SuggestTreatmentOutput = z.infer<typeof SuggestTreatmentOutputSchema>;

export async function suggestTreatment(input: SuggestTreatmentInput): Promise<SuggestTreatmentOutput> {
  return suggestTreatmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTreatmentPrompt',
  input: {schema: SuggestTreatmentInputSchema},
  output: {schema: SuggestTreatmentOutputSchema},
  prompt: `You are an agricultural expert providing treatment suggestions for crop diseases.

  Given the crop type, disease, and location, suggest effective treatments that are suitable for the specified crop and location.

  Crop Type: {{{cropType}}}
  Disease: {{{disease}}}
  Location: {{{location}}}

  Provide treatment suggestions that are affordable and locally available to farmers in the given location.
  `,
});

const suggestTreatmentFlow = ai.defineFlow(
  {
    name: 'suggestTreatmentFlow',
    inputSchema: SuggestTreatmentInputSchema,
    outputSchema: SuggestTreatmentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
