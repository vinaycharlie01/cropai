
'use server';

/**
 * @fileOverview An AI agent for assessing loan eligibility for farmers.
 *
 * - assessLoanEligibility - A function that provides a loan recommendation.
 * - LoanEligibilityInput - The input type for the assessLoanEligibility function.
 * - LoanEligibilityOutput - The return type for the assessLoanEligibility function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LoanEligibilityInputSchema = z.object({
  userId: z.string().describe('The unique identifier for the farmer.'),
  purpose: z.string().describe('The stated purpose for the loan (e.g., "Seeds", "Fertilizers").'),
  amount: z.number().describe('The amount of money the farmer is requesting.'),
  language: z.string().describe('The language for the response (e.g., "English", "Hindi").'),
});
export type LoanEligibilityInput = z.infer<typeof LoanEligibilityInputSchema>;

const LoanEligibilityOutputSchema = z.object({
  status: z.enum(['approved', 'rejected', 'pending_review']).describe('The final status of the loan assessment.'),
  approvedAmount: z.number().describe('The amount of the loan that has been approved. This can be less than the requested amount.'),
  recommendation: z.string().describe('A concise, encouraging message to the farmer about their loan eligibility. This field MUST be in the requested language.'),
  reasoning: z.string().describe('A simple, empathetic explanation for why this amount was recommended. This field MUST be in the requested language.'),
});
export type LoanEligibilityOutput = z.infer<typeof LoanEligibilityOutputSchema>;


export async function assessLoanEligibility(input: LoanEligibilityInput): Promise<LoanEligibilityOutput> {
  return loanEligibilityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'loanEligibilityPrompt',
  input: {schema: LoanEligibilityInputSchema},
  output: {schema: LoanEligibilityOutputSchema},
  prompt: `You are Kisan AI, an empathetic AI assistant for small-scale Indian farmers. Your role is to assess micro-loan requests and provide clear, simple, and encouraging results.

**FARMER'S REQUEST:**
*   Purpose: {{{purpose}}}
*   Amount Requested: ₹{{{amount}}}
*   Language for response: {{{language}}}

**AI ASSESSMENT (Simulated):**
*   This is a simulation. For this request, you will act as if a backend credit model has run.
*   Rule 1: If the requested amount is over ₹50,000, mark it for 'pending_review' as it requires manual verification. Set approvedAmount to 0.
*   Rule 2: If the requested amount is under ₹10,000, 'approve' it for the full amount.
*   Rule 3: If the amount is between ₹10,000 and ₹50,000, 'approve' it, but for 80% of the requested amount.
*   Calculate the approved amount based on these rules.

**YOUR TASK:**
1.  Determine the 'status' and 'approvedAmount' based on the rules above.
2.  Write a 'recommendation' message. It should be positive and encouraging, even if the amount is reduced or pending.
3.  Write a 'reasoning' message. Explain *why* the decision was made in very simple terms. For approvals, mention it's based on their good farming history (simulated). For pending, explain it's a standard check for larger amounts.
4.  Your entire response (recommendation and reasoning) MUST be in the requested language: **{{{language}}}**.
5.  Provide the output in the specified JSON format.

Provide your structured JSON response now.
`,
});

const loanEligibilityFlow = ai.defineFlow(
  {
    name: 'loanEligibilityFlow',
    inputSchema: LoanEligibilityInputSchema,
    outputSchema: LoanEligibilityOutputSchema,
  },
  async input => {
    // In a real application, this is where you would:
    // 1. Fetch farmer data from Firestore based on input.userId.
    // 2. Call a deployed Vertex AI model with the aggregated data.
    // 3. Pass the real AI score and farmer data into the prompt.
    const {output} = await prompt(input); // For now, we pass the input directly to the simulation prompt.
    if (!output) {
        throw new Error("The AI model did not return a valid loan assessment.");
    }
    return output;
  }
);
