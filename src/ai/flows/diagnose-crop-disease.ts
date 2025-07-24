
'use server';

/**
 * @fileOverview A crop disease diagnosis AI agent.
 *
 * - diagnoseCropDisease - A function that handles the crop disease diagnosis process.
 * - DiagnoseCropDiseaseInput - The input type for the diagnoseCropdisease function.
 * - DiagnoseCropDiseaseOutput - The return type for the diagnoseCropDisease function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DiagnoseCropDiseaseInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. This is REQUIRED to diagnose a disease."
    ),
  cropType: z.string().describe('The type of crop in the photo.'),
  location: z.string().describe('The geographic location where the crop is grown.'),
  language: z.string().describe('The language for the diagnosis result (e.g., "English", "Hindi", "Telugu").'),
});
export type DiagnoseCropDiseaseInput = z.infer<typeof DiagnoseCropDiseaseInputSchema>;

const PesticideRecommendationSchema = z.object({
    pesticideName: z.string().describe('The commercial name of the pesticide product.'),
    usageInstructions: z.string().describe('Simple, clear instructions on how to apply the pesticide. Must be in the requested language.'),
    productUrl: z.string().describe('A valid, generated search URL for the product on a major Indian e-commerce platform like indiamart.com or amazon.in.')
});

const DiagnoseCropDiseaseOutputSchema = z.object({
  disease: z.string().describe('The identified disease, if any. If no disease is detected, state "Healthy". This field MUST be in the requested language.'),
  remedies: z.string().describe('Suggested general, non-pesticide remedies for the identified disease. If healthy, provide general care tips. This field MUST be in the requested language.'),
  treatment: z.string().describe('Specific, actionable treatment steps for the identified disease. If healthy, state "No treatment needed". Any pesticide names should be wrapped in markdown bold, e.g., **PesticideName**. This field MUST be in the requested language.'),
  confidence: z.number().describe('The confidence level of the diagnosis (0-1).'),
  pesticideRecommendations: z.array(PesticideRecommendationSchema).describe('A list of specific, affordable, and locally available pesticide recommendations.')
});
export type DiagnoseCropDiseaseOutput = z.infer<typeof DiagnoseCropDiseaseOutputSchema>;

export async function diagnoseCropDisease(input: DiagnoseCropDiseaseInput): Promise<DiagnoseCropDiseaseOutput> {
  return diagnoseCropDiseaseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'diagnoseCropDiseasePrompt',
  input: {schema: DiagnoseCropDiseaseInputSchema},
  output: {schema: DiagnoseCropDiseaseOutputSchema},
  prompt: `You are an expert agricultural entomologist and pathologist. Your task is to analyze the provided image and information to diagnose crop diseases or pest infestations and provide expert treatment advice.

**IMPORTANT INSTRUCTIONS:**
1.  Your entire response, including all fields and recommendations, MUST be in the language specified: **{{{language}}}**.
2.  You MUST provide the output in the specified JSON format.
3.  **Disease**: Identify the disease or pest. If the plant is healthy, you MUST state "Healthy".
4.  **Remedies**: Provide general, non-pesticide remedies or preventative care tips.
5.  **Treatment**: This is a critical section. Provide specific, actionable treatment steps. Wrap any recommended pesticide or fungicide names in markdown bold, for example: "**PesticideName**". If the plant is healthy, state "No treatment needed".
6.  **Pesticide Recommendations**: If a pest or disease is identified, provide a list of 1-3 specific, affordable, and locally available pesticide recommendations for Indian farmers.
    *   For each pesticide, provide its commercial name, simple usage instructions, and generate a valid search URL for a major Indian e-commerce platform (like indiamart.com or amazon.in) for the user to find example products.
    *   If the plant is healthy, return an empty array.
7.  **Confidence**: Provide a confidence score between 0.0 and 1.0 for your diagnosis.

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
  async (input) => {
    try {
        const {output} = await prompt(input);
        if (!output) {
          throw new Error("The AI model did not return a valid diagnosis. The image may be unclear or not a plant.");
        }
        return output;
    } catch (e: any) {
        if (e.message?.includes('503 Service Unavailable') || e.message?.includes('429 Too Many Requests')) {
            throw new Error("The AI diagnosis service is currently overloaded. Please try again in a few moments.");
        }
        throw e;
    }
  }
);
