
import { z } from 'zod';

export const WeatherInputSchema = z.object({
  locationQuery: z.string().describe('The city name or lat,lon coordinates for the weather forecast.'),
  language: z.string().describe('The language for the advisory text.'),
});
export type WeatherInput = z.infer<typeof WeatherInputSchema>;

export const DailyForecastSchema = z.object({
    day: z.string().describe("The day of the week (e.g., 'Mon')."),
    avgtemp_c: z.number().describe("The average temperature in Celsius."),
    condition: z.string().describe("The weather condition (e.g., 'Sunny', 'Partly Cloudy', 'Rain')."),
    daily_chance_of_rain: z.number().describe("The chance of rain as a percentage (0-100)."),
    maxwind_kph: z.number().describe("The maximum wind speed in kilometers per hour."),
    avghumidity: z.number().describe("The average humidity as a percentage (0-100)."),
});
export type DailyForecast = z.infer<typeof DailyForecastSchema>;

export const WeatherOutputSchema = z.object({
  location: z.string().describe('The name of the location for the forecast (e.g., "Hyderabad, IN").'),
  current: z.object({
    temp_c: z.number(),
    condition: z.string(),
    humidity: z.number(),
    wind_kph: z.number(),
  }),
  forecast: z.array(DailyForecastSchema).length(5).describe('A 5-day weather forecast.'),
  sprayingAdvisory: z.string().describe('A 1-2 sentence advisory on the best and worst days for spraying. Must be in the requested language.')
});
export type WeatherOutput = z.infer<typeof WeatherOutputSchema>;
