
'use server';

/**
 * @fileOverview An AI agent for providing user support via chat.
 *
 * - chatWithSupport - A function that handles a single turn in a chat conversation.
 * - SupportChatInput - The input type for the chatWithSupport function.
 * - SupportChatOutput - The return type for the chatWithSupport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HistoryPartSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(z.object({ text: z.string() })),
});

const SupportChatInputSchema = z.object({
  message: z.string().describe('The user\'s latest message.'),
  history: z.array(HistoryPartSchema).describe('The history of the conversation.'),
  language: z.string().describe('The language for the response.'),
});
export type SupportChatInput = z.infer<typeof SupportChatInputSchema>;

const SupportChatOutputSchema = z.object({
  reply: z.string().describe('The AI\'s response to the user\'s message.'),
});
export type SupportChatOutput = z.infer<typeof SupportChatOutputSchema>;

export async function chatWithSupport(input: SupportChatInput): Promise<SupportChatOutput> {
  return supportChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'supportChatPrompt',
  input: {schema: SupportChatInputSchema},
  output: {schema: SupportChatOutputSchema},
  prompt: `You are Kisan AI, a friendly and helpful support assistant for the Kisan Rakshak mobile app. Your goal is to assist farmers with their questions about the app and general farming topics.

You can answer questions about:
- How to use the app's features (Disease Diagnosis, Mandi Prices, etc.).
- Common issues and troubleshooting.
- General agricultural advice.

**IMPORTANT INSTRUCTIONS:**
1. Keep your responses concise, friendly, and easy to understand for a farmer.
2. If you don't know the answer, admit it and suggest they contact a human expert through the "Submit an Issue" or "Call Hotline" features in the app's Help section.
3. Your entire response MUST be in the language specified: **{{{language}}}**.
4. Use the provided chat history to understand the context of the conversation.

Here is the current conversation history:
{{#each history}}
**{{role}}**: {{{parts.[0].text}}}
{{/each}}

Here is the user's latest message:
{{{message}}}

Provide a helpful response now.
`,
});

const supportChatFlow = ai.defineFlow(
  {
    name: 'supportChatFlow',
    inputSchema: SupportChatInputSchema,
    outputSchema: SupportChatOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      return { reply: "I'm sorry, I had trouble generating a response. Please try again." };
    }
    return output;
  }
);
