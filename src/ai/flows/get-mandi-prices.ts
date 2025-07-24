
'use server';

/**
 * @fileOverview A Genkit tool to fetch real-time mandi (market) prices from data.gov.in.
 */
import { ai } from '@/ai/genkit';
import { MandiPriceInputSchema, MandiPriceOutputSchema, MandiPriceInput, MandiPriceOutput } from '@/types/mandi-prices';

// This is not best practice for production, but is used here to ensure functionality in the dev environment.
const API_KEY = "579b464db66ec23bdd00000179a9b0a0494949954522ba8b8270a691";
const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const BASE_URL = 'https://api.data.gov.in/resource/';

export const getMandiPriceTool = ai.defineTool(
  {
    name: 'getMandiPriceTool',
    description: 'Fetches real-time market prices for a given commodity in a specific state and district from the Government of India data portal.',
    inputSchema: MandiPriceInputSchema,
    outputSchema: MandiPriceOutputSchema,
  },
  async ({ state, district, commodity }): Promise<MandiPriceOutput> => {
    if (!API_KEY) {
      throw new Error('Government API key is not configured.');
    }

    const url = `${BASE_URL}${RESOURCE_ID}?api-key=${API_KEY}&format=json&filters[state]=${encodeURIComponent(state)}&filters[district]=${encodeURIComponent(district)}&filters[commodity]=${encodeURIComponent(commodity)}&limit=50`;

    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes('<pre>')) {
           const message = errorText.split('<pre>')[1].split('</pre>')[0];
           throw new Error(`API Error: ${message.trim()}`);
        }
        throw new Error(`An unexpected response was received from the server.`);
      }

      const data: any = await response.json();
      
      if (!data.records || data.records.length === 0) {
        return [];
      }

      const sortedRecords = data.records.sort((a: any, b: any) => {
        const priceA = Number(a.modal_price) || 0;
        const priceB = Number(b.modal_price) || 0;
        
        if (priceB > priceA) return 1;
        if (priceA > priceB) return -1;

        try {
            const dateA = new Date(a.arrival_date.split('/').reverse().join('-')).getTime();
            const dateB = new Date(b.arrival_date.split('/').reverse().join('-')).getTime();
            return dateB - dateA;
        } catch (e) {
            return 0;
        }
      });
      
      return sortedRecords;
    } catch (error) {
      console.error('Error fetching Mandi prices:', error);
      if (error instanceof Error && (error.message.includes('API Error') || error.message.includes('An unexpected response'))) {
        throw error;
      }
      throw new Error('Could not load live market prices. The data.gov.in service may be temporarily unavailable or the commodity may not be available in the selected location.');
    }
  }
);
