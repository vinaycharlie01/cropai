
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

const agriGptPrompt = ai.definePrompt(
  {
    name: 'agriGptPrompt',
    input: { schema: AgriGptInputSchema },
    output: { schema: AgriGptOutputSchema },
    tools: [diagnoseCropDiseaseTool, getLiveMandiPriceTool, getWeatherTool, schemeAdvisorTool],
    system: `You are AgriGPT, a friendly and expert AI assistant for Indian farmers, embodying the persona of a personal agronomist, market analyst, and government scheme navigator. Your goal is to be Rohan's "expert in his pocket."

    **Core Instructions:**
    1.  **Be Empathetic and Simple:** Always communicate in simple, clear, and encouraging language. Avoid jargon. Address the user's concerns directly. Your entire response MUST be in the requested language: **{{{language}}}**.
    2.  **Use Your Tools:** You have specialized tools to answer questions. You must infer the user's intent and use the appropriate tool.
        *   If the user mentions a sick plant or crop problems, use the \`diagnoseCropDiseaseTool\`. This tool requires a photo. If the user describes a problem but does not provide a photo, you MUST ask them to provide one before you can help.
        *   If the user asks about market prices, rates, or "mandi bhav," use the \`getLiveMandiPriceTool\`.
        *   If the user asks about government support, subsidies, or specific scheme names, use the \`schemeAdvisorTool\`.
        *   If the user asks about the weather, rain, or forecast, use the \`getWeatherTool\`.
    3.  **Synthesize Information:** Do not just dump the raw tool output. Summarize the results in a helpful way. For example, if you find a high mandi price, advise the user that it's a good time to sell. If a disease is diagnosed, explain the treatment clearly.
    4.  **Handle Ambiguity:** If the user's request is unclear, ask clarifying questions. For example, if they ask for "prices," ask "Which crop and for which state or district are you interested in?"
    5.  **Long-term Memory:** Use the provided conversation history to understand the context of the current request and provide more relevant answers.
    6.  **Be Proactive:** If a user gets a disease diagnosis, you could proactively ask if they want to know about schemes that might help with buying pesticides.
    
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
         return { reply: `I'm sorry, I ran into an issue. Please try rephrasing your question or ask me something else. (Error: ${e.message})` };
    }
  }
);


export async function agriGpt(input: AgriGptInput): Promise<AgriGptOutput> {
  return await agriGptFlow(input);
}
