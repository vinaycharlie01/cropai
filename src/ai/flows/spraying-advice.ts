
'use server';

/**
 * @fileOverview An AI agent that analyzes a weather forecast to provide spraying advice.
 * 
 * - getSprayingAdvice - Analyzes weather conditions and returns a recommendation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const DailyWeatherConditionSchema = z.object({
    day: z.string().describe("The day of the week (e.g., 'Mon')."),
    temp: z.string().describe("The forecasted temperature in Celsius."),
    condition: z.enum(["Sunny", "Cloudy", "Rainy", "Thunderstorm", "Snowy"]).describe("The forecasted weather condition."),
    wind_kph: z.number().describe("The forecasted average wind speed in kilometers per hour."),
    chance_of_rain: z.number().describe("The forecasted chance of rain as a percentage (0-100).")
});

const SprayingAdviceInputSchema = z.object({
  forecast: z.array(DailyWeatherConditionSchema).describe("A 5-day weather forecast."),
  language: z.string().describe("The language for the advice, e.g., 'en', 'hi'.")
});

const DailySprayingAdviceSchema = z.object({
  day: z.string().describe("The day of the week, matching the input."),
  index: z.enum(["Optimal", "Moderate", "Unfavourable"]).describe("The suitability index for spraying crops."),
  reasoning: z.string().describe("A brief, clear explanation for the index, in the requested language."),
});

const SprayingAdviceOutputSchema = z.array(DailySprayingAdviceSchema);


export async function getSprayingAdvice(input: z.infer<typeof SprayingAdviceInputSchema>): Promise<z.infer<typeof SprayingAdviceOutputSchema>> {
  return sprayingAdviceFlow(input);
}


const sprayingAdvicePrompt = ai.definePrompt({
    name: 'sprayingAdvicePrompt',
    input: { schema: SprayingAdviceInputSchema },
    output: { schema: SprayingAdviceOutputSchema },
    prompt: `You are an agricultural expert providing advice on when to spray crops based on a 5-day weather forecast.

    **Analyze the following forecast:**
    {{#each forecast}}
    - Day: {{day}}, Temp: {{temp}}, Condition: {{condition}}, Wind: {{wind_kph}} km/h, Rain Chance: {{chance_of_rain}}%
    {{/each}}
    
    **Your Task:**
    For each day, determine a spraying suitability index ("Optimal", "Moderate", "Unfavourable") and provide a concise reason.
    
    **Criteria:**
    - **Optimal:** Wind speed is low (< 10 km/h), chance of rain is very low (< 15%), and temperature is not extreme.
    - **Moderate:** Wind speed is medium (10-20 km/h) OR chance of rain is low to medium (15-40%). Conditions are not perfect but spraying is possible with care.
    - **Unfavourable:** Wind speed is high (> 20 km/h) OR chance of rain is high (> 40%) OR condition is currently 'Rainy' or 'Thunderstorm'. High wind causes drift, and rain washes away the spray.
    
    Provide the entire response in this language: **{{{language}}}**.
    
    Return your analysis as a JSON array that matches the specified output schema.
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
