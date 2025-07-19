
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

// --- Tools for OpenWeatherMap API ---

const geocodeTool = ai.defineTool(
  {
    name: 'geocodeTool',
    description: 'Get latitude and longitude for a given location name.',
    inputSchema: z.object({ location: z.string() }),
    outputSchema: z.object({ lat: z.number(), lon: z.number() }),
  },
  async ({ location }) => {
    const response = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${location}&limit=1&appid=${process.env.OPENWEATHERMAP_API_KEY}`);
    if (!response.ok) {
      throw new Error('Failed to fetch geocoding data.');
    }
    const data = await response.json();
    if (!data || data.length === 0) {
      throw new Error(`Could not find location: ${location}`);
    }
    return { lat: data[0].lat, lon: data[0].lon };
  }
);

const getWeatherTool = ai.defineTool(
  {
    name: 'getWeatherTool',
    description: 'Get the 5-day weather forecast for a given latitude and longitude.',
    inputSchema: z.object({ lat: z.number(), lon: z.number() }),
    outputSchema: z.any(), // Allow any JSON structure from the API
  },
  async ({ lat, lon }) => {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.OPENWEATHERMAP_API_KEY}`);
    if (!response.ok) {
      throw new Error('Failed to fetch weather forecast data.');
    }
    return await response.json();
  }
);


// --- Main Exported Function and Flow ---

export async function getWeatherForecast(input: WeatherForecastInput): Promise<WeatherForecastOutput> {
  return weatherForecastFlow(input);
}

const prompt = ai.definePrompt({
  name: 'weatherForecastPrompt',
  tools: [geocodeTool, getWeatherTool],
  input: { schema: WeatherForecastInputSchema },
  output: { schema: WeatherForecastOutputSchema },
  prompt: `You are a weather data processor. Your task is to process the raw weather data provided by the tools and format it into a user-friendly 5-day forecast.

Location to forecast: {{{location}}}

1.  Use the geocodeTool to get the latitude and longitude for the location.
2.  Use the getWeatherTool with the obtained coordinates to get the weather data.
3.  Analyze the 'list' array in the returned weather data. Each item in the list is a 3-hour forecast.
4.  Group the forecasts by day. For each of the next 5 days, find the representative weather condition, average temperature, and average humidity.
5.  Format the result into the required JSON output schema. The temperature should be rounded to the nearest whole number and include "°C". The humidity should be a percentage string like "60%".
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
