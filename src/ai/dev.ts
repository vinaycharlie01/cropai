import { config } from 'dotenv';
config();

import '@/ai/flows/smart-treatment-suggestions.ts';
import '@/ai/flows/diagnose-crop-disease.ts';
import '@/ai/flows/weather-forecast.ts';
import '@/ai/flows/selling-advice.ts';

