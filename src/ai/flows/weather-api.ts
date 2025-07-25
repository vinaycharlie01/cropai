
'use server';

/**
 * @fileOverview Provides a Genkit tool to get weather information. This version is simplified to only fetch weather data without AI advice.
 * 
 * - getWeatherAction - An exported server action to call the main flow from the client.
 */

import { ai } from '@/ai/genkit';
import { WeatherInputSchema, WeatherOutputSchema, type WeatherInput, type WeatherOutput, DailyForecastSchema } from '@/types/weather';
import { z } from 'zod';


// This is the exported server action that the client component will call.
export async function getWeatherAction(input: WeatherInput): Promise<WeatherOutput> {
    return weatherToolFlow(input);
}


// --- The flow that fetches raw weather data ---

const weatherToolFlow = ai.defineFlow(
    {
        name: 'weatherToolFlow',
        description: 'Fetches raw 5-day weather forecast data from WeatherAPI.com.',
        inputSchema: WeatherInputSchema,
        outputSchema: WeatherOutputSchema,
    },
    async (input) => {
        const apiKey = process.env.WEATHERAPI_API_KEY;
        if (!apiKey) {
             return { error: "The weather service is unavailable because the API key is not configured." };
        }
        
        const { city, latitude, longitude, language } = input;
        
        let query = city;
        if (latitude !== undefined && longitude !== undefined) {
            query = `${latitude},${longitude}`;
        }

        if (!query) {
             return { error: "Location not specified. Please provide a city or coordinates." };
        }
        
        const fetch = (await import('node-fetch')).default;
        const forecastUrl = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(query)}&days=5&aqi=no&alerts=no`;

        try {
            const response = await fetch(forecastUrl);
            
            if (!response.ok) {
                const errorData = await response.json() as any;
                const errorMessage = errorData?.error?.message || `Failed to fetch weather data. Status: ${response.status}`;
                 if (response.status === 401) {
                     return { error: `API key is invalid.` };
                 }
                 if (response.status === 400 && errorMessage.includes('No matching location found')) {
                     return { error: `Could not find location for "${query}". Please check the spelling or try a different city.` };
                }
                return { error: errorMessage };
            }

            const data = await response.json() as any;

            const locationData = data.location;
            const forecastData = data.forecast.forecastday;

            return {
                location: `${locationData.name}, ${locationData.country}`,
                forecast: forecastData.map((day: any) => ({
                    day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' }),
                    temperature: `${Math.round(day.day.avgtemp_c)}°C`,
                    condition: day.day.condition.text,
                    humidity: `${day.day.avghumidity}%`,
                    wind_kph: Number(day.day.maxwind_kph),
                    chance_of_rain: Number(day.day.daily_chance_of_rain),
                })),
            };

        } catch (e) {
            console.error("Failed to fetch from WeatherAPI.com", e);
            const message = e instanceof Error ? e.message : "Could not connect to the weather service.";
            return { error: message };
        }
    }
);
