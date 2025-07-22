
'use client';

import { useState, useCallback, useEffect } from "react";
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from "framer-motion";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { TrendingUp, TrendingDown, Minus, Loader2, Bot, Mic } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useLanguage } from "@/contexts/LanguageContext"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { predictMandiPrice, PredictMandiPriceOutput } from "@/ai/flows/predict-mandi-price";
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { getTtsLanguageCode, TranslationKeys } from '@/lib/translations';

type PredictionFormInputs = {
  cropType: string;
  location: string;
}

type SttField = 'cropType' | 'location';

const mockMandiPrices: { cropKey: TranslationKeys, price: number, regionKey: TranslationKeys, trend: 'up' | 'down' | 'neutral' }[] = [
  { cropKey: 'tomato', price: 2500, regionKey: 'maharashtra', trend: 'up' },
  { cropKey: 'onion', price: 1800, regionKey: 'karnataka', trend: 'down' },
  { cropKey: 'potato', price: 1500, regionKey: 'uttarPradesh', trend: 'neutral' },
  { cropKey: 'wheat', price: 2200, regionKey: 'punjab', trend: 'up' },
  { cropKey: 'riceBasmati', price: 9500, regionKey: 'haryana', trend: 'down' },
  { cropKey: 'cotton', price: 7500, regionKey: 'gujarat', trend: 'neutral' },
];

export default function MandiPricesPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<PredictionFormInputs>();

  const [prediction, setPrediction] = useState<PredictMandiPriceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSttField, setActiveSttField] = useState<SttField | null>(null);

  const onRecognitionResult = useCallback((result: string) => {
    if (activeSttField) {
      setValue(activeSttField, result, { shouldValidate: true });
    }
  }, [activeSttField, setValue]);

  const onRecognitionError = useCallback((err: string) => {
    console.error(err);
    toast({ variant: 'destructive', title: t('error'), description: 'Speech recognition failed.' });
  }, [t, toast]);

  const { isListening, startListening, stopListening, isSupported } = useSpeechRecognition({
    onResult: onRecognitionResult,
    onError: onRecognitionError,
    onEnd: () => setActiveSttField(null),
  });

  const handleSttToggle = (field: SttField) => {
    if (isListening) {
      stopListening();
    } else {
      setActiveSttField(field);
      startListening(getTtsLanguageCode(language));
    }
  };

  const onPredictionSubmit: SubmitHandler<PredictionFormInputs> = async (data) => {
    setIsLoading(true);
    setPrediction(null);
    try {
      const result = await predictMandiPrice({
        cropType: data.cropType,
        location: data.location,
        language,
      });
      setPrediction(result);
    } catch (error) {
      console.error("Failed to fetch prediction", error);
      toast({
        variant: 'destructive',
        title: t('error'),
        description: "Could not fetch AI price prediction."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'down': return <TrendingDown className="h-5 w-5 text-red-500" />;
      case 'neutral': return <Minus className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const chartConfig = {
    price: {
      label: t('price'),
      color: "hsl(var(--primary))",
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">{t('mandiPriceAdvisor')}</CardTitle>
          <CardDescription>{t('mandiPriceInfo')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 px-4 py-2 font-semibold text-muted-foreground">
              <div className="col-span-1">{t('crop')}</div>
              <div className="col-span-1">{t('price')}</div>
              <div className="col-span-1">{t('region')}</div>
            </div>
            <div className="space-y-2">
              {mockMandiPrices.map((item, index) => (
                <div key={index} className="grid grid-cols-3 gap-4 items-center p-4 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="col-span-1 font-medium">{t(item.cropKey)}</div>
                  <div className="col-span-1 flex items-center gap-2 font-semibold">
                    {getTrendIcon(item.trend)}
                    ₹{item.price.toLocaleString('en-IN')}
                  </div>
                  <div className="col-span-1 text-muted-foreground">{t(item.regionKey)}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl">AI Price Prediction</CardTitle>
          <CardDescription>Get a 4-week price forecast for a crop.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onPredictionSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cropType">{t('cropType')}</Label>
                <div className="relative">
                  <Input id="cropType" placeholder={t('egTomato')} {...register('cropType', { required: t('cropTypeRequired') })} />
                  <Button
                    type="button" size="icon" variant="ghost"
                    onClick={() => handleSttToggle('cropType')}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    disabled={!isSupported}
                  >
                    <Mic className={`h-5 w-5 ${isListening && activeSttField === 'cropType' ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                  </Button>
                </div>
                {errors.cropType && <p className="text-destructive text-sm">{errors.cropType.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">{t('location')}</Label>
                <div className="relative">
                  <Input id="location" placeholder={t('egAndhraPradesh')} {...register('location', { required: t('locationRequired') })} />
                   <Button
                    type="button" size="icon" variant="ghost"
                    onClick={() => handleSttToggle('location')}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    disabled={!isSupported}
                  >
                    <Mic className={`h-5 w-5 ${isListening && activeSttField === 'location' ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                  </Button>
                </div>
                {errors.location && <p className="text-destructive text-sm">{errors.location.message}</p>}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Bot className="mr-2" />}
              {isLoading ? 'Predicting...' : 'Get Prediction'}
            </Button>
          </CardContent>
        </form>
        <AnimatePresence>
          {prediction && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <CardContent>
                <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                  <BarChart accessibilityLayer data={prediction.predictions} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="week"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(value) => t(value.replace(' ', '').toLowerCase() as TranslationKeys) || value}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `₹${value / 1000}k`}
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Bar dataKey="price" fill="var(--color-price)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col items-start gap-2 text-sm border-t pt-4">
                <div className="flex items-center gap-2 font-medium leading-none">
                  <Bot className="h-4 w-4" /> Analyst's Summary
                </div>
                <div className="mt-1 leading-relaxed text-muted-foreground">
                  {prediction.analysis}
                </div>
              </CardFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
