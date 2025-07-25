
'use server';

/**
 * @fileOverview Provides a Genkit tool to get weather information and AI-driven advice.
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


// --- Step 1: Tool to get raw weather data ---

const fetchWeatherTool = ai.defineTool(
    {
        name: 'fetchWeatherTool',
        description: 'Internal tool to fetch raw 5-day weather forecast data from WeatherAPI.com.',
        inputSchema: WeatherInputSchema,
        // The output is slightly different from the final WeatherOutput, as it doesn't include the advisory yet.
        outputSchema: z.object({
            location: z.string(),
            forecast: z.array(DailyForecastSchema),
        }),
    },
    async (input) => {
        const apiKey = process.env.WEATHERAPI_API_KEY;
        if (!apiKey) {
            throw new Error("The weather service is unavailable because the API key is not configured.");
        }
        
        const { latitude, longitude, city } = input;
        
        let query = city;
        if (latitude !== undefined && longitude !== undefined) {
            query = `${latitude},${longitude}`;
        }

        if (!query) {
             throw new Error("Location not specified. Please provide a city or coordinates.");
        }
        
        const fetch = (await import('node-fetch')).default;
        const forecastUrl = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(query)}&days=5&aqi=no&alerts=no`;

        try {
            const response = await fetch(forecastUrl);
            
            if (!response.ok) {
                const errorData = await response.json() as any;
                const errorMessage = errorData?.error?.message || `Failed to fetch weather data. Status: ${response.status}`;
                 if (response.status === 401) {
                     throw new Error(`API key is invalid.`);
                 }
                 if (response.status === 400 && errorMessage.includes('No matching location found')) {
                     throw new Error(`Could not find location for "${query}". Please check the spelling or try a different city.`);
                }
                throw new Error(errorMessage);
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
            if (e instanceof Error) throw e;
            throw new Error("Could not connect to the weather service.");
        }
    }
);


// --- Step 2: AI prompt to analyze the data and provide advice ---

const weatherAdvicePrompt = ai.definePrompt({
    name: 'weatherAdvicePrompt',
    input: {
        schema: z.object({
            location: z.string(),
            forecast: z.array(DailyForecastSchema),
        }),
    },
    output: {
        schema: z.object({
             sprayingAdvisory: z.string().describe("A concise, 2-3 sentence advisory for farmers on when to spray pesticides based on the forecast. Mention ideal conditions and warn against spraying on specific days with high wind or rain."),
             overallOutlook: z.string().describe("A brief, 1-2 sentence summary of the overall weather pattern for the next 5 days (e.g., 'Expect sunny days with a chance of rain mid-week').")
        })
    },
    prompt: `You are an expert agricultural meteorologist. Analyze the following 5-day weather forecast for {{location}} and provide a spraying advisory for farmers.

**Forecast Data:**
{{#each forecast}}
- **{{day}}**: {{temperature}}, {{condition}}, Humidity: {{humidity}}, Wind: {{wind_kph}} km/h, Rain Chance: {{chance_of_rain}}%
{{/each}}

**Instructions:**
1.  **Spraying Advisory**: Write a 2-3 sentence paragraph.
    *   Identify the best day(s) for spraying (low wind, no rain).
    *   Explicitly warn against spraying on specific day(s) with high wind (>15 kph) or a high chance of rain (>40%).
    *   Mention that early morning or late evening are generally the best times.
2.  **Overall Outlook**: Write a 1-2 sentence summary of the general weather trend for the week.

Provide the structured JSON output now.`,
});


// --- Step 3: The main flow that coordinates the tool and the AI ---
const weatherAdvisorFlow = ai.defineFlow(
    {
        name: 'weatherAdvisorFlow',
        inputSchema: WeatherInputSchema,
        outputSchema: WeatherOutputSchema,
    },
    async (input) => {
        try {
            const weatherData = await fetchWeatherTool(input);

            if (!weatherData?.forecast || weatherData.forecast.length === 0) {
                return { error: "Weather data could not be retrieved, so no advice can be generated." };
            }
            
            const advice = await weatherAdvicePrompt(weatherData);

            if (!advice.output) {
                // If advice generation fails, still return the weather data
                return { ...weatherData, error: "AI advisor failed, but forecast is available." };
            }
            
            return {
                ...weatherData,
                ...advice.output,
            };

        } catch (e: any) {
            console.error("Error in weatherAdvisorFlow:", e);
            return { error: e.message || "An unknown error occurred while getting the weather forecast." };
        }
    }
);
