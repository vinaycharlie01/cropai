
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
  location: z.string().describe('The geographical location (state) of the crop.'),
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
  input: {
    schema: z.object({
      currentPrice: z.number(),
      cropType: z.string(),
      location: z.string(),
      language: z.string(),
    }),
  },
  output: {schema: PredictMandiPriceOutputSchema},
  prompt: `You are an expert agricultural market analyst. Your task is to predict the mandi price for a specific crop for the next four weeks based on the provided current price.

**INPUTS:**
*   Crop: {{{cropType}}}
*   Location (State): {{{location}}}
*   Language: {{{language}}}
*   Current Modal Price (per quintal): {{{currentPrice}}}

**INSTRUCTIONS:**
1.  Use the provided 'Current Modal Price' as the starting point for your week 1 prediction.
2.  Analyze historical data, seasonality, weather patterns, and current market sentiment to make your predictions for the subsequent 3 weeks.
3.  Provide a week-by-week price prediction for the next 4 weeks. The price should be per quintal.
4.  Provide a brief analysis explaining your prediction (e.g., "Prices are expected to rise due to festive demand," or "Prices may dip as new harvest arrives in the market.").
5.  The 'analysis' field MUST be in the requested language: **{{{language}}}**.
6.  Your entire response MUST be a valid JSON object matching the defined schema.

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
    // Reverted to using a default fallback price
    const currentPrice = 2000;

    const {output} = await prompt({
        ...input,
        currentPrice: currentPrice,
    });
    
    return output!;
  }
);


export const predictMandiPriceTool = ai.defineTool(
    {
        name: 'predictMandiPriceTool',
        description: 'Predicts the mandi (market) price for a given crop for the next 4 weeks. Use this if a user asks about future prices or price forecasts.',
        inputSchema: PredictMandiPriceInputSchema,
        outputSchema: PredictMandiPriceOutputSchema,
    },
    async (input) => predictMandiPriceFlow(input)
);
