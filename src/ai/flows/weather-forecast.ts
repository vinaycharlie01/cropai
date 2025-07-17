'use server';

/**
 * @fileOverview A weather forecast AI agent.
 *
 * - getWeatherForecast - A function that handles fetching the weather forecast.
 * - WeatherForecastInput - The input type for the getWeatherForecast function.
 * - WeatherForecastOutput - The return type for the getWeatherForecast function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const WeatherForecastInputSchema = z.object({
  location: z.string().describe('The location for which to get the weather forecast.'),
});
export type WeatherForecastInput = z.infer<typeof WeatherForecastInputSchema>;

const DailyForecastSchema = z.object({
    day: z.string().describe("The day of the week (e.g., Monday)."),
    temperature: z.string().describe("The predicted temperature in Celsius (e.g., '25°C')."),
    condition: z.string().describe("The weather condition (e.g., 'Sunny', 'Partly Cloudy', 'Rain')."),
    humidity: z.string().describe("The humidity percentage (e.g., '60%')."),
});

const WeatherForecastOutputSchema = z.object({
  forecast: z.array(DailyForecastSchema).describe('A 5-day weather forecast.'),
});
export type WeatherForecastOutput = z.infer<typeof WeatherForecastOutputSchema>;

export async function getWeatherForecast(input: WeatherForecastInput): Promise<WeatherForecastOutput> {
  return weatherForecastFlow(input);
}

const prompt = ai.definePrompt({
  name: 'weatherForecastPrompt',
  input: {schema: WeatherForecastInputSchema},
  output: {schema: WeatherForecastOutputSchema},
  prompt: `You are a weather forecasting expert. Provide a 5-day weather forecast for the following location: {{{location}}}.

Your response must include the day of the week, temperature in Celsius, a brief weather condition description, and humidity for each day.
`,
});

const weatherForecastFlow = ai.defineFlow(
  {
    name: 'weatherForecastFlow',
    inputSchema: WeatherForecastInputSchema,
    outputSchema: WeatherForecastOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
