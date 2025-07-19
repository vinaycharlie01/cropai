
'use server';

/**
 * @fileOverview A weather forecast AI agent that uses real-time data from OpenWeatherMap.
 *
 * - getWeatherForecast - A function that handles fetching and processing the weather forecast.
 * - WeatherForecastInput - The input type for the getWeatherForecast function.
 * - WeatherForecastOutput - The return type for the getWeatherForecast function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { genkit } from 'genkit';

// Input and Output Schemas remain the same for the frontend
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

// --- Tool for OpenWeatherMap API ---

const getWeatherTool = ai.defineTool(
  {
    name: 'getWeatherTool',
    description: 'Get the 5-day weather forecast for a given location name.',
    inputSchema: z.object({ location: z.string() }),
    outputSchema: z.any(), // Allow any JSON structure from the API
  },
  async ({ location }) => {
    const apiKey = await genkit.getSecret("OPENWEATHERMAP_API_KEY");

    // 1. Geocode location to lat/lon
    const geoResponse = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${location}&limit=1&appid=${apiKey}`);
    if (!geoResponse.ok) {
      throw new Error('Failed to fetch geocoding data.');
    }
    const geoData = await geoResponse.json();
    if (!geoData || geoData.length === 0) {
      throw new Error(`Could not find location: ${location}`);
    }
    const { lat, lon } = geoData[0];

    // 2. Fetch weather forecast using lat/lon
    const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
    if (!weatherResponse.ok) {
      throw new Error('Failed to fetch weather forecast data.');
    }
    return await weatherResponse.json();
  }
);


// --- Main Exported Function and Flow ---

export async function getWeatherForecast(input: WeatherForecastInput): Promise<WeatherForecastOutput> {
  return weatherForecastFlow(input);
}

const prompt = ai.definePrompt({
  name: 'weatherForecastPrompt',
  tools: [getWeatherTool],
  input: { schema: WeatherForecastInputSchema },
  output: { schema: WeatherForecastOutputSchema },
  prompt: `You are a weather data processor. Your task is to process the raw weather data provided by the tools and format it into a user-friendly 5-day forecast.

Location to forecast: {{{location}}}

1.  Use the getWeatherTool to get the raw weather data for the location.
2.  Analyze the 'list' array in the returned weather data. Each item in the list is a 3-hour forecast.
3.  Group the forecasts by day. For each of the next 5 days, find the representative weather condition, average temperature, and average humidity.
4.  Format the result into the required JSON output schema. The temperature should be rounded to the nearest whole number and include "°C". The humidity should be a percentage string like "60%".
`,
});

const weatherForecastFlow = ai.defineFlow(
  {
    name: 'weatherForecastFlow',
    inputSchema: WeatherForecastInputSchema,
    outputSchema: WeatherForecastOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    if (!output) {
        throw new Error("The AI model did not return a valid forecast.");
    }
    return output;
  }
);
