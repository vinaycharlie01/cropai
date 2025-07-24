
'use server';

/**
 * @fileOverview An AI agent for providing personalized government scheme recommendations to farmers.
 *
 * - getSchemeRecommendations - Analyzes a farmer's profile and returns a list of suitable schemes.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { schemesDatabase, filterSchemesByKeywords } from '@/lib/schemes-database';
import { SchemeFinderInput, SchemeFinderInputSchema, SchemeRecommendation, SchemeFinderOutput, SchemeFinderOutputSchema } from '@/types/scheme-advisor';

// This is the schema of what we want the AI to return. Note it does not include the URL.
const AISchemeRecommendationSchema = z.object({
    schemeName: z.string().describe('The official name of the recommended scheme. This MUST match the name in the database.'),
    description: z.string().describe('A brief, simple description of the scheme and its purpose. This MUST be in the requested language.'),
    eligibility: z.string().describe('A summary of the key eligibility criteria for the scheme. This MUST be in the requested language.'),
    benefits: z.string().describe('A list of the primary benefits provided by the scheme. This MUST be in the requested language.'),
    howToApply: z.string().describe('Simple, step-by-step instructions on how to apply for the scheme. This MUST be in the requested language.'),
});
const AIOutputSchema = z.array(AISchemeRecommendationSchema);


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
    output: { schema: AIOutputSchema }, // The AI's output will be validated against the schema without the URL.
    prompt: `You are an expert advisor on Indian government schemes for farmers. Your task is to analyze a farmer's profile and recommend the most suitable schemes from the provided database.

**IMPORTANT INSTRUCTIONS:**
1.  **Analyze the Farmer's Profile:** Carefully review all the details provided by the farmer.
2.  **Match with Scheme Database:** Compare the farmer's profile against the criteria of each scheme in the database.
3.  **Filter for Relevance:** Only return schemes for which the farmer is likely eligible and which match their stated needs ('helpType').
4.  **Provide Detailed, Translated Output:** For each recommended scheme, you must provide the 'schemeName', 'description', 'eligibility', 'benefits', and 'howToApply' fields, translated into the requested language: **{{{profile.language}}}**.
5.  **Use Exact Scheme Name:** The 'schemeName' in your output MUST EXACTLY match the 'name' from the provided database entry for that scheme. This is critical.
6.  **Be Empathetic:** If no schemes are a good match, return an empty array. Do not recommend schemes the farmer is not eligible for.

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
    outputSchema: SchemeFinderOutputSchema, // The final flow output will match the full schema with the URL.
  },
  async (profile) => {
    try {
        // First, try to get personalized recommendations from the AI.
        const { output } = await prompt({
            profile: profile,
            schemes: JSON.stringify(schemesDatabase, null, 2),
        });

        if (!output) {
            return [];
        }

        // Post-process the AI output to add the URL from our trusted database.
        const fullRecommendations: SchemeRecommendation[] = output
            .map(aiRec => {
                const originalScheme = schemesDatabase.find(dbScheme => dbScheme.name === aiRec.schemeName);
                if (!originalScheme) {
                    return null;
                }
                return {
                    ...aiRec,
                    applicationUrl: originalScheme.applicationUrl,
                };
            })
            .filter((rec): rec is SchemeRecommendation => rec !== null);

        return fullRecommendations;

    } catch (e: any) {
        console.error("Scheme Advisor AI failed, using keyword fallback:", e);
        // Fallback to simple keyword matching if the AI fails.
        const fallbackResults = filterSchemesByKeywords(profile.helpType);
        
        // The fallback provides untranslated, raw data. This is better than an error.
        return fallbackResults.map(scheme => ({
            schemeName: scheme.name,
            description: scheme.description,
            eligibility: `Eligibility criteria apply. Please visit the official scheme page for details.`,
            benefits: scheme.benefits,
            howToApply: scheme.howToApply,
            applicationUrl: scheme.applicationUrl,
        }));
    }
  }
);


export const schemeAdvisorTool = ai.defineTool(
    {
        name: 'schemeAdvisorTool',
        description: 'Finds relevant government schemes for a farmer based on their profile and needs. Use this when a user asks about government support, subsidies, or schemes.',
        inputSchema: SchemeFinderInputSchema,
        outputSchema: SchemeFinderOutputSchema,
    },
    async (input) => schemeAdvisorFlow(input)
);
