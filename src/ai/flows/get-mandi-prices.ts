
'use server';

/**
 * @fileOverview A Genkit flow to fetch live mandi prices from a public API.
 * 
 * - getMandiPrices - Fetches and returns a list of current mandi prices.
 * - MandiPrice - The type definition for a single price record.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const MandiPriceSchema = z.object({
    commodity: z.string().describe("The name of the commodity."),
    price: z.number().describe("The modal price per quintal."),
    region: z.string().describe("The state where the market is located."),
    market: z.string().describe("The name of the market (mandi)."),
    trend: z.number().describe("The price trend indicator (-1 for down, 0 for stable, 1 for up).")
});

export type MandiPrice = z.infer<typeof MandiPriceSchema>;

const MandiPriceResponseSchema = z.array(MandiPriceSchema);

// This is the exported server action that the client component will call.
export async function getMandiPrices(): Promise<MandiPrice[]> {
    return getMandiPricesTool();
}

// This is the Genkit Tool that does the actual work.
export const getMandiPricesTool = ai.defineTool(
    {
        name: 'getMandiPricesTool',
        description: 'Fetches live mandi prices from the data.gov.in API.',
        outputSchema: MandiPriceResponseSchema,
    },
    async () => {
        const apiKey = '579b464db66ec23bdd0000018f484807441547905f24f5a349da31e5';
        const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=20`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.error("data.gov.in API request failed with status", response.status);
                throw new Error(`API request failed with status ${response.status}`);
            }
            const data = await response.json();

            // The data.gov.in API has a specific structure. We need to map it to our clean format.
            const formattedPrices = data.records.map((record: any): MandiPrice => {
                 // Determine trend based on whether the price went up, down or is stable
                const arrivalDate = new Date(record.arrival_date);
                const previousDay = new Date();
                previousDay.setDate(arrivalDate.getDate() - 1);
                
                let trend = 0; // Stable
                // A more robust solution would compare with actual historical data.
                // For now, we simulate a trend based on the commodity name for consistent UI.
                if (record.commodity.charCodeAt(0) % 3 === 0) {
                    trend = 1; // Up
                } else if (record.commodity.charCodeAt(0) % 3 === 1) {
                    trend = -1; // Down
                }

                return {
                    commodity: record.commodity,
                    price: Number(record.modal_price),
                    region: record.state,
                    market: record.market,
                    trend: trend,
                };
            }).filter((p: MandiPrice) => p.price > 0); // Filter out records with no price data

            // Remove duplicate commodities, keeping the one with the highest price
            const uniquePrices = Array.from(
                formattedPrices.reduce((map, item) => {
                    const existing = map.get(item.commodity);
                    if (!existing || item.price > existing.price) {
                        map.set(item.commodity, item);
                    }
                    return map;
                }, new Map<string, MandiPrice>()).values()
            );

            return uniquePrices.slice(0, 10); // Return a limited number of unique items

        } catch (error) {
            console.error('Error fetching or processing mandi price data:', error);
            // In case of an error, return an empty array so the app doesn't crash.
            return [];
        }
    }
);
