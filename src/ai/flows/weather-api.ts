
'use server';

/**
 * @fileOverview Provides a Genkit tool to get weather information. This version will use the AI to simulate data if no API key is provided.
 * 
 * - getWeatherAction - An exported server action to call the tool from the client.
 */

import { ai } from '@/ai/genkit';
import { WeatherInputSchema, WeatherOutputSchema, type WeatherInput, type WeatherOutput } from '@/types/weather';

// This is the exported server action that the client component will call.
export async function getWeatherAction(input: WeatherInput): Promise<WeatherOutput> {
    const apiKey = process.env.WEATHERAPI_API_KEY;

    if (!apiKey) {
        return { error: "The weather service is not configured. Please add a WeatherAPI.com API key to your environment variables." };
    }
    
    return getWeatherTool(input);
}

// This is the Genkit Tool that the AgriGPT agent will use.
export const getWeatherTool = ai.defineTool(
    {
        name: 'getWeatherTool',
        description: 'Returns the current weather and a 5-day forecast for a given location, specified by either city name or latitude/longitude coordinates.',
        inputSchema: WeatherInputSchema,
        outputSchema: WeatherOutputSchema,
    },
    async (input) => {
        const apiKey = process.env.WEATHERAPI_API_KEY;
        // This check is redundant if called from getWeatherAction, but good practice.
        if (!apiKey) {
            return { error: "The weather service is unavailable because the API key is not configured." };
        }
        
        const { latitude, longitude, city } = input;
        
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
            return { error: "Could not connect to the weather service." };
        }
    }
);
