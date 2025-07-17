
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
  advice: z.string().describe('Detailed advice on the best time and place to sell the crop for maximum profit, including potential markets and pricing strategies.'),
});
export type SellingAdviceOutput = z.infer<typeof SellingAdviceOutputSchema>;

export async function getSellingAdvice(input: SellingAdviceInput): Promise<SellingAdviceOutput> {
  return sellingAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'sellingAdvicePrompt',
  input: {schema: SellingAdviceInputSchema},
  output: {schema: SellingAdviceOutputSchema},
  prompt: `You are an agricultural market expert. Based on the provided crop type, quantity, farmer's location, and desired selling time, provide detailed advice on the best time and place to sell the crop for maximum profit.

Consider factors like current market trends, demand in nearby cities/mandis, off-season advantages, storage options, and transportation costs.

Crop Type: {{{cropType}}}
Quantity: {{{quantity}}}
Location: {{{location}}}
Desired Sell Time: {{{desiredSellTime}}}

Your response MUST be in the following language: {{{language}}}.

Provide actionable advice. Specifically include:
1.  The single best market/place to sell for maximum profit right now.
2.  A few alternative markets with their potential pros and cons.
3.  General advice based on the quantity and desired sell time (e.g., "For this quantity, it might be better to sell in bulk at a larger mandi," or "If you can wait, prices are expected to rise in a month.").
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
    return output!;
  }
);
