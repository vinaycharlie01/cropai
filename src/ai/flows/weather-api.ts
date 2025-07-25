
'use server';

/**
 * @fileOverview A Genkit flow for fetching weather data and generating a spraying advisory.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { WeatherInputSchema, WeatherOutputSchema, WeatherOutput } from '@/types/weather';

const API_KEY = process.env.WEATHERAPI_API_KEY;

const WeatherApiDataSchema = z.any(); // We'll parse manually due to complexity

const weatherAdvisorPrompt = ai.definePrompt({
    name: 'weatherAdvisorPrompt',
    input: {
      schema: z.object({
        forecast: z.string(),
        language: z.string(),
      })
    },
    output: { schema: z.string() },
    prompt: `You are an expert agricultural advisor. Analyze the following 5-day weather forecast JSON data and provide a concise, actionable spraying advisory for a farmer.

    **Instructions:**
    1.  Identify the best and worst days for spraying pesticides.
    2.  Consider wind speed (ideal is below 15 kph) and chance of rain (ideal is low).
    3.  The advisory must be in this language: **{{{language}}}**.
    4.  Keep the advice to 2-3 sentences.
    
    **Forecast Data:**
    {{{forecast}}}
    
    Provide the spraying advisory now.`,
});


export const weatherApiFlow = ai.defineFlow(
  {
    name: 'weatherApiFlow',
    inputSchema: WeatherInputSchema,
    outputSchema: WeatherOutputSchema,
  },
  async ({ locationQuery, language }) => {
    if (!API_KEY) {
      throw new Error('WeatherAPI API key is not configured.');
    }
     if (!locationQuery) {
      throw new Error('Location not specified. Please provide a city or coordinates.');
    }

    const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${locationQuery}&days=5&aqi=no&alerts=no`;

    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`WeatherAPI Error: ${errorData.error.message}`);
      }
      
      const data = await response.json() as any;

      const formattedForecast = data.forecast.forecastday.slice(0, 5).map((day: any) => ({
        date: day.date,
        dayOfWeek: new Date(day.date).toLocaleDateString(language, { weekday: 'long' }),
        iconUrl: `https:${day.day.condition.icon}`,
        conditionText: day.day.condition.text,
        avgTempC: day.day.avgtemp_c,
        windKph: day.day.maxwind_kph,
        chanceOfRain: day.day.daily_chance_of_rain,
        humidity: day.day.avghumidity,
      }));

      // Generate spraying advice using the formatted forecast data
      const advisory = await weatherAdvisorPrompt({
          forecast: JSON.stringify(formattedForecast, null, 2),
          language: language,
      });

      return {
        location: {
          name: data.location.name,
          region: data.location.region,
        },
        current: {
          tempC: data.current.temp_c,
          conditionText: data.current.condition.text,
          iconUrl: `https:${data.current.condition.icon}`,
          windKph: data.current.wind_kph,
          humidity: data.current.humidity,
        },
        forecast: formattedForecast,
        sprayingAdvisory: advisory,
      };

    } catch (error) {
      console.error('Error in weatherApiFlow:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred while fetching weather data.');
    }
  }
);
