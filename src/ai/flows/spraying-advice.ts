
'use server';

/**
 * @fileOverview An AI agent that provides daily pesticide spraying advice based on a 5-day weather forecast.
 *
 * - getSprayingAdvice - A function that returns a list of daily spraying recommendations.
 * - SprayingAdviceInput - The input type for the getSprayingAdvice function.
 * - SprayingAdvice - The individual advice type in the output array.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { DailyForecastSchema as WeatherDailyForecastSchema } from '@/types/weather';


const SprayingAdviceInputSchema = z.object({
  forecast: z.array(WeatherDailyForecastSchema),
  language: z.string().describe('The language for the advice (e.g., "English", "Hindi").'),
});
export type SprayingAdviceInput = z.infer<typeof SprayingAdviceInputSchema>;


const SprayingAdviceSchema = z.object({
  day: z.string().describe('The day of the week for the advice (e.g., "Mon").'),
  status: z.enum(['Optimal', 'Moderate', 'Unfavourable']).describe('The suitability for spraying.'),
  reason: z.string().describe('A brief, simple explanation for the status. Must be in the requested language.'),
});
export type SprayingAdvice = z.infer<typeof SprayingAdviceSchema>;

const SprayingAdviceOutputSchema = z.array(SprayingAdviceSchema);


export async function getSprayingAdvice(input: z.infer<typeof SprayingAdviceInputSchema>): Promise<SprayingAdvice[]> {
  return sprayingAdviceFlow(input);
}


const prompt = ai.definePrompt({
  name: 'sprayingAdvicePrompt',
  input: { schema: SprayingAdviceInputSchema },
  output: { schema: SprayingAdviceOutputSchema },
  prompt: `You are an expert agricultural advisor. Your task is to analyze a 5-day weather forecast and provide daily advice on whether conditions are suitable for spraying pesticides or fungicides.

**Analysis Criteria:**
- **Optimal Conditions:** Low wind (under 10 kph), low chance of rain (under 25%), and moderate temperatures.
- **Moderate Conditions:** Medium wind (10-15 kph), or a moderate chance of rain (25-50%). Spraying is possible but requires caution.
- **Unfavourable Conditions:** High wind (over 15 kph) which causes drift, high chance of rain (over 50%) which washes away the spray, or extreme temperatures.

**INSTRUCTIONS:**
1.  Analyze each day in the provided forecast.
2.  For each day, determine if the conditions are 'Optimal', 'Moderate', or 'Unfavourable' for spraying.
3.  Provide a concise, simple 'reason' for your status in the requested language: **{{{language}}}**.
4.  Return the results as a JSON array of 5 objects, one for each day of the forecast.

**5-Day Weather Forecast Data:**
{{#each forecast}}
- **Day:** {{day}}
- **Temperature:** {{temp}}
- **Condition:** {{condition}}
- **Wind Speed (kph):** {{wind_kph}}
- **Chance of Rain (%):** {{chance_of_rain}}
{{/each}}

Generate the structured JSON output now.
`,
});

const sprayingAdviceFlow = ai.defineFlow(
  {
    name: 'sprayingAdviceFlow',
    inputSchema: SprayingAdviceInputSchema,
    outputSchema: SprayingAdviceOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
        throw new Error("The AI model did not return valid spraying advice.");
    }
    return output;
  }
);


export const sprayingAdviceTool = ai.defineTool(
    {
        name: 'sprayingAdviceTool',
        description: 'Analyzes a 5-day weather forecast to provide daily advice on whether conditions are suitable for spraying pesticides or fungicides.',
        inputSchema: SprayingAdviceInputSchema,
        outputSchema: SprayingAdviceOutputSchema,
    },
    async (input) => sprayingAdviceFlow(input)
);
