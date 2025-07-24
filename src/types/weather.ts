
import { z } from 'zod';

// Schema for the data we need to *send* to our weather tool.
export const WeatherInputSchema = z.object({
    latitude: z.number().describe('The latitude for the location.').optional(),
    longitude: z.number().describe('The longitude for the location.').optional(),
    city: z.string().describe('The name of the city for the location.').optional(),
}).refine(data => data.city || (data.latitude !== undefined && data.longitude !== undefined), {
    message: "Either city or both latitude and longitude must be provided.",
});
export type WeatherInput = z.infer<typeof WeatherInputSchema>;


export const DailyForecastSchema = z.object({
    day: z.string().describe("The day of the week (e.g., 'Monday')."),
    temperature: z.string().describe("The forecasted average temperature, e.g., '28°C'."),
    condition: z.string().describe("The forecasted weather condition (e.g., 'Sunny', 'Partly Cloudy')."),
    humidity: z.string().describe("The forecasted average humidity as a percentage, e.g., '65%'."),
    wind_kph: z.number().describe("The forecasted average wind speed in kilometers per hour."),
    chance_of_rain: z.number().describe("The forecasted chance of rain as a percentage."),
});
export type DailyForecast = z.infer<typeof DailyForecastSchema>;

// Schema for the clean, processed data we want our tool to return.
// This is what the agent will receive.
export const WeatherOutputSchema = z.object({
    location: z.string().describe("The city and country of the provided coordinates.").optional(),
    forecast: z.array(DailyForecastSchema).max(5).describe("A 5-day weather forecast.").optional(),
    error: z.string().optional().describe("An error message if the weather could not be fetched."),
});
export type WeatherOutput = z.infer<typeof WeatherOutputSchema>;
