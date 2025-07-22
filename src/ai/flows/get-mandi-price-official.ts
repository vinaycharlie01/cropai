
'use server';

/**
 * @fileOverview A Genkit tool to get a specific mandi price from Agmarknet.
 *
 * - getMandiPriceOfficial - A function that fetches the mandi price for a specific commodity, state, district, and market.
 * - MandiPriceOfficialInput - The input type for the getMandiPriceOfficial function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const MandiPriceOfficialInputSchema = z.object({
  crop: z.string().describe("The commodity to fetch the price for."),
  state: z.string().describe("The state to fetch the price for."),
  district: z.string().describe("The district to fetch the price for."),
  market: z.string().describe("The market to fetch the price for."),
});
export type MandiPriceOfficialInput = z.infer<typeof MandiPriceOfficialInputSchema>;

export async function getMandiPriceOfficial(input: MandiPriceOfficialInput): Promise<string> {
  return getMandiPriceOfficialFlow(input);
}

const getMandiPriceOfficialFlow = ai.defineFlow(
  {
    name: 'getMandiPriceOfficialFlow',
    inputSchema: MandiPriceOfficialInputSchema,
    outputSchema: z.string(),
  },
  async ({ crop, state, district, market }) => {
    const apiKey = process.env.AGMARKNET_API_KEY_OFFICIAL;
    if (!apiKey) {
      throw new Error("AGMARKNET_API_KEY_OFFICIAL is not set.");
    }

    const url = new URL('https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070');
    url.searchParams.append('api-key', apiKey);
    url.searchParams.append('format', 'json');
    url.searchParams.append('limit', '10');
    url.searchParams.append('filters[commodity]', crop);
    url.searchParams.append('filters[state]', state);
    url.searchParams.append('filters[district]', district);
    url.searchParams.append('filters[market]', market);

    const fetch = (await import('node-fetch')).default;
    
    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      const data = await response.json();

      if (data.records && data.records.length > 0) {
        const latestRecord = data.records.sort((a: any, b: any) => new Date(b.arrival_date).getTime() - new Date(a.arrival_date).getTime())[0];
        const { commodity, market, district, state, arrival_date, modal_price, min_price, max_price } = latestRecord;
        
        return `The mandi price for ${commodity} in ${market}, ${district}, ${state} on ${arrival_date} is:\n- Modal: ₹${modal_price}\n- Min: ₹${min_price}\n- Max: ₹${max_price}`;
      } else {
        return `No mandi price data available for ${crop} in ${state}.`;
      }
    } catch (e) {
      console.error("Failed to fetch from Agmarknet API", e);
      return "Could not connect to the market price service.";
    }
  }
);
