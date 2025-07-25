
'use server';
/**
 * @fileOverview The central agentic flow for AgriGPT.
 * This flow coordinates multiple tools to provide comprehensive answers to farmer queries.
 */

import { ai } from '@/ai/genkit';
import { diagnoseCropDiseaseTool } from './diagnose-crop-disease';
import { getLiveMandiPriceTool } from './get-live-mandi-prices';
import { getWeatherTool } from './weather-api';
import { schemeAdvisorTool } from './scheme-advisor';
import { AgriGptInput, AgriGptInputSchema, AgriGptOutput, AgriGptOutputSchema } from '@/types/agrigpt';

// Other flow imports for genkit dev server
import './diagnose-crop-disease.ts';
import './selling-advice.ts';
import './irrigation-advice.ts';
import './support-chat.ts';
import './crop-health-analytics.ts';
import './daily-crop-growth.ts';
import './insurance-advice.ts';
import './assess-loan-eligibility.ts';
import './get-risk-alerts.ts';
import './tts-flow.ts';
import './scheme-advisor.ts';
import './predict-mandi-price.ts';
import './get-live-mandi-prices.ts';


const agriGptPrompt = ai.definePrompt(
  {
    name: 'agriGptPrompt',
    input: { schema: AgriGptInputSchema },
    output: { schema: AgriGptOutputSchema },
    tools: [diagnoseCropDiseaseTool, getLiveMandiPriceTool, getWeatherTool, schemeAdvisorTool],
    system: `You are AgriGPT, a friendly and expert AI assistant for Indian farmers. Your primary role is to be a helpful guide. Understand the user's problem and guide them to the correct solution by using your specialized tools.

    **Core Instructions:**
    1.  **Be Empathetic and Simple:** Always communicate in simple, clear, and encouraging language. Avoid jargon. Address the user's concerns directly. Your entire response MUST be in the requested language: **{{{language}}}**.
    2.  **Guide, Don't Just Answer:** Your main goal is to understand the user's need and invoke the correct tool.
        *   If the user mentions a sick plant, crop problems, yellow leaves, spots, etc., you MUST recognize this as a crop health issue. Your response should be to guide them to the diagnosis feature by asking for a photo. Say something like: "I can help with that. To diagnose the issue, I'll need a photo of the plant. Please upload one."
        *   If the user asks about market prices, rates, or "mandi bhav," use the \`getLiveMandiPriceTool\`.
        *   If the user asks about government support, subsidies, or schemes, use the \`schemeAdvisorTool\`. You will likely need to ask for their state and needs.
        *   If the user asks about the weather, rain, or forecast, use the \`getWeatherTool\`.
    3.  **Synthesize and Add Value:** Do not just dump raw tool output.
        *   **Weather:** After getting the forecast from the tool, analyze it. If wind speed is high (e.g., > 15 kph) or chance of rain is high (e.g., > 40%), you MUST add a spraying recommendation like: "Since the wind is strong today, it might not be the best day for spraying."
        *   **Mandi Prices:** If you find a high price, advise the user it's a good time to sell.
    4.  **Handle Ambiguity:** If the user's request is unclear, ask clarifying questions. For example, if they ask for "prices," ask "Which crop and for which state or district are you interested in?"
    5.  **Memory:** Use the provided conversation history to understand the context. If a user has been discussing a specific crop, remember it for follow-up questions.
    
    Start the conversation by introducing yourself and asking how you can help.
    `,
    prompt: `Here is the current conversation history:
    {{#each history}}
    **{{role}}**: {{{content.[0].text}}}
    {{/each}}
    
    Here is the user's latest message:
    {{{message}}}
    
    Provide a helpful response now. Your entire response must be a valid JSON object matching the defined schema.`,
  },
);


const agriGptFlow = ai.defineFlow(
  {
    name: 'agriGptFlow',
    inputSchema: AgriGptInputSchema,
    outputSchema: AgriGptOutputSchema,
  },
  async (input) => {
    try {
        const { output } = await agriGptPrompt(input);
        if (!output?.reply) {
            throw new Error("The AgriGPT agent did not return a valid reply.");
        }
        return output;
    } catch (e: any) {
         console.error("AgriGPT Flow Error:", e);
         // Provide a more user-friendly error message
         if (e.message?.includes('The AI diagnosis service is currently overloaded')) {
             return { reply: "I'm sorry, the diagnosis service is currently very busy. Please try again in a few minutes." };
         }
         if (e.message?.includes('Failed to get live prices')) {
             return { reply: "I'm sorry, I'm having trouble fetching the live market prices right now. The government data service might be temporarily unavailable. Please try again later." };
         }
         if (e.message?.includes('weather service is not configured') || e.message?.includes('weather service is unavailable')) {
             return { reply: "I'm sorry, the live weather service is not configured. Please add a WeatherAPI.com API key to use this feature." };
         }
         // Generic fallback for quota errors or other unexpected issues.
         return { reply: `I'm sorry, I ran into an issue. Please try rephrasing your question or ask me something else.` };
    }
  }
);


export async function agriGpt(input: AgriGptInput): Promise<AgriGptOutput> {
  return await agriGptFlow(input);
}
