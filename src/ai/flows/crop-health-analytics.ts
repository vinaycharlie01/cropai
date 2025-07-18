
'use server';

/**
 * @fileOverview An AI agent for analyzing crop health diagnosis history.
 *
 * - getCropHealthAnalytics - A function that analyzes a list of past diagnoses.
 * - CropHealthAnalyticsInput - The input type for the getCropHealthAnalytics function.
 * - CropHealthAnalyticsOutput - The return type for the getCropHealthAnalytics function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DiagnosisHistoryItemSchema = z.object({
  date: z.string().describe('The date of the diagnosis.'),
  cropType: z.string().describe('The type of crop diagnosed.'),
  disease: z.string().describe('The diagnosed disease. "Healthy" if no disease was found.'),
  confidence: z.number().describe('The confidence score of the diagnosis (0-1).'),
});

const CropHealthAnalyticsInputSchema = z.object({
  diagnosisHistory: z.array(DiagnosisHistoryItemSchema).describe('An array of past diagnosis results.'),
  language: z.string().describe('The language for the analysis and recommendations (e.g., "English", "Hindi").'),
});
export type CropHealthAnalyticsInput = z.infer<typeof CropHealthAnalyticsInputSchema>;

const CropHealthAnalyticsOutputSchema = z.object({
  overallAssessment: z.string().describe('A brief, 1-2 sentence overall assessment of the crop health based on the provided history. Must be in the requested language.'),
  trends: z.string().describe('Identified trends or recurring issues (e.g., "Recurring fungal infections in tomato crops during monsoon season."). Must be in the requested language.'),
  preventativeAdvice: z.string().describe('Actionable, preventative advice to improve future crop health based on the identified trends. Must be in the requested language.'),
});
export type CropHealthAnalyticsOutput = z.infer<typeof CropHealthAnalyticsOutputSchema>;


export async function getCropHealthAnalytics(input: CropHealthAnalyticsInput): Promise<CropHealthAnalyticsOutput> {
  return cropHealthAnalyticsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'cropHealthAnalyticsPrompt',
  input: {schema: CropHealthAnalyticsInputSchema},
  output: {schema: CropHealthAnalyticsOutputSchema},
  prompt: `You are an expert agronomist and data analyst. Analyze the provided history of crop disease diagnoses to identify trends and provide an overall assessment and preventative advice. The input data will be in English.

**INPUT DATA: Diagnosis History**
{{#each diagnosisHistory}}
- Date: {{date}}, Crop: {{cropType}}, Diagnosis: {{disease}}, Confidence: {{confidence}}
{{/each}}

**INSTRUCTIONS:**
1.  **Overall Assessment**: Write a 1-2 sentence summary of the farm's health status based on the data.
2.  **Trends**: Identify any recurring diseases, seasonal patterns, or crops that are frequently unhealthy. If no clear trend, state that.
3.  **Preventative Advice**: Based on the trends, provide specific, actionable advice to prevent these issues in the future.
4.  Your entire response MUST be in the requested language: **{{{language}}}**.
5.  Provide the output in the specified JSON format.

Analyze the data and provide the structured JSON output now.
`,
});

const cropHealthAnalyticsFlow = ai.defineFlow(
  {
    name: 'cropHealthAnalyticsFlow',
    inputSchema: CropHealthAnalyticsInputSchema,
    outputSchema: CropHealthAnalyticsOutputSchema,
  },
  async input => {
    // The prompt is capable of handling translation, so we pass the input directly.
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("The AI model did not return a valid analysis.");
    }
    return output;
  }
);
