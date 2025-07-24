
'use server';
/**
 * @fileOverview A Genkit tool to fetch real-time mandi (market) prices from data.gov.in.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { MandiPriceRecordSchema } from '@/types/mandi-prices';

// This is the input schema that the AgriGPT agent will use.
// It's simpler and more flexible than the raw API requirements.
const MandiPriceToolInputSchema = z.object({
  state: z.string().describe("The state to search for prices in, e.g., 'Karnataka'"),
  commodity: z.string().describe("The crop to search for, e.g., 'Tomato'"),
  district: z.string().optional().describe("The district to search for prices in, e.g., 'Chittor'"),
});

// Main exported function for the agent
export const getLiveMandiPriceTool = ai.defineTool(
  {
    name: 'getLiveMandiPriceTool',
    description: 'Fetches real-time mandi (market) prices for a specific crop in a given state or district.',
    inputSchema: MandiPriceToolInputSchema,
    outputSchema: z.array(MandiPriceRecordSchema),
  },
  async ({ state, district, commodity }) => {
    const API_KEY = "579b464db66ec23bdd00000179a9b0a0494949954522ba8b8270a691";
    const RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";
    const BASE_URL = 'https://api.data.gov.in/resource/';

    let url = `${BASE_URL}${RESOURCE_ID}?format=json&api-key=${API_KEY}&filters[state]=${encodeURIComponent(state)}&filters[commodity]=${encodeURIComponent(commodity)}&limit=100`;
    
    if (district) {
      url += `&filters[district]=${encodeURIComponent(district)}`;
    }

    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("data.gov.in API Error:", errorText);
        throw new Error(`API request failed with status ${response.status}. Message: ${errorText.substring(0, 200)}`);
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
      
      const validatedRecords = MandiPriceRecordSchema.array().safeParse(sortedRecords);
      if (!validatedRecords.success) {
        console.error("Zod validation error:", validatedRecords.error);
        throw new Error("Received unexpected data format from the API.");
      }

      return validatedRecords.data.slice(0, 10); // Return top 10 results
    } catch (error) {
      console.error('Error fetching or parsing Mandi prices:', error);
      throw new Error(`Failed to get live prices. The service might be temporarily unavailable or your search returned no results. Details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);
