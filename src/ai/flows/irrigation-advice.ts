'use server';

/**
 * @fileOverview An AI agent for providing smart irrigation advice.
 *
 * - getIrrigationAdvice - A function that provides advice on when and how much to irrigate crops.
 * - IrrigationAdviceInput - The input type for the getIrrigationAdvice function.
 * - IrrigationAdviceOutput - The return type for the getIrrigationAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IrrigationAdviceInputSchema = z.object({
  cropType: z.string().describe('The type of crop being grown.'),
  location: z.string().describe('The geographical location of the farm.'),
  soilType: z.string().describe('The type of soil in the field (e.g., "Sandy", "Clay", "Loam").'),
  currentWeather: z.string().describe('The current weather conditions (e.g., "Sunny", "Cloudy", "Recent heavy rain").'),
  language: z.string().describe('The language for the advice (e.g., "English", "Hindi").'),
});
export type IrrigationAdviceInput = z.infer<typeof IrrigationAdviceInputSchema>;

const IrrigationAdviceOutputSchema = z.object({
  recommendation: z.string().describe('A clear, direct recommendation, such as "Irrigate Now", "Wait 2 Days", or "No Irrigation Needed".'),
  reasoning: z.string().describe('A detailed explanation for the recommendation, considering all input factors.'),
  amount: z.string().describe('The suggested amount of water to use (e.g., "Light watering", "Deep watering for 1 hour", "1 inch of water").'),
});
export type IrrigationAdviceOutput = z.infer<typeof IrrigationAdviceOutputSchema>;

export async function getIrrigationAdvice(input: IrrigationAdviceInput): Promise<IrrigationAdviceOutput> {
  return irrigationAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'irrigationAdvicePrompt',
  input: {schema: IrrigationAdviceInputSchema},
  output: {schema: IrrigationAdviceOutputSchema},
  prompt: `You are an agricultural irrigation specialist. Your task is to provide water-saving irrigation advice based on the farmer's inputs.

**INPUTS:**
*   Crop: {{{cropType}}}
*   Location: {{{location}}}
*   Soil Type: {{{soilType}}}
*   Current Weather: {{{currentWeather}}}
*   Language: {{{language}}}

**INSTRUCTIONS:**
1.  Analyze all inputs to make a holistic recommendation.
2.  Consider the water needs of the specified crop, the water retention properties of the soil type, and the impact of the current weather. For example, recent rain means less irrigation is needed. Clay soil holds more water than sandy soil.
3.  Provide a clear, actionable recommendation in the 'recommendation' field.
4.  Explain your reasoning in the 'reasoning' field.
5.  Suggest a specific amount of water in the 'amount' field.
6.  Your entire response MUST be in the requested language: **{{{language}}}**.

Provide the structured JSON output now.
`,
});

const irrigationAdviceFlow = ai.defineFlow(
  {
    name: 'irrigationAdviceFlow',
    inputSchema: IrrigationAdviceInputSchema,
    outputSchema: IrrigationAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
