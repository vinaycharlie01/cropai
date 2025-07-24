
import { z } from 'zod';

export const SchemeFinderInputSchema = z.object({
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
    applicationUrl: z.string().url().describe('The direct, official URL to the application portal or information page for the scheme.'),
});
export type SchemeRecommendation = z.infer<typeof SchemeRecommendationSchema>;

export const SchemeFinderOutputSchema = z.array(SchemeRecommendationSchema);
export type SchemeFinderOutput = z.infer<typeof SchemeFinderOutputSchema>;
