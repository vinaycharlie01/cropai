
'use server';

/**
 * @fileOverview A Genkit tool to fetch real-time mandi (market) prices from data.gov.in.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import fetch from 'node-fetch';

const API_KEY = process.env.GOVT_API_KEY;
const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const BASE_URL = 'https://api.data.gov.in/resource/';

const MandiPriceInputSchema = z.object({
  state: z.string().describe('The state in India to fetch prices for (e.g., "Karnataka").'),
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

const MandiPriceOutputSchema = z.array(MandiPriceRecordSchema);
export type MandiPriceOutput = z.infer<typeof MandiPriceOutputSchema>;


export const getMandiPriceTool = ai.defineTool(
  {
    name: 'getMandiPriceTool',
    description: 'Fetches real-time market prices for a given commodity in a specific state from the Government of India data portal.',
    inputSchema: MandiPriceInputSchema,
    outputSchema: MandiPriceOutputSchema,
  },
  async ({ state, commodity }) => {
    if (!API_KEY) {
      throw new Error('Government API key is not configured.');
    }

    const url = `${BASE_URL}${RESOURCE_ID}?api-key=${API_KEY}&format=json&filters[state]=${encodeURIComponent(state)}&filters[commodity]=${encodeURIComponent(commodity)}&limit=50`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${await response.text()}`);
      }
      const data: any = await response.json();
      
      if (!data.records || data.records.length === 0) {
        return [];
      }

      // Sort by latest date and then by highest modal price
      const sortedRecords = data.records.sort((a: any, b: any) => {
        const dateA = new Date(a.arrival_date.split('/').reverse().join('-')).getTime();
        const dateB = new Date(b.arrival_date.split('/').reverse().join('-')).getTime();
        if (dateB > dateA) return 1;
        if (dateA > dateB) return -1;
        return Number(b.modal_price) - Number(a.modal_price);
      });
      
      return sortedRecords;
    } catch (error) {
      console.error('Error fetching Mandi prices:', error);
      throw new Error('Failed to fetch data from data.gov.in.');
    }
  }
);
