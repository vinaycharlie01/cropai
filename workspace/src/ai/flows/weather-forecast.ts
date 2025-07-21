
'use server';

/**
 * @fileOverview A weather forecast tool that fetches live data from WeatherAPI.com.
 *
 * - getWeatherForecast - A function that fetches and formats real-time weather data.
 * - WeatherForecastInput - The input type for the getWeatherForecast function.
 * - WeatherForecastOutput - The return type for the getWeatherForecast function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Input and Output Schemas
const WeatherForecastInputSchema = z.object({
  lat: z.number().describe('The latitude for the weather forecast.'),
  lon: z.number().describe('The longitude for the weather forecast.'),
});
export type WeatherForecastInput = z.infer<typeof WeatherForecastInputSchema>;

const DailyForecastSchema = z.object({
  day: z.string().describe("The day of the week (e.g., 'Mon')."),
  temperature: z.string().describe("The predicted temperature in Celsius (e.g., '25°C')."),
  condition: z.string().describe("The weather condition (e.g., 'Sunny', 'Partly Cloudy', 'Rain')."),
  humidity: z.string().describe("The humidity percentage (e.g., '60%')."),
});
export type DailyForecast = z.infer<typeof DailyForecastSchema>;

const WeatherForecastOutputSchema = z.object({
  location: z.string().describe('The name of the location for the forecast (e.g., "Hyderabad, IN").'),
  forecast: z.array(DailyForecastSchema).describe('A 5-day weather forecast.'),
});
export type WeatherForecastOutput = z.infer<typeof WeatherForecastOutputSchema>;

/**
 * A server action to be called from client components to fetch weather data.
 * @param input The latitude and longitude.
 * @returns A structured weather forecast.
 */
export async function getWeatherForecast(input: WeatherForecastInput): Promise<WeatherForecastOutput> {
  const apiKey = process.env.WEATHERAPI_API_KEY;
  if (!apiKey) {
    throw new Error('WEATHERAPI_API_KEY is not set in the environment variables.');
  }

  const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${input.lat},${input.lon}&days=5&aqi=no&alerts=no`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`WeatherAPI request failed with status ${response.status}: ${errorData.error.message}`);
    }
    const data = await response.json();

    const formattedForecast = data.forecast.forecastday.map((day: any) => ({
      day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
      temperature: `${Math.round(day.day.avgtemp_c)}°C`,
      condition: day.day.condition.text,
      humidity: `${day.day.avghumidity}%`,
    }));

    return {
      location: `${data.location.name}, ${data.location.region}`,
      forecast: formattedForecast,
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw new Error('Failed to fetch weather data from WeatherAPI.com.');
  }
}
