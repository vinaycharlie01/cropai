
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
import { translations, TranslationKeys } from '@/lib/translations';

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
  prompt: `You are an expert agronomist and data analyst. Analyze the provided history of crop disease diagnoses to identify trends and provide an overall assessment and preventative advice.

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

// Helper function to find the translation key for a given English value.
const findTranslationKey = (value: string): TranslationKeys | null => {
    const valueLower = value.toLowerCase().replace(/\s+/g, '');
    for (const key in translations.en) {
        if (translations.en[key as TranslationKeys].toLowerCase().replace(/\s+/g, '') === valueLower) {
            return key as TranslationKeys;
        }
    }
    return null;
}

const cropHealthAnalyticsFlow = ai.defineFlow(
  {
    name: 'cropHealthAnalyticsFlow',
    inputSchema: CropHealthAnalyticsInputSchema,
    outputSchema: CropHealthAnalyticsOutputSchema,
  },
  async input => {
    const { diagnosisHistory, language } = input;
    const targetLanguage = language as keyof typeof translations;

    // Translate the history before sending it to the prompt
    const translatedHistory = diagnosisHistory.map(item => {
        const t = (key: TranslationKeys) => translations[targetLanguage]?.[key] || translations.en[key];
        
        const cropKey = findTranslationKey(item.cropType);
        const diseaseKey = findTranslationKey(item.disease);

        return {
            ...item,
            cropType: cropKey ? t(cropKey) : item.cropType,
            disease: diseaseKey ? t(diseaseKey) : item.disease,
        };
    });

    const { output } = await prompt({
        diagnosisHistory: translatedHistory,
        language: targetLanguage
    });
    
    return output!;
  }
);
