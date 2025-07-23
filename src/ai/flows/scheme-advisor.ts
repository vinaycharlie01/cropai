
'use server';

/**
 * @fileOverview An AI agent for providing personalized government scheme recommendations to farmers.
 *
 * - getSchemeRecommendations - Analyzes a farmer's profile and returns a list of suitable schemes.
 * - SchemeFinderInput - The input type for the getSchemeRecommendations function.
 * - SchemeFinderOutput - The return type for the getSchemeRecommendations function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { schemesDatabase } from '@/lib/schemes-database';

const SchemeFinderInputSchema = z.object({
  helpType: z.string().describe("The type of help the farmer is looking for (e.g., 'Crop Insurance', 'Financial Support')."),
  state: z.string().describe("The farmer's state."),
  farmerType: z.string().describe("The type of farmer (e.g., 'Landholder', 'Tenant')."),
  hasLand: z.enum(['yes', 'no']).describe("Whether the farmer owns land."),
  landArea: z.string().optional().describe("The area of land owned, if applicable (e.g., '2 acres')."),
  cropType: z.string().optional().describe("The primary crop the farmer grows."),
  language: z.string().describe('The language for the response (e.g., "English", "Hindi").'),
});
export type SchemeFinderInput = z.infer<typeof SchemeFinderInputSchema>;


const SchemeRecommendationSchema = z.object({
    schemeName: z.string().describe('The official name of the recommended scheme.'),
    description: z.string().describe('A brief, simple description of the scheme and its purpose. This MUST be in the requested language.'),
    eligibility: z.string().describe('A summary of the key eligibility criteria for the scheme. This MUST be in the requested language.'),
    benefits: z.string().describe('A list of the primary benefits provided by the scheme. This MUST be in the requested language.'),
    howToApply: z.string().describe('Simple, step-by-step instructions on how to apply for the scheme. This MUST be in the requested language.'),
});

export const SchemeFinderOutputSchema = z.array(SchemeRecommendationSchema);
export type SchemeFinderOutput = z.infer<typeof SchemeFinderOutputSchema>;


export async function getSchemeRecommendations(input: SchemeFinderInput): Promise<SchemeFinderOutput> {
  return schemeAdvisorFlow(input);
}


const prompt = ai.definePrompt({
    name: 'schemeAdvisorPrompt',
    input: {
        schema: z.object({
            profile: SchemeFinderInputSchema,
            schemes: z.string(),
        }),
    },
    output: { schema: SchemeFinderOutputSchema },
    prompt: `You are an expert advisor on Indian government schemes for farmers. Your task is to analyze a farmer's profile and recommend the most suitable schemes from the provided database.

**IMPORTANT INSTRUCTIONS:**
1.  **Analyze the Farmer's Profile:** Carefully review all the details provided by the farmer.
2.  **Match with Scheme Database:** Compare the farmer's profile against the criteria of each scheme in the database.
3.  **Filter for Relevance:** Only return schemes for which the farmer is likely eligible and which match their stated needs ('helpType').
4.  **Provide Detailed, Translated Output:** For each recommended scheme, provide all the required fields (schemeName, description, eligibility, benefits, howToApply). The entire response MUST be in the requested language: **{{{profile.language}}}**.
5.  **Be Empathetic:** If no schemes are a good match, return an empty array. Do not recommend schemes the farmer is not eligible for.

**FARMER'S PROFILE:**
*   Seeking Help For: {{{profile.helpType}}}
*   State: {{{profile.state}}}
*   Farmer Type: {{{profile.farmerType}}}
*   Owns Land: {{{profile.hasLand}}}
*   Land Area: {{{profile.landArea}}}
*   Crop Grown: {{{profile.cropType}}}

**SCHEME DATABASE (JSON):**
{{{schemes}}}

Now, analyze the profile and the database, and return a JSON array of personalized scheme recommendations.
`,
});


const schemeAdvisorFlow = ai.defineFlow(
  {
    name: 'schemeAdvisorFlow',
    inputSchema: SchemeFinderInputSchema,
    outputSchema: SchemeFinderOutputSchema,
  },
  async (profile) => {
    const { output } = await prompt({
        profile: profile,
        schemes: JSON.stringify(schemesDatabase, null, 2),
    });

    if (!output) {
        return [];
    }

    return output;
  }
);
