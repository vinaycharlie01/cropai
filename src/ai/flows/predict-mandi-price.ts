
'use server';

/**
 * @fileOverview An AI agent for predicting Mandi (market) price trends for crops.
 *
 * - predictMandiPrice - A function that generates a 4-week price forecast for a given crop and location.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { MandiPricePredictionInputSchema, MandiPricePredictionOutputSchema, MandiPricePredictionInput, MandiPricePredictionOutput } from '@/types/mandi-prices';


export async function predictMandiPrice(input: MandiPricePredictionInput): Promise<MandiPricePredictionOutput> {
  return predictMandiPriceFlow(input);
}

const prompt = ai.definePrompt({
    name: 'mandiPricePredictionPrompt',
    input: { schema: MandiPricePredictionInputSchema },
    output: { schema: MandiPricePredictionOutputSchema },
    prompt: `You are an expert agricultural market analyst for the Indian market. Your task is to generate a 4-week price forecast for a given crop in a specific location.

**INSTRUCTIONS:**
1.  **Analyze Inputs:** Consider the crop type ('{{{cropType}}}') and location ('{{{location}}}'). Factor in seasonality, typical demand/supply cycles, and recent market news for this region.
2.  **Current Price:** To provide a realistic forecast, start by establishing a plausible current market price (per quintal) for the crop in the given location.
3.  **Weekly Forecast:** Generate a forecast for each of the next 4 weeks.
    *   For each week, provide a predicted price (per quintal).
    *   Indicate the trend ('up', 'down', 'stable').
    *   Provide a brief, simple reasoning for that week's trend (e.g., "Harvest arrivals increasing, putting downward pressure on prices.").
4.  **Overall Trend:** Write a 1-2 sentence summary of the overall 4-week trend.
5.  **Language**: Your entire response, including reasoning and trend summaries, MUST be in the requested language: **{{{language}}}**.
6.  **JSON Output**: Ensure the output strictly adheres to the provided JSON schema.

**INPUTS:**
*   **Crop:** {{{cropType}}}
*   **Location:** {{{location}}}
*   **Language:** {{{language}}}

Generate the structured JSON forecast now.
`,
});

const predictMandiPriceFlow = ai.defineFlow(
  {
    name: 'predictMandiPriceFlow',
    inputSchema: MandiPricePredictionInputSchema,
    outputSchema: MandiPricePredictionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("The AI model did not return a valid price prediction.");
    }
    return output;
  }
);

    