import { config } from 'dotenv';
config();

import '@/ai/flows/diagnose-crop-disease.ts';
import '@/ai/flows/weather-forecast.ts';
import '@/ai/flows/selling-advice.ts';
import '@/ai/flows/text-to-speech.ts';
