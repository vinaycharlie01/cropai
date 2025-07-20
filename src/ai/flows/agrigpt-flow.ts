
'use server';

/**
 * @fileOverview The central brain for the AgriGPT conversational AI assistant.
 *
 * - processAgriGptCommand - The primary function for handling user voice commands.
 * - AgriGptInput - The input type for the processAgriGptCommand function.
 * - AgriGptOutput - The return type for the processAgriGptCommand function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the structure of a single message in the conversation history
const HistoryPartSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(z.object({text: z.string()})),
});

// Define the input schema for the AgriGPT flow
export const AgriGptInputSchema = z.object({
  transcribedQuery: z.string().describe("The user's transcribed voice query."),
  conversationHistory: z.array(HistoryPartSchema).describe('The history of the current conversation for context.'),
  currentScreen: z.string().describe('The current screen the user is on, to provide context for the query.'),
  language: z.string().describe('The preferred language for the response (e.g., "English", "Hindi").'),
});
export type AgriGptInput = z.infer<typeof AgriGptInputSchema>;

// Define the output schema for the AgriGPT flow
export const AgriGptOutputSchema = z.object({
  intent: z.string().describe('The recognized intent from the user query (e.g., GET_MANDI_PRICE, DIAGNOSE_DISEASE).'),
  parameters: z.record(z.any()).describe('A map of extracted parameters from the query (e.g., {"crop_type": "tomato"}).'),
  actionCode: z.enum(['SPEAK_ONLY', 'SPEAK_AND_NAVIGATE', 'REQUEST_IMAGE', 'CLARIFY']).describe('The action the app should take.'),
  navigationTarget: z.string().optional().describe('The screen to navigate to, if actionCode is SPEAK_AND_NAVIGATE.'),
  kisanMitraResponse: z.object({
    english: z.string().describe('The AI-generated response in English.'),
    localized: z.string().describe('The AI-generated response translated into the user\'s preferred language.'),
  }).describe('The final, user-facing response.'),
  status: z.enum(['success', 'clarification_needed', 'error']).describe('The status of the processing.'),
  followUpQuestionLocalized: z.string().optional().describe('A question to ask the user if more information is needed.'),
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
  input: {schema: AgriGptInputSchema},
  output: {schema: AgriGptOutputSchema},
  prompt: `You are AgriGPT, a friendly, empathetic, and expert AI assistant for Indian farmers, integrated into the "Kisan Rakshak" app. Your goal is to understand the farmer's query, determine their intent, and provide a clear, concise, and actionable response in their preferred language.

**CONTEXT:**
*   Farmer's Query: "{{{transcribedQuery}}}"
*   Preferred Language: {{{language}}}
*   Current App Screen: {{{currentScreen}}}
*   Conversation History:
    {{#each conversationHistory}}
    - {{role}}: {{parts.[0].text}}
    {{/each}}

**AVAILABLE APP FEATURES (Your "Tools"):**
You can understand requests related to these features:
- diagnose_disease: User wants to diagnose a crop disease. Requires an image.
- get_mandi_price: User is asking for market prices of crops.
- get_weather_forecast: User wants the weather forecast.
- explain_scheme: User wants to know about a government scheme.
- get_irrigation_advice: User needs advice on watering their crops.
- apply_loan: User is asking about or wants to apply for a loan.
- get_help: User is asking for help or support.
- general_advice: User is asking a general farming question.
- clarification_needed: If the query is ambiguous and you need more information.

**YOUR TASK:**
1.  **Analyze the Query:** Based on all the context, determine the farmer's primary 'intent'.
2.  **Extract Parameters:** Identify key entities in the query (e.g., crop name, location).
3.  **Determine Action:** Decide the 'actionCode'.
    - If you can answer directly, use 'SPEAK_ONLY'.
    - If the user asks to go to a feature, use 'SPEAK_AND_NAVIGATE' and provide the 'navigationTarget'.
    - If you need a photo for diagnosis, use 'REQUEST_IMAGE'.
    - If you need more information, use 'CLARIFY' and formulate a 'followUpQuestionLocalized'.
4.  **Formulate Response:** Craft a helpful 'kisanMitraResponse'. It must be simple, empathetic, and directly answer the farmer's question. First write it in English, then translate it to the farmer's preferred language.
5.  **Provide Structured JSON Output:** Your entire response must be a single, valid JSON object matching the output schema. Do not add any text before or after it.

**Example Scenario:**
- Query: "టమోటా ధర ఎంత ఉంది?" (What is the price of tomato?)
- Language: Telugu
- Expected Intent: "get_mandi_price"
- Expected Parameters: {"crop_type": "tomato"}
- Expected Action: "SPEAK_AND_NAVIGATE"
- Expected Navigation Target: "/dashboard/mandi-prices"
- Expected Response (Localized): "మీరు టమోటా ధరను తనిఖీ చేయాలనుకుంటున్నారా? నేను మిమ్మల్ని మండీ ధరల పేజీకి తీసుకెళ్తున్నాను."

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
  async input => {
    // For now, we are directly calling the prompt.
    // In the future, this is where we would add logic to:
    // 1. Fetch real-time data from Firestore (e.g., actual mandi prices) based on the parsed intent.
    // 2. Pass that data back to a second, more focused prompt to synthesize the final answer.
    const {output} = await agrigptPrompt(input);

    if (!output) {
      throw new Error('AgriGPT AI did not return a valid response.');
    }
    
    return output;
  }
);
