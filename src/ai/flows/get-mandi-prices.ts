'use server';

import { MandiPriceInput, MandiPriceOutputSchema } from '@/types/mandi-prices';

const API_KEY = "579b464db66ec23bdd00000179a9b0a0494949954522ba8b8270a691";
const BASE_URL = 'https://api.data.gov.in/resource/';
const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070'; // Mandi prices

export async function getMandiPrices(input: MandiPriceInput) {
  const { state, district, commodity } = input;

  const url = `${BASE_URL}${RESOURCE_ID}?api-key=${API_KEY}&format=json&filters[state]=${encodeURIComponent(
    state,
  )}&filters[district]=${encodeURIComponent(district)}&filters[commodity]=${encodeURIComponent(
    commodity,
  )}&limit=100`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();

    const records = data.records ?? [];

    // Sort by latest date and then by highest modal price
    const sortedRecords = records.sort((a: any, b: any) => {
        if (!a.arrival_date || !b.arrival_date) return 0;
        // Correctly parse DD/MM/YYYY format
        const dateA = new Date(a.arrival_date.split('/').reverse().join('-')).getTime();
        const dateB = new Date(b.arrival_date.split('/').reverse().join('-')).getTime();
        
        if (dateB > dateA) return 1;
        if (dateA > dateB) return -1;
        
        // Then sort by modal price descending
        const priceA = Number(a.modal_price) || 0;
        const priceB = Number(b.modal_price) || 0;
        return priceB - priceA;
    });

    return MandiPriceOutputSchema.parse(sortedRecords); // validate + return
  } catch (error) {
    console.error('Failed to fetch mandi data:', error);
    throw new Error('Unable to fetch mandi prices at the moment.');
  }
}
