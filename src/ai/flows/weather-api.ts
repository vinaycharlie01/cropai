
'use server';

/**
 * @fileOverview A Genkit flow for fetching weather data and generating a spraying advisory.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { WeatherInput, WeatherInputSchema, WeatherOutput, WeatherOutputSchema } from '@/types/weather';

/**
 * A server action to be called from client components to fetch weather data.
 * @param input The location query string (city or lat,lon).
 * @returns A structured weather forecast with an AI advisory.
 */
export async function getWeatherAction(input: WeatherInput): Promise<WeatherOutput> {
  return weatherApiFlow(input);
}


const weatherApiFlow = ai.defineFlow(
  {
    name: 'weatherApiFlow',
    inputSchema: WeatherInputSchema,
    outputSchema: WeatherOutputSchema,
  },
  async ({ locationQuery, language }) => {
    
    if (!locationQuery || typeof locationQuery !== 'string' || locationQuery.trim() === '') {
        throw new Error('Location not specified. Please provide a city or coordinates.');
    }
      
    const apiKey = process.env.WEATHERAPI_API_KEY;
    if (!apiKey) {
      throw new Error('WEATHERAPI_API_KEY is not set in the environment variables.');
    }

    const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${locationQuery}&days=5&aqi=no&alerts=no`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData?.error?.message || 'Could not fetch weather data. Please check the location and try again.';
      throw new Error(errorMessage);
    }
    const data = await response.json();

    const formattedForecast = data.forecast.forecastday.map((day: any) => ({
      day: new Date(day.date).toLocaleDateString(language, { weekday: 'short' }),
      avgtemp_c: day.day.avgtemp_c,
      condition: day.day.condition.text,
      daily_chance_of_rain: day.day.daily_chance_of_rain,
      maxwind_kph: day.day.maxwind_kph,
      avghumidity: day.day.avghumidity,
    }));
    
    // Now, call Gemini to generate the advisory based on the fetched data.
    const advisoryPrompt = ai.definePrompt({
        name: 'sprayingAdvisoryPrompt',
        input: { schema: z.object({ forecast: z.string(), lang: z.string() }) },
        output: { schema: z.string() },
        prompt: `You are an agricultural expert. Analyze the following 5-day weather forecast data and provide a concise, 1-2 sentence spraying advisory for a farmer.
        
        **Rules for Advisory:**
        - Recommend spraying on days with low wind (ideally under 15 kph) and low chance of rain (ideally under 40%).
        - Warn against spraying on days with high wind or high chance of rain.
        - Keep the advice short and easy to understand.
        - The entire response MUST be in the language specified: **{{{lang}}}**.

        **Forecast Data (JSON):**
        {{{forecast}}}

        Provide only the advisory text now.`,
    });
    
    const advisoryResult = await advisoryPrompt({
        forecast: JSON.stringify(formattedForecast, null, 2),
        lang: language,
    });
    
    const sprayingAdvisory = advisoryResult.output || "Could not generate AI advisory. Please check weather conditions manually before spraying.";

    return {
      location: `${data.location.name}, ${data.location.region}`,
      current: {
        temp_c: data.current.temp_c,
        condition: data.current.condition.text,
        humidity: data.current.humidity,
        wind_kph: data.current.wind_kph,
      },
      forecast: formattedForecast,
      sprayingAdvisory: sprayingAdvisory,
    };
  }
);
