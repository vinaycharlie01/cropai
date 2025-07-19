
'use server';

/**
 * @fileOverview An AI agent for providing crop selling advice.
 *
 * - getSellingAdvice - A function that provides advice on the best time and place to sell crops.
 * - SellingAdviceInput - The input type for the getSellingAdvice function.
 * - SellingAdviceOutput - The return type for the getSellingAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SellingAdviceInputSchema = z.object({
  cropType: z.string().describe('The type of crop to be sold.'),
  quantity: z.string().describe('The quantity of the crop to be sold (e.g., "10 quintals").'),
  location: z.string().describe('The current location of the farmer.'),
  desiredSellTime: z.string().describe('The desired timeframe for selling the crop (e.g., "immediately", "within a week").'),
  language: z.string().describe('The language for the advice (e.g., "English", "Hindi", "Telugu").'),
});
export type SellingAdviceInput = z.infer<typeof SellingAdviceInputSchema>;

const SellingAdviceOutputSchema = z.object({
  advice: z.string().describe('A comprehensive paragraph of selling advice. Include the best market, alternative markets, and general tips. This entire field must be in the requested language.'),
});
export type SellingAdviceOutput = z.infer<typeof SellingAdviceOutputSchema>;

export async function getSellingAdvice(input: SellingAdviceInput): Promise<SellingAdviceOutput> {
  return sellingAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'sellingAdvicePrompt',
  input: {schema: SellingAdviceInputSchema},
  output: {schema: SellingAdviceOutputSchema},
  prompt: `You are an agricultural market expert. Based on the provided crop type, quantity, farmer's location, and desired selling time, provide detailed advice in a single comprehensive paragraph.

Your response MUST be in the language specified: **{{{language}}}**.
Your entire response must conform to the JSON output schema, with all advice contained in the single 'advice' field.

Consider factors like current market trends, demand in nearby cities/mandis, off-season advantages, storage options, and transportation costs. Provide clear and actionable advice for the farmer.

**Farmer's Details:**
*   Crop Type: {{{cropType}}}
*   Quantity: {{{quantity}}}
*   Location: {{{location}}}
*   Desired Sell Time: {{{desiredSellTime}}}

Provide your structured JSON response now.
`,
});

const sellingAdviceFlow = ai.defineFlow(
  {
    name: 'sellingAdviceFlow',
    inputSchema: SellingAdviceInputSchema,
    outputSchema: SellingAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("The AI model did not return a valid selling advice.");
    }
    return output;
  }
);
