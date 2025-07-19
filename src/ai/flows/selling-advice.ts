
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

const AlternativeMarketSchema = z.object({
  marketName: z.string().describe("The name of the alternative market."),
  pros: z.string().describe("The potential advantages of selling at this market."),
  cons: z.string().describe("The potential disadvantages of selling at this market."),
});

const SellingAdviceOutputSchema = z.object({
  bestMarket: z.object({
    name: z.string().describe('The name of the single best market/place to sell for maximum profit right now.'),
    reason: z.string().describe('A brief reason why this is the best market.'),
  }),
  alternativeMarkets: z.array(AlternativeMarketSchema).describe('A list of 2-3 alternative markets with their pros and cons.'),
  generalAdvice: z.string().describe('General advice based on the quantity and desired sell time (e.g., "For this quantity, it might be better to sell in bulk," or "If you can wait, prices are expected to rise.").'),
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

Your entire response MUST be in the language specified: **{{{language}}}**.
Your entire response must conform to the JSON output schema.

Consider factors like current market trends, demand in nearby cities/mandis, off-season advantages, storage options, and transportation costs.

Crop Type: {{{cropType}}}
Quantity: {{{quantity}}}
Location: {{{location}}}
Desired Sell Time: {{{desiredSellTime}}}

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
