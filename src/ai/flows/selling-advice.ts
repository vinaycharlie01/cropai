
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
  location: z.string().describe('The current location of the farmer.'),
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
  prompt: `You are an agricultural market expert. Based on the provided crop type and farmer's location, provide detailed advice on the best time and place to sell the crop for maximum profit.

Consider factors like current market trends, demand in nearby cities/mandis, off-season advantages, and storage options.

Crop Type: {{{cropType}}}
Location: {{{location}}}

Provide actionable advice to help a small-scale farmer.
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
