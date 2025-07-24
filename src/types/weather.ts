
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
    day: z.string().describe("The day of the week (e.g., 'Mon')."),
    temp: z.string().describe("The forecasted average temperature, e.g., '28°'."),
    condition: z.enum(["Sunny", "Cloudy", "Rainy", "Thunderstorm", "Snowy"]).describe("The forecasted weather condition."),
    wind_kph: z.number().describe("The forecasted maximum wind speed in kilometers per hour."),
    chance_of_rain: z.number().describe("The forecasted chance of rain as a percentage (0-100).")
});
export type DailyForecast = z.infer<typeof DailyForecastSchema>;

// Schema for the clean, processed data we want our tool to return.
// This is what the agent will receive.
export const WeatherOutputSchema = z.object({
    location: z.string().describe("The city and country of the provided coordinates.").optional(),
    temperature: z.string().describe("The current temperature in Celsius, e.g., '32°C'.").optional(),
    condition: z.enum(["Sunny", "Cloudy", "Rainy", "Thunderstorm", "Snowy"]).describe("The current weather condition.").optional(),
    wind: z.string().describe("The current wind speed, e.g., '12 km/h'.").optional(),
    sunrise: z.string().describe("The sunrise time, e.g., '6:05 AM'.").optional(),
    sunset: z.string().describe("The sunset time, e.g., '6:45 PM'.").optional(),
    forecast: z.array(DailyForecastSchema).max(5).describe("A 5-day weather forecast.").optional(),
    error: z.string().optional().describe("An error message if the weather could not be fetched."),
});
export type WeatherOutput = z.infer<typeof WeatherOutputSchema>;
