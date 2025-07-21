import { z } from 'zod';

export const WeatherInputSchema = z.object({
  lat: z.number().describe('The latitude for the weather forecast.'),
  lon: z.number().describe('The longitude for the weather forecast.'),
});
export type WeatherInput = z.infer<typeof WeatherInputSchema>;

export const DailyForecastSchema = z.object({
    day: z.string().describe("The day of the week (e.g., Monday)."),
    temperature: z.string().describe("The predicted temperature in Celsius (e.g., '25°C')."),
    condition: z.string().describe("The weather condition (e.g., 'Sunny', 'Partly Cloudy', 'Rain')."),
    humidity: z.string().describe("The humidity percentage (e.g., '60%')."),
});

export const WeatherOutputSchema = z.object({
  location: z.string().describe('The name of the location for the forecast (e.g., "Hyderabad, IN").'),
  current: z.object({
    temp_c: z.number(),
    condition: z.string(),
    humidity: z.number(),
    wind_kph: z.number(),
  }),
  forecast: z.array(DailyForecastSchema).describe('A 5-day weather forecast.'),
});
export type WeatherOutput = z.infer<typeof WeatherOutputSchema>;
