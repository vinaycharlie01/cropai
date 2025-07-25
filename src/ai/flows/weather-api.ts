
'use server';

/**
 * @fileOverview Provides a Genkit tool to get weather information and AI-powered advice.
 * 
 * - getWeatherAction - An exported server action to call the main flow from the client.
 */

import { ai } from '@/ai/genkit';
import { WeatherInputSchema, WeatherOutputSchema, type WeatherInput, type WeatherOutput, DailyForecastSchema } from '@/types/weather';
import { z } from 'zod';


// This is the exported server action that the client component will call.
export async function getWeatherAction(input: WeatherInput): Promise<WeatherOutput> {
    return weatherAdvisorFlow(input);
}


// --- The main flow that orchestrates data fetching and AI advice ---

const weatherAdvisorFlow = ai.defineFlow(
    {
        name: 'weatherAdvisorFlow',
        description: 'Fetches a 5-day weather forecast and provides AI-powered spraying advice for farmers.',
        inputSchema: WeatherInputSchema,
        outputSchema: WeatherOutputSchema,
    },
    async (input) => {
        const rawForecast = await weatherToolFlow(input);

        if (rawForecast.error || !rawForecast.forecast) {
            return { error: rawForecast.error || "Failed to fetch raw weather data." };
        }

        const advicePrompt = ai.definePrompt({
            name: 'sprayingAdvicePrompt',
            input: { 
                schema: z.object({
                    forecast: z.array(DailyForecastSchema),
                    language: z.string(),
                }) 
            },
            output: { schema: z.object({
                sprayingAdvisory: z.string(),
                overallOutlook: z.string(),
            })},
            prompt: `You are an expert agronomist providing advice to a farmer. Analyze the following 5-day weather forecast and provide a concise spraying advisory and an overall outlook.

            **Forecast Data:**
            {{#each forecast}}
            - {{day}}: {{temperature}}, {{condition}}, Humidity {{humidity}}, Wind {{wind_kph}} kph, {{chance_of_rain}}% chance of rain.
            {{/each}}

            **Instructions:**
            1.  **Spraying Advisory**: Write a 2-3 sentence advisory. Focus on the best and worst days for spraying pesticides. Mention wind speed (avoid spraying if > 15 kph) and rain (avoid spraying if rain chance is high).
            2.  **Overall Outlook**: Write a 1-2 sentence summary of the general weather pattern for the next 5 days.
            3.  Your entire response MUST be in the requested language: **{{{language}}}**.
            4.  Provide the output in the specified JSON format.
            `,
        });

        const { output: advice } = await advicePrompt({ forecast: rawForecast.forecast, language: input.language });
        
        return {
            ...rawForecast,
            ...advice,
        };
    }
);


// --- The sub-flow that only fetches raw weather data ---

const weatherToolFlow = ai.defineFlow(
    {
        name: 'weatherToolFlow',
        description: 'Fetches raw 5-day weather forecast data from WeatherAPI.com.',
        inputSchema: WeatherInputSchema,
        outputSchema: z.object({
            location: z.string().optional(),
            forecast: z.array(DailyForecastSchema).optional(),
            error: z.string().optional(),
        }),
    },
    async (input) => {
        const apiKey = process.env.WEATHERAPI_API_KEY;
        if (!apiKey) {
             return { error: "The weather service is unavailable because the API key is not configured." };
        }
        
        const { city, latitude, longitude } = input;
        
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
