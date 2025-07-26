
'use server';

/**
 * @fileOverview An AI agent for monitoring daily crop growth, comparing it against benchmarks.
 *
 * - monitorCropGrowth - A function that analyzes a daily photo of a crop.
 * - CropGrowthInput - The input type for the monitorCropGrowth function.
 * - CropGrowthOutput - The return type for the monitorCropGrowth function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getGrowthBenchmark } from '@/lib/growth-benchmarks';

const CropGrowthInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the crop, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  cropType: z.string().describe('The type of crop in the photo.'),
  daysSincePlanting: z.number().describe('The number of days since the crop was planted.'),
  language: z.string().describe('The language for the analysis and recommendations (e.g., "English", "Hindi").'),
  // Optional fields for more advanced analysis
  previousPhotoDataUri: z.string().optional().describe('A data URI of the previous photo for comparison.'),
});
export type CropGrowthInput = z.infer<typeof CropGrowthInputSchema>;


const CropGrowthOutputSchema = z.object({
  growthStage: z.string().describe('The identified growth stage of the crop (e.g., "Germination", "Vegetative", "Flowering", "Fruiting"). This field MUST be in the requested language.'),
  growthRating: z.number().min(1).max(5).describe('A rating from 1 to 5 indicating how well the crop is growing compared to the ideal benchmark (1=very poor, 5=excellent).'),
  observations: z.string().describe('Detailed observations about the plant\'s health, size, and development visible in the photo, especially in comparison to the ideal state. This field MUST be in the requested language.'),
  recommendations: z.string().describe('Actionable recommendations for the farmer based on the current growth stage and observations. If growth is poor, provide specific advice. This field MUST be in the requested language.'),
});
export type CropGrowthOutput = z.infer<typeof CropGrowthOutputSchema>;

export async function monitorCropGrowth(input: CropGrowthInput): Promise<CropGrowthOutput> {
  return cropGrowthFlow(input);
}

const prompt = ai.definePrompt({
  name: 'cropGrowthPrompt',
  input: {schema: z.object({
    photoDataUri: z.string(),
    cropType: z.string(),
    daysSincePlanting: z.number(),
    language: z.string(),
    previousPhotoDataUri: z.string().optional(),
    idealBenchmark: z.string(),
  })},
  output: {schema: CropGrowthOutputSchema},
  prompt: `You are an expert agronomist. Analyze the provided image of a {{cropType}} plant, which is {{daysSincePlanting}} days old, to assess its growth and health. Compare it with the ideal growth benchmark and the previous photo if available.

**IMPORTANT INSTRUCTIONS:**
1.  Your entire response, including all fields, MUST be in the language specified: **{{{language}}}**.
2.  **Ideal Benchmark**: The ideal state for a {{cropType}} at this age is: "{{idealBenchmark}}". Use this as your primary reference for comparison.
3.  **Growth Rating**: Rate the crop's growth from 1 (very poor) to 5 (excellent) based on how closely it matches the ideal benchmark.
4.  **Growth Stage**: Identify the current growth stage (e.g., Germination, Seedling, Vegetative, Flowering, Fruiting).
5.  **Observations**: Describe what you see. Crucially, compare the photo to the benchmark. Note plant size, leaf color, stem thickness, and any signs of stress, pests, or disease that cause it to deviate from the ideal state. If a previous image is provided, comment on the change (e.g., "significant new leaf growth since last photo").
6.  **Recommendations**: Provide clear, actionable advice. If growth is not ideal (rating < 4), suggest specific actions like adding a particular nutrient, adjusting water, or checking for pests. If growth is good, provide routine care tips.

**INPUT DATA:**
*   **Crop Type**: {{{cropType}}}
*   **Days Since Planting**: {{{daysSincePlanting}}}
*   **Ideal Benchmark for this stage**: {{{idealBenchmark}}}
*   **Current Photo**: {{media url=photoDataUri}}
*   {{#if previousPhotoDataUri}}**Previous Photo**: {{media url=previousPhotoDataUri}}{{/if}}

Begin analysis and provide the structured JSON output now.
`,
});

const cropGrowthFlow = ai.defineFlow(
  {
    name: 'cropGrowthFlow',
    inputSchema: CropGrowthInputSchema,
    outputSchema: CropGrowthOutputSchema,
  },
  async (input) => {
    // Get the ideal growth benchmark for the crop at this specific age.
    const idealBenchmark = getGrowthBenchmark(input.cropType, input.daysSincePlanting);

    const {output} = await prompt({ ...input, idealBenchmark });
    if (!output) {
      throw new Error("The AI model did not return a valid analysis. The image may be unclear or not a plant.");
    }
    return output;
  }
);
