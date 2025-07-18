
'use server';

/**
 * @fileOverview An AI agent for providing crop insurance advice.
 *
 * - getInsuranceAdvice - A function that provides advice on which insurance scheme to choose.
 * - InsuranceAdviceInput - The input type for the getInsuranceAdvice function.
 * - InsuranceAdviceOutput - The return type for the getInsuranceAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InsuranceAdviceInputSchema = z.object({
  cropType: z.string().describe('The type of crop being insured.'),
  location: z.string().describe('The geographical location (state/district) of the farm.'),
  landArea: z.number().describe('The area of land in acres.'),
  sumInsured: z.number().describe('The desired sum insured for the crop.'),
  language: z.string().describe('The language for the advice (e.g., "English", "Hindi").'),
});
export type InsuranceAdviceInput = z.infer<typeof InsuranceAdviceInputSchema>;

const InsuranceAdviceOutputSchema = z.object({
  recommendation: z.string().describe('A clear recommendation for either "PMFBY" or "Private Insurance".'),
  reasoning: z.string().describe('A detailed explanation for the recommendation, considering the benefits and drawbacks of each scheme for the given user inputs. This field MUST be in the requested language.'),
  pmfbyDetails: z.string().describe('A brief summary of the PMFBY scheme benefits relevant to the user. This field MUST be in the requested language.'),
  privateDetails: z.string().describe('A brief summary of what to look for in a private insurance scheme. This field MUST be in the requested language.'),
});
export type InsuranceAdviceOutput = z.infer<typeof InsuranceAdviceOutputSchema>;

export async function getInsuranceAdvice(input: InsuranceAdviceInput): Promise<InsuranceAdviceOutput> {
  return insuranceAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'insuranceAdvicePrompt',
  input: {schema: InsuranceAdviceInputSchema},
  output: {schema: InsuranceAdviceOutputSchema},
  prompt: `You are an expert agricultural insurance advisor in India. Your task is to recommend the best insurance option (PMFBY or Private Insurance) for a farmer based on their specific situation.

**FARMER'S DETAILS:**
*   Crop Type: {{{cropType}}}
*   Location: {{{location}}}
*   Land Area: {{{landArea}}} acres
*   Desired Sum Insured: ₹{{{sumInsured}}}
*   Language for response: {{{language}}}

**INSTRUCTIONS:**
1.  **Analyze the farmer's details.** Consider the crop type, location, and scale of farming.
2.  **Make a clear recommendation:** Choose either "PMFBY" or "Private Insurance". Generally, for small to medium-scale farmers, PMFBY is highly recommended due to government subsidies. Private insurance might be better for very large-scale operations or for crops/regions not covered well by PMFBY.
3.  **Provide detailed reasoning** for your recommendation. Explain the pros and cons of each option in the context of the farmer's details.
4.  **Summarize PMFBY benefits** and **what to look for in private insurance**.
5.  Your entire response MUST be in the requested language: **{{{language}}}**.
6.  You MUST provide the output in the specified JSON format.

Provide your structured JSON advice now.
`,
});

const insuranceAdviceFlow = ai.defineFlow(
  {
    name: 'insuranceAdviceFlow',
    inputSchema: InsuranceAdviceInputSchema,
    outputSchema: InsuranceAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
