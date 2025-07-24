
import { z } from 'zod';

const HistoryPartSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.array(z.object({ text: z.string() })),
});

export type HistoryPart = z.infer<typeof HistoryPartSchema>;

export const AgriGptInputSchema = z.object({
  message: z.string().describe("The user's latest message."),
  history: z.array(HistoryPartSchema).describe('The history of the conversation.'),
  language: z.string().describe('The language for the response (e.g., "English", "Hindi").'),
});
export type AgriGptInput = z.infer<typeof AgriGptInputSchema>;

export const AgriGptOutputSchema = z.object({
  reply: z.string().describe("The AI's response to the user's message."),
});
export type AgriGptOutput = z.infer<typeof AgriGptOutputSchema>;
