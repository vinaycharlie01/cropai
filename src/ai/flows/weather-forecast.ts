
'use server';

/**
 * @fileOverview A weather forecast agent that fetches and processes real weather data.
 *
 * - getWeatherForecast - Fetches weather from OpenWeatherMap API and processes it.
 * - WeatherForecastInput - Input: lat/lon or location string.
 * - WeatherForecastOutput - Output: Processed 5-day forecast.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { genkit } from 'genkit';

const WeatherForecastInputSchema = z.object({
  lat: z.number().optional().describe("Latitude"),
  lon: z.number().optional().describe("Longitude"),
  location: z.string().optional().describe('The location name (e.g., "Hyderabad") to geocode if lat/lon are not provided.'),
});
export type WeatherForecastInput = z.infer<typeof WeatherForecastInputSchema>;

const DailyForecastSchema = z.object({
  day: z.string().describe("The day of the week (e.g., 'Monday')."),
  temperature: z.string().describe("The average predicted temperature in Celsius (e.g., '25°C')."),
  condition: z.string().describe("The most common weather condition for the day (e.g., 'Clear', 'Clouds')."),
  humidity: z.string().describe("The average humidity percentage (e.g., '60%')."),
});
export type DailyForecast = z.infer<typeof DailyForecastSchema>;

const WeatherForecastOutputSchema = z.object({
  forecast: z.array(DailyForecastSchema).describe('A 5-day weather forecast.'),
  location: z.string().describe('The name of the location for the forecast (e.g., "Hyderabad, IN").')
});
export type WeatherForecastOutput = z.infer<typeof WeatherForecastOutputSchema>;

// Main exported function for the frontend
export async function getWeatherForecast(input: WeatherForecastInput): Promise<WeatherForecastOutput> {
  return weatherForecastFlow(input);
}


const geocodeTool = ai.defineTool(
  {
    name: 'geocodeTool',
    description: 'Get latitude and longitude for a given location name.',
    inputSchema: z.object({ location: z.string() }),
    outputSchema: z.object({ lat: z.number(), lon: z.number() }),
  },
  async (input) => {
    const apiKey = await genkit.getSecret({ name: 'OPENWEATHERMAP_API_KEY' });
    const url = `https://api.openweathermap.org/geo/v1/direct?q=${input.location}&limit=1&appid=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Geocoding API request failed with status ${response.status}`);
    }
    const data = await response.json();
    if (!data || data.length === 0) {
      throw new Error(`Could not find location: ${input.location}`);
    }
    return { lat: data[0].lat, lon: data[0].lon };
  }
);


const weatherForecastFlow = ai.defineFlow(
  {
    name: 'weatherForecastFlow',
    inputSchema: WeatherForecastInputSchema,
    outputSchema: WeatherForecastOutputSchema,
  },
  async (input) => {
    let { lat, lon } = input;

    // If lat/lon are not provided, use the geocode tool
    if ((!lat || !lon) && input.location) {
        const geocodeResult = await geocodeTool({ location: input.location });
        lat = geocodeResult.lat;
        lon = geocodeResult.lon;
    }

    if (!lat || !lon) {
        throw new Error("Latitude and longitude or a location name must be provided.");
    }
    
    const apiKey = await genkit.getSecret({ name: 'OPENWEATHERMAP_API_KEY' });
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API request failed with status ${response.status}`);
    }
    const weatherData = await response.json();

    // Process the raw API data into a 5-day forecast
    const dailyData: { [key: string]: any[] } = {};
    weatherData.list.forEach((item: any) => {
        const date = item.dt_txt.split(' ')[0];
        if (!dailyData[date]) {
            dailyData[date] = [];
        }
        dailyData[date].push(item);
    });

    const forecast: DailyForecast[] = Object.keys(dailyData).slice(0, 5).map(date => {
        const dayEntries = dailyData[date];
        const avgTemp = dayEntries.reduce((sum, entry) => sum + entry.main.temp, 0) / dayEntries.length;
        const avgHumidity = dayEntries.reduce((sum, entry) => sum + entry.main.humidity, 0) / dayEntries.length;
        
        // Find the most common weather condition
        const conditions = dayEntries.map(entry => entry.weather[0].main);
        const conditionCounts = conditions.reduce((acc, cond) => {
            acc[cond] = (acc[cond] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const mostCommonCondition = Object.keys(conditionCounts).reduce((a, b) => conditionCounts[a] > conditionCounts[b] ? a : b);

        const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

        return {
            day: dayOfWeek,
            temperature: `${Math.round(avgTemp)}°C`,
            condition: mostCommonCondition,
            humidity: `${Math.round(avgHumidity)}%`,
        };
    });

    return {
      forecast: forecast,
      location: `${weatherData.city.name}, ${weatherData.city.country}`
    };
  }
);
