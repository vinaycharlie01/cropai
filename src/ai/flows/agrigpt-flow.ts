
'use server';

/**
 * @fileOverview The central brain for the AgriGPT conversational AI assistant.
 *
 * This file defines the main agentic flow for the Kisan Mitra assistant. It uses
 * other specialized AI flows as "tools" to answer complex user queries.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { diagnoseCropDiseaseTool } from './diagnose-crop-disease';
import { predictMandiPriceTool } from './predict-mandi-price';
import { schemeAdvisorTool } from './scheme-advisor';
import { getWeatherTool } from './weather-api';
import { sprayingAdviceTool } from './spraying-advice';

// Define the structure of a single message in the conversation history
const HistoryPartSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(z.object({ text: z.string() })),
});

// Define the input schema for the AgriGPT flow
const AgriGptInputSchema = z.object({
  transcribedQuery: z.string().describe("The user's transcribed voice query."),
  conversationHistory: z.array(HistoryPartSchema).describe('The history of the current conversation for context.'),
  currentScreen: z.string().describe('The current screen the user is on, to provide context for the query.'),
  language: z.string().describe('The preferred language for the response (e.g., "English", "Hindi").'),
});
export type AgriGptInput = z.infer<typeof AgriGptInputSchema>;

// Define the output schema for the AgriGPT flow
const AgriGptOutputSchema = z.object({
  intent: z.string().describe('A brief summary of the user\'s primary goal (e.g., GET_MANDI_PRICE, DIAGNOSE_DISEASE).'),
  kisanMitraResponse: z.string().describe("The final, user-facing response in the user's preferred language. It should be conversational and empathetic."),
  actionCode: z.enum(['SPEAK_ONLY', 'REQUEST_IMAGE_FOR_DIAGNOSIS', 'CLARIFY']).describe('The action the app should take.'),
  status: z.enum(['success', 'clarification_needed', 'error']).describe('The status of the processing.'),
});
export type AgriGptOutput = z.infer<typeof AgriGptOutputSchema>;

/**
 * The main exported function that the frontend will call.
 */
export async function processAgriGptCommand(input: AgriGptInput): Promise<AgriGptOutput> {
  return agrigptFlow(input);
}


// Define the main prompt for the AgriGPT brain
const agrigptPrompt = ai.definePrompt({
  name: 'agrigptMasterPrompt',
  input: { schema: AgriGptInputSchema },
  output: { schema: AgriGptOutputSchema },
  tools: [diagnoseCropDiseaseTool, predictMandiPriceTool, schemeAdvisorTool, getWeatherTool, sprayingAdviceTool],
  prompt: `You are Kisan Mitra, a friendly, empathetic, and expert AI assistant for Indian farmers, integrated into the "Kisan Rakshak" app. Your goal is to understand the farmer's query, determine their intent, use available tools to gather information, and provide a clear, concise, and actionable response in their preferred language.

**CONTEXT:**
*   Farmer's Query: "{{{transcribedQuery}}}"
*   Preferred Language: {{{language}}}
*   Current App Screen: {{{currentScreen}}}
*   Conversation History:
    {{#each conversationHistory}}
    - {{role}}: {{parts.[0].text}}
    {{/each}}

**YOUR TASK & REASONING PROCESS:**
1.  **Analyze the Query:** Based on all context, determine the farmer's primary intent.
2.  **Think Step-by-Step:**
    *   Can you answer directly?
    *   Do you need to use one of your tools?
    *   **Diagnosis Rule**: If you need to use the 'diagnoseCropDiseaseTool', you MUST check if a photo has been provided. If not, you MUST ask the user for a photo. Set the actionCode to 'REQUEST_IMAGE_FOR_DIAGNOSIS'.
    *   **Weather Rule**: If the user asks about the weather, you MUST use the 'getWeatherTool'. After getting the forecast data from the tool, you MUST then call the 'sprayingAdviceTool' with that forecast data and the user's preferred 'language'. Finally, combine the weather information and the spraying advice into a single, helpful 'kisanMitraResponse'. If the user's location is ambiguous, ask for clarification before calling the tool.
    *   If the query is ambiguous for any other tool, ask for clarification.
3.  **Use Tools:** If you have enough information, call the necessary tool(s) to get the required data.
4.  **Synthesize the Final Response:** Combine the user's query and the tool's output to formulate a single, helpful 'kisanMitraResponse'.
5.  **Translate:** The final response MUST be in the requested language: **{{{language}}}**.
6.  **Provide Structured JSON Output:** Your entire response must be a single, valid JSON object matching the output schema.

**Example Scenario (Diagnosis without photo):**
- Query: "నా పంటకు ఏదో సమస్య ఉంది, నేను ఏమి చేయాలి?" (My crop has some problem, what should I do?)
- Language: Telugu
- Expected Action: "REQUEST_IMAGE_FOR_DIAGNOSIS"
- Expected Response (Localized): "తప్పకుండా, నేను సహాయం చేయగలను. దయచేసి సమస్య ఉన్న మొక్క యొక్క ఫోటో తీసి చూపండి."

Now, process the provided query and generate the JSON response.
`,
});

// Define the Genkit Flow that orchestrates the AI call
const agrigptFlow = ai.defineFlow(
  {
    name: 'agrigptFlow',
    inputSchema: AgriGptInputSchema,
    outputSchema: AgriGptOutputSchema,
  },
  async (input) => {
    const { output } = await agrigptPrompt(input);

    if (!output) {
      throw new Error('AgriGPT AI did not return a valid response.');
    }

    return output;
  }
);
