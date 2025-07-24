
'use server';

/**
 * @fileOverview A Genkit tool to fetch real-time mandi (market) prices from data.gov.in.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import fetch from 'node-fetch';
import { MandiPriceInputSchema, MandiPriceOutputSchema, MandiPriceInput, MandiPriceOutput } from '@/types/mandi-prices';

const API_KEY = process.env.API_KEY;
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
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        // Sometimes the API returns HTML for errors, try to extract a useful message.
        if (errorText.includes('<pre>')) {
           const message = errorText.split('<pre>')[1].split('</pre>')[0];
           throw new Error(`API Error: ${message.trim()}`);
        }
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }
      const data: any = await response.json();
      
      if (!data.records || data.records.length === 0) {
        return [];
      }

      // Sort by latest date and then by highest modal price
      const sortedRecords = data.records.sort((a: any, b: any) => {
        // Correctly parse DD/MM/YYYY format
        const dateA = new Date(a.arrival_date.split('/').reverse().join('-')).getTime();
        const dateB = new Date(b.arrival_date.split('/').reverse().join('-')).getTime();
        
        if (dateB > dateA) return 1;
        if (dateA > dateB) return -1;
        
        // Then sort by modal price descending
        return Number(b.modal_price) - Number(a.modal_price);
      });
      
      return sortedRecords;
    } catch (error) {
      console.error('Error fetching Mandi prices:', error);
      if (error instanceof Error && error.message.includes('API Error')) {
        throw error;
      }
      throw new Error('Failed to fetch data from data.gov.in. The service might be down or your filters may not have returned results.');
    }
  }
);
