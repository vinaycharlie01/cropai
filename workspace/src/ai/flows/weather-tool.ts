
'use server';

/**
 * @fileOverview A Genkit tool for fetching real-time weather data from WeatherAPI.com.
 *
 * - getWeatherAction - A server action that can be called from the client to get weather data.
 * - WeatherInputSchema - The input schema for the weather tool, requiring latitude and longitude.
 * - WeatherOutputSchema - The output schema for the weather tool, providing a structured weather forecast.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// --- Zod Schemas for Input and Output ---

export const WeatherInputSchema = z.object({
  lat: z.number().describe('The latitude for the weather forecast.'),
  lon: z.number().describe('The longitude for the weather forecast.'),
});
export type WeatherInput = z.infer<typeof WeatherInputSchema>;

export const DailyForecastSchema = z.object({
    day: z.string().describe("The day of the week (e.g., Monday)."),
    temperature: z.string().describe("The predicted temperature in Celsius (e.g., '25°C')."),
    condition: z.string().describe("The weather condition (e.g., 'Sunny', 'Partly Cloudy', 'Rain')."),
    humidity: z.string().describe("The humidity percentage (e.g., '60%')."),
});

export const WeatherOutputSchema = z.object({
  location: z.string().describe('The name of the location for the forecast (e.g., "Hyderabad, IN").'),
  current: z.object({
    temp_c: z.number(),
    condition: z.string(),
    humidity: z.number(),
    wind_kph: z.number(),
  }),
  forecast: z.array(DailyForecastSchema).describe('A 3-day weather forecast.'),
});
export type WeatherOutput = z.infer<typeof WeatherOutputSchema>;


// --- Main Exported Server Action ---

/**
 * A server action to be called from client components to fetch weather data.
 * @param input The latitude and longitude.
 * @returns A structured weather forecast.
 */
export async function getWeatherAction(input: WeatherInput): Promise<WeatherOutput> {
  return getWeatherTool.run(input);
}


// --- Genkit Tool Definition ---

const getWeatherTool = ai.defineTool(
  {
    name: 'getWeatherTool',
    description: 'Fetches the current weather and a 3-day forecast from WeatherAPI.com.',
    inputSchema: WeatherInputSchema,
    outputSchema: WeatherOutputSchema,
  },
  async ({ lat, lon }) => {
    const apiKey = process.env.WEATHERAPI_API_KEY;
    if (!apiKey) {
      throw new Error('WEATHERAPI_API_KEY is not set in the environment variables.');
    }

    const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${lat},${lon}&days=5&aqi=no&alerts=no`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`WeatherAPI request failed with status ${response.status}`);
      }
      const data = await response.json();

      // Process and format the data to match our WeatherOutputSchema
      const formattedForecast = data.forecast.forecastday.map((day: any) => ({
        day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
        temperature: `${Math.round(day.day.avgtemp_c)}°C`,
        condition: day.day.condition.text,
        humidity: `${day.day.avghumidity}%`,
      }));

      return {
        location: `${data.location.name}, ${data.location.region}`,
        current: {
          temp_c: data.current.temp_c,
          condition: data.current.condition.text,
          humidity: data.current.humidity,
          wind_kph: data.current.wind_kph,
        },
        forecast: formattedForecast,
      };
    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw new Error('Failed to fetch weather data from WeatherAPI.com.');
    }
  }
);
