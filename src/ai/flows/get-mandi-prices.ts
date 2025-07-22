
'use server';
/**
 * @fileOverview A Genkit tool to get real-time mandi prices from Agmarknet.
 *
 * - getMandiPrices - A function that fetches mandi prices for a given state and commodity.
 * - MandiPriceInput - The input type for the getMandiPrices function.
 * - MandiPriceRecord - The type for a single record in the returned data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const MandiPriceInputSchema = z.object({
    state: z.string().describe("The state to fetch prices for."),
    commodity: z.string().describe("The commodity to fetch prices for."),
});
export type MandiPriceInput = z.infer<typeof MandiPriceInputSchema>;

const MandiPriceRecordSchema = z.object({
    state: z.string(),
    district: z.string(),
    market: z.string(),
    commodity: z.string(),
    variety: z.string(),
    arrival_date: z.string(),
    min_price: z.number(),
    max_price: z.number(),
    modal_price: z.number(),
});
export type MandiPriceRecord = z.infer<typeof MandiPriceRecordSchema>;

const MandiPriceOutputSchema = z.array(MandiPriceRecordSchema);


export async function getMandiPrices(input: MandiPriceInput): Promise<MandiPriceRecord[]> {
  return getMandiPricesFlow(input);
}


const getMandiPricesFlow = ai.defineFlow(
  {
    name: 'getMandiPricesFlow',
    inputSchema: MandiPriceInputSchema,
    outputSchema: MandiPriceOutputSchema,
  },
  async ({ state, commodity }) => {
    const apiKey = process.env.AGMARKNET_API_KEY;
    if (!apiKey) {
      throw new Error("AGMARKNET_API_KEY is not set.");
    }

    const url = new URL('https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070');
    url.searchParams.append('api-key', apiKey);
    url.searchParams.append('format', 'json');
    url.searchParams.append('limit', '50'); // Increase limit to get more results
    url.searchParams.append('filters[state]', state);
    
    // Using a more flexible search for commodity
    url.searchParams.append('query', commodity);
    
    // Sort by latest arrival date
    url.searchParams.append('sort[arrival_date]', 'desc');
    
    const fetch = (await import('node-fetch')).default;
    
    try {
        const response = await fetch(url.toString());
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Agmarknet API request failed: ${errorText}`);
            throw new Error(`Agmarknet API request failed with status ${response.status}`);
        }
        const data = await response.json();
        
        // The API returns prices as strings, so we need to parse them.
        // It also can return "NA" for prices, so we need to handle that.
        const parsedRecords = (data.records || [])
          .filter((record: any) => record.commodity.toLowerCase().includes(commodity.toLowerCase()))
          .map((record: any) => ({
            ...record,
            min_price: Number(record.min_price) || 0,
            max_price: Number(record.max_price) || 0,
            modal_price: Number(record.modal_price) || 0,
          }))
          .filter((record: MandiPriceRecord) => record.modal_price > 0); // Filter out records with no modal price

        return parsedRecords;

    } catch (e) {
        console.error("Failed to fetch from Agmarknet API", e);
        throw new Error("Could not connect to the market price service.");
    }
  }
);
