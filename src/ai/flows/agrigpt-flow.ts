
'use server';

/**
 * @fileOverview The central brain for the AgriGPT conversational AI assistant.
 *
 * This file defines the main agentic flow for the Kisan Mitra assistant. It uses
 * other specialized AI flows as "tools" to answer complex user queries.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

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
  prompt: `You are Kisan Mitra, a friendly, empathetic, and expert AI assistant for Indian farmers, integrated into the "Kisan Rakshak" app. Your goal is to understand the farmer's query, determine their intent, and provide a clear, concise, and actionable response in their preferred language.

**CONTEXT:**
*   Farmer's Query: "{{{transcribedQuery}}}"
*   Preferred Language: {{{language}}}
*   Current App Screen: {{{currentScreen}}}
*   Conversation History:
    {{#each conversationHistory}}
    - {{role}}: {{parts.[0].text}}
    {{/each}}

**YOUR TASK & REASONING PROCESS:**
1.  **Analyze the Query:** Based on all context, determine the farmer's primary intent (e.g., get price, diagnose, find scheme).
2.  **Diagnosis Rule**: If the user's intent is to diagnose a crop disease, sick plant, or they describe a symptom like "yellow leaves", you MUST ask for a photo. Your response MUST be to request an image. Set the 'intent' to 'DIAGNOSE_DISEASE', the 'actionCode' to 'REQUEST_IMAGE_FOR_DIAGNOSIS', and 'status' to 'clarification_needed'. Formulate a 'kisanMitraResponse' in the user's language asking them to provide a photo.
3.  **Other Topics**: For any other topic (prices, schemes, etc.), provide a helpful, conversational response that guides the user to the correct page in the app.
4.  **Synthesize the Final Response:** Formulate a single, helpful 'kisanMitraResponse'.
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
