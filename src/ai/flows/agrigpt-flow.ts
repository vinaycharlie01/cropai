
'use server';

/**
 * @fileOverview The central brain for the AgriGPT conversational AI assistant.
 *
 * This file defines the main agentic flow for the Kisan Mitra assistant. It uses
 * other specialized AI flows as "tools" to answer complex user queries.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { predictMandiPriceTool } from './predict-mandi-price';
import { schemeAdvisorTool } from './scheme-advisor';
import { sprayingAdviceTool } from './spraying-advice';
import { generate } from 'genkit';

// Define the structure of a single message in the conversation history
const HistoryPartSchema = z.object({
  role: z.enum(['user', 'model', 'tool']),
  content: z.array(z.object({ 
    text: z.string().optional(),
    toolRequest: z.any().optional(),
    toolResponse: z.any().optional(),
  })),
});
export type HistoryPart = z.infer<typeof HistoryPartSchema>;


// Define the input schema for the AgriGPT flow
const AgriGptInputSchema = z.object({
  transcribedQuery: z.string().describe("The user's transcribed voice query."),
  conversationHistory: z.array(HistoryPartSchema).describe('The history of the current conversation for context.'),
  language: z.string().describe('The preferred language for the response (e.g., "English", "Hindi").'),
});
export type AgriGptInput = z.infer<typeof AgriGptInputSchema>;

// Define the output schema for the AgriGPT flow
const AgriGptOutputSchema = z.object({
  kisanMitraResponse: z.string().describe("The final, user-facing response in the user's preferred language. It should be conversational and empathetic."),
});
export type AgriGptOutput = z.infer<typeof AgriGptOutputSchema>;

/**
 * The main exported function that the frontend will call.
 */
export async function processAgriGptCommand(input: AgriGptInput): Promise<AgriGptOutput> {
  return agrigptFlow(input);
}


// Define the Genkit Flow that orchestrates the AI call
const agrigptFlow = ai.defineFlow(
  {
    name: 'agrigptFlow',
    inputSchema: AgriGptInputSchema,
    outputSchema: AgriGptOutputSchema,
  },
  async (input) => {
    
    const response = await generate({
        model: 'googleai/gemini-1.5-flash',
        tools: [predictMandiPriceTool, schemeAdvisorTool, sprayingAdviceTool],
        history: input.conversationHistory as any, // Cast to any to satisfy the complex type
        prompt: `You are Kisan Mitra, a friendly, empathetic, and expert AI assistant for Indian farmers, integrated into the "Kisan Rakshak" app. Your goal is to understand the farmer's query, use your available tools to find the information, and provide a clear, concise, and actionable response.

**IMPORTANT INSTRUCTIONS:**
1.  **Analyze the Query:** Based on the user's query (\`\`\`${input.transcribedQuery}\`\`\`) and conversation history, determine their primary intent.
2.  **Translate to English:** Your entire thought process and tool usage must be in English.
3.  **Use Your Tools:** You have tools to get information about mandi prices, government schemes, and spraying advice. Use them whenever necessary to answer the user's question.
    - When asked about future prices or price forecasts, use the \`predictMandiPriceTool\`.
    - When asked about government schemes, subsidies, or support, use the \`schemeAdvisorTool\`.
    - When asked about pesticide spraying conditions, use the \`sprayingAdviceTool\`.
4.  **Diagnosis Rule**: If the user's intent is to diagnose a crop disease, sick plant, or they describe a symptom like "yellow leaves", you MUST state that you need a photo and that they should go to the "Diagnose Disease" page to upload one. Do not use a tool.
5.  **Synthesize and Translate Final Response:** After using tools, formulate a single, helpful, conversational response. The final response MUST be translated into the user's preferred language: **${input.language}**.
`,
    });
    
    const responseText = response.text();

    if (!responseText) {
        throw new Error('AgriGPT AI did not return a valid text response.');
    }

    return {
        kisanMitraResponse: responseText
    };
  }
);
