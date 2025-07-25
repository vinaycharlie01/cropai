
import { z } from 'zod';

// This file's contents have been removed to disable the weather feature.
// Schemas are kept to prevent build errors from other files that may still reference them.

export const WeatherInputSchema = z.object({});
export type WeatherInput = z.infer<typeof WeatherInputSchema>;

export const WeatherOutputSchema = z.object({});
export type WeatherOutput = z.infer<typeof WeatherOutputSchema>;
