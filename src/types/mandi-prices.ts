
import { z } from 'zod';

// Schema for AI Price Prediction
export const MandiPricePredictionInputSchema = z.object({
  cropType: z.string().describe('The type of crop for the price prediction.'),
  location: z.string().describe('The location (e.g., district, state) for the price prediction.'),
  language: z.string().describe('The language for the prediction result (e.g., "English", "Hindi").'),
});
export type MandiPricePredictionInput = z.infer<typeof MandiPricePredictionInputSchema>;

const WeeklyForecastSchema = z.object({
  week: z.string().describe('The forecast week, e.g., "Week 1", "Week 2".'),
  price: z.number().describe('The predicted modal price per quintal for that week.'),
  trend: z.enum(['up', 'down', 'stable']).describe('The predicted price trend for that week.'),
  reasoning: z.string().describe('A brief explanation for the predicted trend. Must be in the requested language.'),
});

export const MandiPricePredictionOutputSchema = z.object({
  cropType: z.string(),
  location: z.string(),
  overall_trend: z.string().describe('A 1-2 sentence summary of the overall 4-week trend. Must be in the requested language.'),
  forecast: z.array(WeeklyForecastSchema).length(4).describe('A 4-week price forecast.'),
});
export type MandiPricePredictionOutput = z.infer<typeof MandiPricePredictionOutputSchema>;


// Schema for Live Mandi Price Tool
export const MandiPriceInputSchema = z.object({
  state: z.string(),
  district: z.string(),
  commodity: z.string(),
});
export type MandiPriceInput = z.infer<typeof MandiPriceInputSchema>;

export const MandiPriceRecordSchema = z.object({
  state: z.string(),
  district: z.string(),
  market: z.string(),
  commodity: z.string(),
  variety: z.string(),
  grade: z.string(),
  arrival_date: z.string(),
  min_price: z.string(),
  max_price: z.string(),
  modal_price: z.string(),
});
export type MandiPriceRecord = z.infer<typeof MandiPriceRecordSchema>;

export const MandiPriceOutputSchema = z.array(MandiPriceRecordSchema);
export type MandiPriceOutput = z.infer<typeof MandiPriceOutputSchema>;
