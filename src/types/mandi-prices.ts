
import { z } from 'zod';

export const MandiPriceInputSchema = z.object({
  state: z.string().describe('The state in India to fetch prices for (e.g., "Karnataka").'),
  district: z.string().describe('The district in the state to fetch prices for (e.g., "Chittor").'),
  commodity: z.string().describe('The agricultural commodity to fetch prices for (e.g., "Tomato").'),
});
export type MandiPriceInput = z.infer<typeof MandiPriceInputSchema>;

export const MandiPriceRecordSchema = z.object({
  state: z.string(),
  district: z.string(),
  market: z.string(),
  commodity: z.string(),
  variety: z.string(),
  arrival_date: z.string(),
  min_price: z.string(),
  max_price: z.string(),
  modal_price: z.string(),
});
export type MandiPriceRecord = z.infer<typeof MandiPriceRecordSchema>;

export const MandiPriceOutputSchema = z.array(MandiPriceRecordSchema);
export type MandiPriceOutput = z.infer<typeof MandiPriceOutputSchema>;


// Schemas for the AI Price Prediction Flow
export const PredictMandiPriceInputSchema = z.object({
  cropType: z.string().describe('The type of crop for which to predict the price.'),
  location: z.string().describe('The geographical location (state) of the crop.'),
  district: z.string().describe('The geographical location (district) of the crop.'),
  language: z.string().describe('The language for the output.'),
});

const WeeklyPredictionSchema = z.object({
  week: z.string().describe('The week for the prediction (e.g., "Week 1", "Week 2").'),
  price: z.number().describe('The predicted price per quintal for that week.'),
});

export const PredictMandiPriceOutputSchema = z.object({
  predictions: z.array(WeeklyPredictionSchema).describe('A list of price predictions for the next 4 weeks.'),
  analysis: z.string().describe('A brief analysis of the price trend and the factors influencing it. Must be in the requested language.'),
});
