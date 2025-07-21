
import { config } from 'dotenv';
config({ path: require('path').resolve(__dirname, '../../../../workspace/.env') });

import '@/ai/flows/diagnose-crop-disease.ts';
import '@/ai/flows/weather-tool.ts';
import '@/ai/flows/selling-advice.ts';
import '@/ai/flows/irrigation-advice.ts';
import '@/ai/flows/predict-mandi-price.ts';
import '@/ai/flows/support-chat.ts';
import '@/ai/flows/crop-health-analytics.ts';
import '@/ai/flows/daily-crop-growth.ts';
import '@/ai/flows/insurance-advice.ts';
import '@/ai/flows/assess-loan-eligibility.ts';
import '@/ai/flows/get-risk-alerts.ts';
import '@/ai/flows/agrigpt-flow.ts';
