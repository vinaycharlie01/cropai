
import { z } from 'zod';

export const WeatherInputSchema = z.object({
  locationQuery: z.string().describe('The location for the forecast, can be a city name or "lat,lon".'),
  language: z.string().describe('The language for the response (for future use).'),
});
export type WeatherInput = z.infer<typeof WeatherInputSchema>;


const DailyForecastSchema = z.object({
    date: z.string(),
    dayOfWeek: z.string(),
    iconUrl: z.string().url(),
    conditionText: z.string(),
    avgTempC: z.number(),
    windKph: z.number(),
    chanceOfRain: z.number(),
    humidity: z.number(),
});

export const WeatherOutputSchema = z.object({
  location: z.object({
    name: z.string(),
    region: z.string(),
  }),
  current: z.object({
    tempC: z.number(),
    conditionText: z.string(),
    iconUrl: z.string().url(),
    windKph: z.number(),
    humidity: z.number(),
  }),
  forecast: z.array(DailyForecastSchema).length(5),
  sprayingAdvisory: z.string().describe('A concise, actionable spraying advisory based on the 5-day forecast. Must be in the requested language.'),
});

export type WeatherOutput = z.infer<typeof WeatherOutputSchema>;
