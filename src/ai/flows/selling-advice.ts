
'use server';

/**
 * @fileOverview An AI agent for providing crop selling advice.
 *
 * - getSellingAdvice - A function that provides advice on the best time and place to sell crops.
 * - SellingAdviceInput - The input type for the getSellingAdvice function.
 * - SellingAdviceOutput - The return type for the getSellingAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SellingAdviceInputSchema = z.object({
  cropType: z.string().describe('The type of crop to be sold.'),
  quantity: z.string().describe('The quantity of the crop to be sold (e.g., "10 quintals").'),
  location: z.string().describe('The current location of the farmer.'),
  desiredSellTime: z.string().describe('The desired timeframe for selling the crop (e.g., "immediately", "within a week").'),
  language: z.string().describe('The language for the advice (e.g., "English", "Hindi", "Telugu").'),
});
export type SellingAdviceInput = z.infer<typeof SellingAdviceInputSchema>;

const SellingAdviceOutputSchema = z.object({
  advice: z.string().describe('A comprehensive paragraph of selling advice. Include the best market, alternative markets, and general tips. This entire field must be in the requested language.'),
});
export type SellingAdviceOutput = z.infer<typeof SellingAdviceOutputSchema>;

export async function getSellingAdvice(input: SellingAdviceInput): Promise<SellingAdviceOutput> {
  return sellingAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'sellingAdvicePrompt',
  input: {schema: SellingAdviceInputSchema},
  output: {schema: SellingAdviceOutputSchema},
  prompt: `You are an agricultural market expert. Based on the provided crop type, quantity, farmer's location, and desired selling time, provide detailed advice in a single comprehensive paragraph.

Your response MUST be in the language specified: **{{{language}}}**.
Your entire response must conform to the JSON output schema, with all advice contained in the single 'advice' field.

Consider factors like current market trends, demand in nearby cities/mandis, off-season advantages, storage options, and transportation costs. Provide clear and actionable advice for the farmer.

**Farmer's Details:**
*   Crop Type: {{{cropType}}}
*   Quantity: {{{quantity}}}
*   Location: {{{location}}}
*   Desired Sell Time: {{{desiredSellTime}}}

Provide your structured JSON response now.
`,
});

const sellingAdviceFlow = ai.defineFlow(
  {
    name: 'sellingAdviceFlow',
    inputSchema: SellingAdviceInputSchema,
    outputSchema: SellingAdviceOutputSchema,
  },
  async (input) => {
    try {
        const {output} = await prompt(input);
        if (!output) {
          throw new Error("The AI model did not return a valid selling advice.");
        }
        return output;
    } catch(e: any) {
        if (e.message?.includes('429 Too Many Requests') || e.message?.includes('503 Service Unavailable')) {
            console.warn("AI Selling Advice service is overloaded, returning fallback advice.");
            const fallbackAdvice: Record<string, string> = {
                en: "Our AI analysis service is currently experiencing high demand. Please try again in a few moments. In general, for your crop '{cropType}', consider selling in the nearest large mandi to your location '{location}' to save on transportation costs. Selling '{desiredSellTime}' is often a good strategy to meet immediate market demand. Always check local prices before finalizing a sale.",
                hi: "हमारी एआई विश्लेषण सेवा में इस समय बहुत अधिक मांग है। कृपया कुछ क्षणों में पुनः प्रयास करें। सामान्य तौर पर, अपनी फसल '{cropType}' के लिए, परिवहन लागत बचाने के लिए अपने स्थान '{location}' के निकटतम बड़े मंडी में बेचने पर विचार करें। तत्काल बाजार की मांग को पूरा करने के लिए '{desiredSellTime}' बेचना अक्सर एक अच्छी रणनीति होती है। बिक्री को अंतिम रूप देने से पहले हमेशा स्थानीय कीमतों की जांच करें।",
                te: "మా AI విశ్లేషణ సేవ ప్రస్తుతం అధిక డిమాండ్‌ను ఎదుర్కొంటోంది. దయచేసి కొన్ని క్షణాల్లో మళ్లీ ప్రయత్నించండి. సాధారణంగా, మీ పంట '{cropType}' కోసం, రవాణా ఖర్చులను ఆదా చేయడానికి మీ ప్రదేశం '{location}'కి సమీపంలోని పెద్ద మండీలో విక్రయించడాన్ని పరిగణించండి. తక్షణ మార్కెట్ డిమాండ్‌ను తీర్చడానికి '{desiredSellTime}' విక్రయించడం తరచుగా మంచి వ్యూహం. అమ్మకాన్ని ఖరారు చేసే ముందు ఎల్లప్పుడూ స్థానిక ధరలను తనిఖీ చేయండి.",
                kn: "ನಮ್ಮ AI ವಿಶ್ಲೇಷಣೆ ಸೇವೆಯು ಪ್ರಸ್ತುತ ಹೆಚ್ಚಿನ ಬೇಡಿಕೆಯನ್ನು ಅನುಭವಿಸುತ್ತಿದೆ. ದಯವಿಟ್ಟು ಕೆಲವು ಕ್ಷಣಗಳಲ್ಲಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ. ಸಾಮಾನ್ಯವಾಗಿ, ನಿಮ್ಮ ಬೆಳೆ '{cropType}' ಗಾಗಿ, ಸಾರಿಗೆ ವೆಚ್ಚವನ್ನು ಉಳಿಸಲು ನಿಮ್ಮ ಸ್ಥಳ '{location}' ಕ್ಕೆ ಹತ್ತಿರದ ದೊಡ್ಡ ಮಂಡಿಯಲ್ಲಿ ಮಾರಾಟ ಮಾಡುವುದನ್ನು ಪರಿಗಣಿಸಿ. ತಕ್ಷಣದ ಮಾರುಕಟ್ಟೆ ಬೇಡಿಕೆಯನ್ನು ಪೂರೈಸಲು '{desiredSellTime}' ಮಾರಾಟ ಮಾಡುವುದು ಹೆಚ್ಚಾಗಿ ಉತ್ತಮ ತಂತ್ರವಾಗಿದೆ. ಮಾರಾಟವನ್ನು ಅಂತಿಮಗೊಳಿಸುವ ಮೊದಲು ಯಾವಾಗಲೂ ಸ್ಥಳೀಯ ಬೆಲೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",
                ml: "ഞങ്ങളുടെ AI വിശകലന സേവനം നിലവിൽ ഉയർന്ന ഡിമാൻഡ് നേരിടുന്നു. ദയവായി കുറച്ച് നിമിഷങ്ങൾക്കുള്ളിൽ വീണ്ടും ശ്രമിക്കുക. പൊതുവേ, നിങ്ങളുടെ വിള '{cropType}' ക്കായി, ഗതാഗത ചെലവ് ലാഭിക്കാൻ നിങ്ങളുടെ സ്ഥലം '{location}' അടുത്തുള്ള വലിയ മണ്ഡിയിൽ വിൽക്കുന്നത് പരിഗണിക്കുക. ഉടനടി വിപണി ആവശ്യം നിറവേറ്റുന്നതിന് '{desiredSellTime}' വിൽക്കുന്നത് പലപ്പോഴും ഒരു നല്ല തന്ത്രമാണ്. വിൽപ്പന അന്തിമമാക്കുന്നതിന് മുമ്പ് എല്ലായ്പ്പോഴും പ്രാദേശിക വിലകൾ പരിശോധിക്കുക.",
                ta: "எங்கள் AI பகுப்பாய்வு சேவை தற்போது அதிக தேவையைக் கொண்டுள்ளது. தயவுசெய்து சில நிமிடங்களில் மீண்டும் முயற்சிக்கவும். பொதுவாக, உங்கள் பயிர் '{cropType}' க்கு, போக்குவரத்து செலவுகளைச் சேமிக்க உங்கள் இருப்பிடம் '{location}' க்கு அருகிலுள்ள பெரிய மண்டியில் விற்பனை செய்வதைக் கருத்தில் கொள்ளுங்கள். உடனடி சந்தைத் தேவையைப் பூர்த்தி செய்ய '{desiredSellTime}' விற்பனை செய்வது பெரும்பாலும் ஒரு நல்ல உத்தியாகும். விற்பனையை இறுதி செய்வதற்கு முன்பு எப்போதும் உள்ளூர் விலைகளைச் சரிபார்க்கவும்.",
            };

            const lang = (input.language || 'en') as keyof typeof fallbackAdvice;
            const adviceText = (fallbackAdvice[lang] || fallbackAdvice['en'])
                .replace('{cropType}', input.cropType)
                .replace('{location}', input.location)
                .replace('{desiredSellTime}', input.desiredSellTime);

            return { advice: adviceText };
        }
        // For other errors, re-throw
        throw e;
    }
  }
);
