
'use server';

/**
 * @fileOverview A weather forecast AI agent that simulates weather data.
 *
 * - getWeatherForecast - A function that handles generating a simulated weather forecast.
 * - WeatherForecastInput - The input type for the getWeatherForecast function.
 * - WeatherForecastOutput - The return type for the getWeatherForecast function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Input and Output Schemas for the frontend
const WeatherForecastInputSchema = z.object({
  location: z.string().describe('The location for which to get the weather forecast.'),
});
export type WeatherForecastInput = z.infer<typeof WeatherForecastInputSchema>;

const DailyForecastSchema = z.object({
  day: z.string().describe("The day of the week (e.g., Monday)."),
  temperature: z.string().describe("The predicted temperature in Celsius (e.g., '25°C')."),
  condition: z.string().describe("The weather condition (e.g., 'Sunny', 'Partly Cloudy', 'Rain')."),
  humidity: z.string().describe("The humidity percentage (e.g., '60%')."),
});
export type DailyForecast = z.infer<typeof DailyForecastSchema>;


const WeatherForecastOutputSchema = z.object({
  forecast: z.array(DailyForecastSchema).describe('A 5-day weather forecast.'),
  location: z.string().describe('The name of the location for the forecast (e.g., "Hyderabad, IN").')
});
export type WeatherForecastOutput = z.infer<typeof WeatherForecastOutputSchema>;


// --- Main Exported Function and Flow ---

export async function getWeatherForecast(input: WeatherForecastInput): Promise<WeatherForecastOutput> {
  return weatherForecastFlow(input);
}

const prompt = ai.definePrompt({
    name: 'weatherForecastPrompt',
    input: { schema: WeatherForecastInputSchema },
    output: { schema: WeatherForecastOutputSchema },
    prompt: `You are a weather forecasting expert. Based on the provided location, generate a realistic-looking 5-day weather forecast.

    **Location:** {{{location}}}
    
    **Instructions:**
    1.  Create a 5-day forecast starting from today.
    2.  For each day, provide the day of the week (e.g., "Monday", "Tuesday").
    3.  Provide a plausible temperature in Celsius (e.g., "28°C").
    4.  Provide a common weather condition (e.g., "Sunny", "Partly Cloudy", "Showers", "Thunderstorm").
    5.  Provide a realistic humidity percentage (e.g., "65%").
    6.  Return the original location name in the 'location' field of the output.
    7.  Ensure the output is a valid JSON object that matches the specified schema.
    
    Generate the forecast now.`,
});

const weatherForecastFlow = ai.defineFlow(
  {
    name: 'weatherForecastFlow',
    inputSchema: WeatherForecastInputSchema,
    outputSchema: WeatherForecastOutputSchema,
  },
  async (input) => {
    // MOCK IMPLEMENTATION to avoid quota errors.
    if (process.env.NODE_ENV === 'development' || !process.env.GEMINI_API_KEY) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
        
        const today = new Date();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        return {
            location: input.location,
            forecast: [
                { day: days[today.getDay()], temperature: '32°C', condition: 'Sunny', humidity: '55%' },
                { day: days[(today.getDay() + 1) % 7], temperature: '33°C', condition: 'Partly Cloudy', humidity: '60%' },
                { day: days[(today.getDay() + 2) % 7], temperature: '31°C', condition: 'Showers', humidity: '75%' },
                { day: days[(today.getDay() + 3) % 7], temperature: '30°C', condition: 'Thunderstorm', humidity: '80%' },
                { day: days[(today.getDay() + 4) % 7], temperature: '32°C', condition: 'Partly Cloudy', humidity: '70%' },
            ],
        };
    }
    
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("The AI model did not return a valid forecast.");
    }
    return output;
  }
);
