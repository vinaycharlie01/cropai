
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


const DiagnoseCropDiseaseOutputSchema = z.object({
  disease: z.string().describe('The identified disease, if any. If no disease is detected, state "Healthy".'),
  remedies: z.string().describe('Suggested general, non-pesticide remedies for the identified disease. If healthy, provide general care tips.'),
  confidence: z.number().describe('The confidence level of the diagnosis (0-1).'),
});
export type DiagnoseCropDiseaseOutput = z.infer<typeof DiagnoseCropDiseaseOutputSchema>;

export async function diagnoseCropDisease(input: DiagnoseCropDiseaseInput): Promise<DiagnoseCropDiseaseOutput> {
  return diagnoseCropDiseaseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'diagnoseCropDiseasePrompt',
  input: {schema: DiagnoseCropDiseaseInputSchema},
  output: {schema: DiagnoseCropDiseaseOutputSchema},
  prompt: `You are an expert agricultural botanist. Analyze the provided image and information to diagnose crop diseases.

**IMPORTANT INSTRUCTIONS:**
1.  Your entire response MUST be in the language specified: **{{{language}}}**.
2.  You MUST provide the output in the specified JSON format. Do not add any text before or after the JSON object.
3.  **Disease**: Identify the disease. If the plant is healthy, you MUST state "Healthy".
4.  **Remedies**: Provide non-pesticide remedies or general care tips if the plant is healthy.
5.  **Confidence**: Provide a confidence score between 0.0 and 1.0 for your diagnosis.

**INPUT DATA:**
*   **Crop Type**: {{{cropType}}}
*   **Location**: {{{location}}}
*   **Photo**: {{media url=photoDataUri}}

Begin analysis and provide the structured JSON output now.
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
    if (!output) {
      throw new Error("The AI model did not return a valid diagnosis. The image may be unclear or not a plant.");
    }
    return output;
  }
);
