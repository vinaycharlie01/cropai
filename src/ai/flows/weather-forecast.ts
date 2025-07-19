
'use server';

/**
 * @fileOverview A weather forecast AI agent that uses real-time data from OpenWeatherMap.
 *
 * - getWeatherForecast - A function that handles fetching and processing the weather forecast.
 * - WeatherForecastInput - The input type for the getWeatherForecast function.
 * - WeatherForecastOutput - The return type for the getWeatherForecast function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { genkit } from 'genkit';

// Input and Output Schemas for the frontend
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
    description: 'Get the 5-day weather forecast raw data for a given location name.',
    inputSchema: z.object({ location: z.string() }),
    outputSchema: z.any(), // Allow any JSON structure from the API
  },
  async ({ location }) => {
    const apiKey = await genkit.getSecret("OPENWEATHERMAP_API_KEY");
    if (!apiKey) {
      throw new Error("OpenWeatherMap API key is not configured.");
    }
    
    // 1. Geocode location to lat/lon
    const geoResponse = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${location}&limit=1&appid=${apiKey}`);
    if (!geoResponse.ok) {
      throw new Error(`Failed to fetch geocoding data. Status: ${geoResponse.status}`);
    }
    const geoData = await geoResponse.json();
    if (!geoData || geoData.length === 0) {
      throw new Error(`Could not find location: ${location}`);
    }
    const { lat, lon } = geoData[0];

    // 2. Fetch weather forecast using lat/lon
    const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
    if (!weatherResponse.ok) {
      throw new Error(`Failed to fetch weather forecast data. Status: ${weatherResponse.status}`);
    }
    return await weatherResponse.json();
  }
);


// --- Main Exported Function and Flow ---

export async function getWeatherForecast(input: WeatherForecastInput): Promise<WeatherForecastOutput> {
  return weatherForecastFlow(input);
}

const weatherForecastFlow = ai.defineFlow(
  {
    name: 'weatherForecastFlow',
    inputSchema: WeatherForecastInputSchema,
    outputSchema: WeatherForecastOutputSchema,
  },
  async ({ location }) => {
    const weatherData = await getWeatherTool({ location });

    if (!weatherData || !weatherData.list) {
      throw new Error("Invalid data received from weather API.");
    }

    // Process the raw data in code
    const dailyData: { [key: string]: { temps: number[], humidities: number[], conditions: { [key: string]: number } } } = {};

    weatherData.list.forEach((item: any) => {
      const date = new Date(item.dt * 1000);
      const day = date.toISOString().split('T')[0];

      if (!dailyData[day]) {
        dailyData[day] = { temps: [], humidities: [], conditions: {} };
      }

      dailyData[day].temps.push(item.main.temp);
      dailyData[day].humidities.push(item.main.humidity);
      const condition = item.weather[0].main;
      dailyData[day].conditions[condition] = (dailyData[day].conditions[condition] || 0) + 1;
    });

    const forecast: z.infer<typeof DailyForecastSchema>[] = [];
    const days = Object.keys(dailyData).sort().slice(0, 5);

    for (const day of days) {
      const data = dailyData[day];
      const avgTemp = data.temps.reduce((a, b) => a + b, 0) / data.temps.length;
      const avgHumidity = data.humidities.reduce((a, b) => a + b, 0) / data.humidities.length;
      const mostCommonCondition = Object.keys(data.conditions).reduce((a, b) => data.conditions[a] > data.conditions[b] ? a : b);

      forecast.push({
        day: new Date(day).toLocaleDateString('en-US', { weekday: 'long' }),
        temperature: `${Math.round(avgTemp)}°C`,
        condition: mostCommonCondition,
        humidity: `${Math.round(avgHumidity)}%`,
      });
    }

    return { forecast };
  }
);
