
'use server';

/**
 * @fileOverview A weather forecast AI agent that simulates weather data. This is used as a fallback.
 *
 * - getWeatherForecast - A function that handles generating a simulated weather forecast.
 * - WeatherForecastInput - The input type for the getWeatherForecast function.
 * - WeatherForecastOutput - The return type for the getWeatherForecast function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { WeatherOutput } from '@/types/weather';


const WeatherForecastInputSchema = z.object({
  location: z.string().describe('The location for which to get the weather forecast.'),
});
export type WeatherForecastInput = z.infer<typeof WeatherForecastInputSchema>;

// This function now returns a mock forecast if the Gemini API key is not available
// or if running in a development environment to avoid quota errors.
export async function getSimulatedWeatherForecast(input: WeatherForecastInput): Promise<WeatherOutput> {
    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return {
        location: input.location,
        forecast: [
            { day: days[today.getDay()], temperature: '32°C', condition: 'Sunny', humidity: '55%' },
            { day: days[(today.getDay() + 1) % 7], temperature: '33°C', condition: 'Partly Cloudy', humidity: '60%' },
            { day: days[(today.getDay() + 2) % 7], temperature: '31°C', condition: 'Showers', humidity: '75%' },
            { day: days[(today.getDay() + 3) % 7], temperature: '30°C', condition: 'Thunderstorm', humidity: '80%' },
            { day: days[(today.getDay() + 4) % 7], temperature: '32°C', condition: 'Partly Cloudy', humidity: '70%' },
        ],
    };
}
