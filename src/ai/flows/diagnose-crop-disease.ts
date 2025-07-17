
'use server';

/**
 * @fileOverview A crop disease diagnosis AI agent.
 *
 * - diagnoseCropDisease - A function that handles the crop disease diagnosis process.
 * - DiagnoseCropDiseaseInput - The input type for the diagnoseCropDisease function.
 * - DiagnoseCropDiseaseOutput - The return type for the diagnoseCropDisease function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DiagnoseCropDiseaseInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  cropType: z.string().describe('The type of crop in the photo.'),
  location: z.string().describe('The geographic location where the crop is grown.'),
  language: z.string().describe('The language for the diagnosis result (e.g., "English", "Hindi", "Telugu").'),
});
export type DiagnoseCropDiseaseInput = z.infer<typeof DiagnoseCropDiseaseInputSchema>;

const PesticideSuggestionSchema = z.object({
  name: z.string().describe('The commercial name of the pesticide.'),
  description: z.string().describe('Instructions on how to use the pesticide for the diagnosed disease.'),
  purchaseLink: z.string().url().describe('A simulated e-commerce search link to buy the product. Generate a google.com search link.'),
});

const DiagnoseCropDiseaseOutputSchema = z.object({
  disease: z.string().describe('The identified disease, if any. If no disease is detected, state "Healthy".'),
  remedies: z.string().describe('Suggested general, non-pesticide remedies for the identified disease. If healthy, provide general care tips.'),
  confidence: z.number().describe('The confidence level of the diagnosis (0-1).'),
  pesticideSuggestions: z.array(PesticideSuggestionSchema).describe('A list of 1 to 3 suggested pesticides to treat the disease. If the plant is healthy, this array should be empty.'),
});
export type DiagnoseCropDiseaseOutput = z.infer<typeof DiagnoseCropDiseaseOutputSchema>;

export async function diagnoseCropDisease(input: DiagnoseCropDiseaseInput): Promise<DiagnoseCropDiseaseOutput> {
  return diagnoseCropDiseaseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'diagnoseCropDiseasePrompt',
  input: {schema: DiagnoseCropDiseaseInputSchema},
  output: {schema: DiagnoseCropDiseaseOutputSchema},
  prompt: `You are an expert agricultural botanist specializing in plant pathology. Your task is to analyze an image of a crop and provide a diagnosis and treatment plan.

Your entire response MUST be in the language specified: {{{language}}}.

Analyze the image of the {{{cropType}}} from {{{location}}}.

Based on your analysis, you must provide the following information in a structured format:
1.  **disease**: Identify the specific disease affecting the plant. If the plant appears healthy, state "Healthy".
2.  **remedies**: Provide a few non-pesticide, general care remedies or preventative measures. If the plant is healthy, suggest general care tips.
3.  **confidence**: State your confidence level in this diagnosis on a scale from 0.0 to 1.0.
4.  **pesticideSuggestions**:
    *   If a disease is identified, suggest 1 to 3 commercially available pesticides suitable for treating it.
    *   For each pesticide, provide its commercial **name**, a brief **description** of how to apply it for the specific disease, and a **purchaseLink**.
    *   The purchaseLink MUST be a valid Google search URL for buying the product online (e.g., "https://www.google.com/search?q=buy+[Pesticide+Name]+online").
    *   If the plant is diagnosed as "Healthy", you MUST return an empty array [] for pesticideSuggestions.

Here is the image to analyze: {{media url=photoDataUri}}
`,
});

const diagnoseCropDiseaseFlow = ai.defineFlow(
  {
    name: 'diagnoseCropDiseaseFlow',
    inputSchema: DiagnoseCropDiseaseInputSchema,
    outputSchema: DiagnoseCropDiseaseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
