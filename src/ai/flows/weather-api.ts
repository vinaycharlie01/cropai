'use server';

/**
 * @fileOverview Provides a Genkit tool to get weather information for a given location using WeatherAPI.com.
 * 
 * - getWeatherAction - An exported server action to call the tool from the client.
 */

import { ai } from '@/ai/genkit';
import { WeatherInputSchema, WeatherOutputSchema, type WeatherInput, type WeatherOutput } from '@/types/weather';
import { z } from 'zod';

// Helper function to map WeatherAPI.com condition text to our simplified conditions
const mapWeatherCondition = (conditionText: string): z.infer<typeof WeatherOutputSchema.shape.condition> => {
    const text = conditionText.toLowerCase();
    if (text.includes('thunder')) return 'Thunderstorm';
    if (text.includes('rain') || text.includes('drizzle')) return 'Rainy';
    if (text.includes('snow') || text.includes('sleet') || text.includes('ice')) return 'Snowy';
    if (text.includes('sun') || text.includes('clear')) return 'Sunny';
    // Defaults to cloudy for mist, fog, overcast, etc.
    return 'Cloudy';
};

// This is the Genkit Tool that does the actual work.
const getWeatherTool = ai.defineTool(
    {
        name: 'getWeather',
        description: 'Returns the current weather and a 5-day forecast for a given location, specified by either city name or latitude/longitude coordinates.',
        inputSchema: WeatherInputSchema,
        outputSchema: WeatherOutputSchema,
    },
    async (input) => {
        const apiKey = process.env.WEATHERAPI_API_KEY;
        if (!apiKey) {
            console.error("WEATHERAPI_API_KEY is not set in environment variables.");
            return { error: "The weather service is currently unavailable." };
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
                 if (response.status === 400 && errorMessage.includes('No matching location found')) {
                     return { error: `Could not find location for "${query}". Please check the spelling or try a different city.` };
                }
                return { error: errorMessage };
            }

            const data = await response.json() as any;

            const currentData = data.current;
            const locationData = data.location;
            const forecastData = data.forecast.forecastday;

            const dailyForecasts = forecastData.map((day: any) => {
                const date = new Date(day.date_epoch * 1000);
                return {
                    day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                    temp: `${Math.round(day.day.avgtemp_c)}°`,
                    condition: mapWeatherCondition(day.day.condition.text),
                };
            });

            return {
                location: `${locationData.name}, ${locationData.country}`,
                temperature: `${Math.round(currentData.temp_c)}°C`,
                condition: mapWeatherCondition(currentData.condition.text),
                wind: `${Math.round(currentData.wind_kph)} km/h`,
                sunrise: forecastData[0].astro.sunrise,
                sunset: forecastData[0].astro.sunset,
                forecast: dailyForecasts,
            };
        } catch (e) {
            console.error("Failed to fetch from WeatherAPI.com", e);
            return { error: "Could not connect to the weather service." };
        }
    }
);

// We define a simple flow that just calls the tool.
const weatherFlow = ai.defineFlow(
    {
        name: 'weatherFlow',
        inputSchema: WeatherInputSchema,
        outputSchema: WeatherOutputSchema,
    },
    async (input) => {
        return await getWeatherTool(input);
    }
);

// This is the exported server action that the client component will call.
export async function getWeatherAction(input: WeatherInput): Promise<WeatherOutput> {
    return weatherFlow(input);
}
