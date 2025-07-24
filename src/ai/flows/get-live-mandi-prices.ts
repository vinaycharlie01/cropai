
'use server';

/**
 * @fileOverview A server action to fetch real-time mandi (market) prices from data.gov.in.
 */
import { z } from 'zod';
import { MandiPriceRecordSchema, MandiPriceRecord } from '@/types/mandi-prices';

interface MandiPriceInput {
    state: string;
    district: string;
    market: string;
    commodity: string;
}

const API_KEY = "579b464db66ec23bdd00000179a9b0a0494949954522ba8b8270a691";
const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const BASE_URL = 'https://api.data.gov.in/resource/';

export async function getLiveMandiPrice(input: MandiPriceInput): Promise<MandiPriceRecord[]> {
    const { state, district, market, commodity } = input;
    
    if (!API_KEY) {
      throw new Error('The government API key is not configured. Please add it to the backend.');
    }

    const url = `${BASE_URL}${RESOURCE_ID}?format=json&api-key=${API_KEY}&filters[state]=${encodeURIComponent(state)}&filters[district]=${encodeURIComponent(district)}&filters[market]=${encodeURIComponent(market)}&filters[commodity]=${encodeURIComponent(commodity)}&limit=50`;

    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorBody = await response.text();
            console.error("data.gov.in API error response:", errorBody);
            // Try to parse for a more specific error message from the API's JSON response if possible
            try {
                const errorJson = JSON.parse(errorBody);
                if (errorJson.error) {
                    throw new Error(`The data.gov.in API returned an error: ${errorJson.error}`);
                }
            } catch (e) {
                // If parsing fails, it might be HTML or plain text
                 throw new Error(`The data.gov.in API returned a server error (${response.status}). Please check your filters or try again later.`);
            }
            throw new Error(`The data.gov.in API returned an error: ${response.statusText}`);
        }

        const data = await response.json() as any;

        if (!data.records || data.records.length === 0) {
            return [];
        }
        
        // The API returns records, so we need to validate them.
        const validationResult = z.array(MandiPriceRecordSchema).safeParse(data.records);

        if (!validationResult.success) {
            console.error("Zod validation error:", validationResult.error.errors);
            throw new Error('The data received from the server was in an unexpected format.');
        }
        
        // Sort by latest date and then by highest modal price
        const sortedRecords = validationResult.data.sort((a, b) => {
            const dateA = new Date(a.arrival_date.split('/').reverse().join('-')).getTime();
            const dateB = new Date(b.arrival_date.split('/').reverse().join('-')).getTime();
            
            if (dateB > dateA) return 1;
            if (dateA > dateB) return -1;
            
            return Number(b.modal_price) - Number(a.modal_price);
        });

        return sortedRecords;
        
    } catch (error) {
      console.error('Error fetching Mandi prices:', error);
      if (error instanceof Error && (error.message.includes('API returned an error') || error.message.includes('unexpected format'))) {
        throw error;
      }
      throw new Error('Failed to fetch data from data.gov.in. The service might be down or your filters may not have returned results.');
    }
}
