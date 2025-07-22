
'use server';

/**
 * @fileOverview An AI agent for predicting future mandi prices for crops.
 *
 * - predictMandiPrice - A function that predicts the price for a given crop for the next 4 weeks.
 * - PredictMandiPriceInput - The input type for the predictMandiPrice function.
 * - PredictMandiPriceOutput - The return type for the predictMandiPrice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictMandiPriceInputSchema = z.object({
  cropType: z.string().describe('The type of crop for which to predict the price.'),
  location: z.string().describe('The geographical location (market/mandi) of the crop.'),
  language: z.string().describe('The language for the output.'),
});
export type PredictMandiPriceInput = z.infer<typeof PredictMandiPriceInputSchema>;

const WeeklyPredictionSchema = z.object({
  week: z.string().describe('The week for the prediction (e.g., "Week 1", "Week 2").'),
  price: z.number().describe('The predicted price per quintal for that week.'),
});

const PredictMandiPriceOutputSchema = z.object({
  predictions: z.array(WeeklyPredictionSchema).describe('A list of price predictions for the next 4 weeks.'),
  analysis: z.string().describe('A brief analysis of the price trend and the factors influencing it. Must be in the requested language.'),
});
export type PredictMandiPriceOutput = z.infer<typeof PredictMandiPriceOutputSchema>;


export async function predictMandiPrice(input: PredictMandiPriceInput): Promise<PredictMandiPriceOutput> {
  return predictMandiPriceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictMandiPricePrompt',
  input: {schema: PredictMandiPriceInputSchema},
  output: {schema: PredictMandiPriceOutputSchema},
  prompt: `You are an expert agricultural market analyst. Your task is to predict the mandi price for a specific crop for the next four weeks.

**INPUTS:**
*   Crop: {{{cropType}}}
*   Location: {{{location}}}
*   Language: {{{language}}}

**INSTRUCTIONS:**
1.  Analyze historical data, seasonality, weather patterns, and current market sentiment to make your predictions.
2.  Provide a week-by-week price prediction for the next 4 weeks. The price should be per quintal.
3.  Provide a brief analysis explaining your prediction (e.g., "Prices are expected to rise due to festive demand," or "Prices may dip as new harvest arrives in the market.").
4.  The 'analysis' field MUST be in the requested language: **{{{language}}}**.
5.  Your entire response MUST be a valid JSON object matching the defined schema.

Provide the structured JSON output now.
`,
});

const predictMandiPriceFlow = ai.defineFlow(
  {
    name: 'predictMandiPriceFlow',
    inputSchema: PredictMandiPriceInputSchema,
    outputSchema: PredictMandiPriceOutputSchema,
  },
  async (input) => {
    // In a real application, you might fetch historical data here.
    // For this simulation, we'll just pass the input to the prompt.
    const {output} = await prompt(input);
    return output!;
  }
);
