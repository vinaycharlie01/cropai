
'use server';

/**
 * @fileOverview An AI agent for predicting agricultural risks.
 *
 * - getRiskAlerts - A function that returns potential pest and weather alerts.
 * - RiskAlertInput - The input type for the getRiskAlerts function.
 * - RiskAlert - The individual alert type in the output.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const RiskAlertInputSchema = z.object({
  location: z.string().describe('The geographical location (e.g., district, state) for the risk assessment.'),
  cropType: z.string().describe('The primary crop being grown in the location.'),
});
export type RiskAlertInput = z.infer<typeof RiskAlertInputSchema>;

export const RiskAlertSchema = z.object({
  riskType: z.enum(['pest', 'weather']).describe('The type of risk.'),
  riskLevel: z.enum(['low', 'medium', 'high']).describe('The severity of the risk.'),
  predictedDate: z.string().describe('The ISO 8601 date when the risk is predicted to be highest.'),
  advisory: z.string().describe('A concise, actionable advisory for the farmer on how to mitigate the risk.'),
  cropAffected: z.string().describe('The specific crop that is likely to be affected.'),
});
export type RiskAlert = z.infer<typeof RiskAlertSchema>;

const RiskAlertOutputSchema = z.array(RiskAlertSchema);

export async function getRiskAlerts(input: RiskAlertInput): Promise<RiskAlert[]> {
  return riskAlertsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'riskAlertsPrompt',
  input: {schema: RiskAlertInputSchema},
  output: {schema: RiskAlertOutputSchema},
  prompt: `You are AgriShield AI, a sophisticated agricultural risk prediction engine. Your task is to generate potential pest and weather alerts for a farmer based on their location and crop.

**CONTEXT:**
*   **Farmer's Location:** {{{location}}}
*   **Farmer's Crop:** {{{cropType}}}
*   **Current Date:** ${new Date().toLocaleDateString('en-CA')}

**INSTRUCTIONS:**
1.  **Simulate Risk Analysis:** Based on the location, crop, and time of year, simulate a risk analysis. Create between 1 to 3 relevant alerts.
2.  **Generate Weather Alerts:** If relevant, create a weather alert. Examples: "High heatwave expected," "Risk of unseasonal heavy rainfall," "Potential for morning frost."
3.  **Generate Pest Alerts:** If relevant, create a pest alert. Identify a common pest for the given crop and location. Examples: "High probability of Pink Bollworm infestation in Cotton," "Favorable conditions for Aphid outbreak in Mustard."
4.  **Set Risk Level:** For each alert, assign a 'low', 'medium', or 'high' risk level based on your simulated analysis.
5.  **Set Predicted Date:** Predict a date within the next 7-10 days when the risk is most likely.
6.  **Write Advisory:** For each alert, provide a simple, 1-sentence actionable advisory.
7.  **Format Output:** Return the alerts as a JSON array matching the defined schema. If no significant risks are identified, return an empty array.

Generate the JSON array of risk alerts now.
`,
});

const riskAlertsFlow = ai.defineFlow(
  {
    name: 'riskAlertsFlow',
    inputSchema: RiskAlertInputSchema,
    outputSchema: RiskAlertOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      return []; // Return an empty array if the model provides no output
    }
    return output;
  }
);
