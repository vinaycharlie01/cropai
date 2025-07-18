
'use server';

/**
 * @fileOverview An AI agent for monitoring daily crop growth.
 *
 * - monitorCropGrowth - A function that analyzes a daily photo of a crop.
 * - CropGrowthInput - The input type for the monitorCropGrowth function.
 * - CropGrowthOutput - The return type for the monitorCropGrowth function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CropGrowthInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the crop, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  cropType: z.string().describe('The type of crop in the photo.'),
  daysSincePlanting: z.number().describe('The number of days since the crop was planted.'),
  language: z.string().describe('The language for the analysis and recommendations (e.g., "English", "Hindi").'),
});
export type CropGrowthInput = z.infer<typeof CropGrowthInputSchema>;


const CropGrowthOutputSchema = z.object({
  growthStage: z.string().describe('The identified growth stage of the crop (e.g., "Germination", "Vegetative", "Flowering", "Fruiting"). This field MUST be in the requested language.'),
  observations: z.string().describe('Detailed observations about the plant\'s health, size, and development visible in the photo. This field MUST be in the requested language.'),
  recommendations: z.string().describe('Actionable recommendations for the farmer based on the current growth stage and observations. This field MUST be in the requested language.'),
});
export type CropGrowthOutput = z.infer<typeof CropGrowthOutputSchema>;

export async function monitorCropGrowth(input: CropGrowthInput): Promise<CropGrowthOutput> {
  return cropGrowthFlow(input);
}

const prompt = ai.definePrompt({
  name: 'cropGrowthPrompt',
  input: {schema: CropGrowthInputSchema},
  output: {schema: CropGrowthOutputSchema},
  prompt: `You are an expert agronomist. Analyze the provided image of a {{cropType}} plant, which is {{daysSincePlanting}} days old, to assess its growth and health.

**IMPORTANT INSTRUCTIONS:**
1.  Your entire response, including all fields, MUST be in the language specified: **{{{language}}}**.
2.  You MUST provide the output in the specified JSON format.
3.  **Growth Stage**: Identify the current growth stage (e.g., Germination, Seedling, Vegetative, Flowering, Fruiting).
4.  **Observations**: Describe what you see in the image. Note the plant's size, leaf color, stem thickness, and any signs of stress, pests, or disease.
5.  **Recommendations**: Provide clear, actionable advice for the farmer based on the growth stage and your observations.

**INPUT DATA:**
*   **Crop Type**: {{{cropType}}}
*   **Days Since Planting**: {{{daysSincePlanting}}}
*   **Photo**: {{media url=photoDataUri}}

Begin analysis and provide the structured JSON output now.
`,
});

const cropGrowthFlow = ai.defineFlow(
  {
    name: 'cropGrowthFlow',
    inputSchema: CropGrowthInputSchema,
    outputSchema: CropGrowthOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("The AI model did not return a valid analysis. The image may be unclear or not a plant.");
    }
    return output;
  }
);
