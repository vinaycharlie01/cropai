
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
  name: z.string().describe('The brand or chemical name of the suggested pesticide.'),
  description: z.string().describe('A brief description of why this pesticide is recommended and how to use it.'),
  purchaseLink: z.string().url().describe('A simulated e-commerce search link to buy the product. The link should be a valid URL format, like a google search for the product on a popular indian e-commerce site for agricultural products.'),
});

const DiagnoseCropDiseaseOutputSchema = z.object({
  disease: z.string().describe('The identified disease, if any.'),
  remedies: z.string().describe('Suggested general, non-pesticide remedies for the identified disease.'),
  confidence: z.number().describe('The confidence level of the diagnosis (0-1).'),
  pesticideSuggestions: z.array(PesticideSuggestionSchema).describe('A list of suggested pesticides to treat the identified disease.'),
});
export type DiagnoseCropDiseaseOutput = z.infer<typeof DiagnoseCropDiseaseOutputSchema>;

export async function diagnoseCropDisease(input: DiagnoseCropDiseaseInput): Promise<DiagnoseCropDiseaseOutput> {
  return diagnoseCropDiseaseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'diagnoseCropDiseasePrompt',
  input: {schema: DiagnoseCropDiseaseInputSchema},
  output: {schema: DiagnoseCropDiseaseOutputSchema},
  prompt: `You are an expert in plant pathology. Analyze the image and details provided.

Your response must be in this language: {{{language}}}.

Based on the image of the {{{cropType}}} from {{{location}}}, provide the following:
1.  **disease**: The name of the disease.
2.  **remedies**: General, non-pesticide remedies.
3.  **confidence**: Your confidence level (0.0 to 1.0).
4.  **pesticideSuggestions**: Suggest 2-3 specific, commonly available pesticides. For each, provide its name, a brief description, and a simulated e-commerce search link (e.g., a Google search for the product on an Indian agri-store).

Image is here: {{media url=photoDataUri}}
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
