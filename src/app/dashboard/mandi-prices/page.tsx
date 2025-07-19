
'use client';

import { useState, useCallback } from "react";
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from "framer-motion";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { TrendingUp, Loader2, Bot, Mic } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useLanguage } from "@/contexts/LanguageContext"
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PredictMandiPriceOutput } from "@/ai/flows/predict-mandi-price";
import type { TranslationKeys } from "@/lib/translations";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { getTtsLanguageCode } from "@/lib/translations";

const prices: {
    key: string;
    cropKey: TranslationKeys;
    price: string;
    regionKey: TranslationKeys;
    trend: string;
}[] = [
  { key: "tomato", cropKey: "tomato", price: "₹2,500", regionKey: "maharashtra", trend: "up" },
  { key: "onion", cropKey: "onion", price: "₹1,800", regionKey: "karnataka", trend: "down" },
  { key: "potato", cropKey: "potato", price: "₹1,200", regionKey: "uttarPradesh", trend: "stable" },
  { key: "wheat", cropKey: "wheat", price: "₹2,100", regionKey: "punjab", trend: "up" },
  { key: "rice-basmati", cropKey: "riceBasmati", price: "₹3,500", regionKey: "haryana", trend: "stable" },
  { key: "cotton", cropKey: "cotton", price: "₹6,000", regionKey: "gujarat", trend: "down" },
]

type PredictionFormInputs = {
  crop: string;
  location: string;
}

type SttField = 'location';

export default function MandiPricesPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { control, register, handleSubmit, setValue, formState: { errors } } = useForm<PredictionFormInputs>();

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
        const ttsLang = getTtsLanguageCode(language);
        startListening(ttsLang);
    }
  };

  const TrendArrow = ({ trend }: { trend: string }) => {
    if (trend === 'up') return <span className="text-green-500">▲</span>
    if (trend === 'down') return <span className="text-red-500">▼</span>
    return <span className="text-gray-500">▬</span>
  }
  
  const onSubmit: SubmitHandler<PredictionFormInputs> = async (data) => {
    setIsLoading(true);
    setPrediction(null);
    
    // Simulate AI thinking time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const selectedCrop = prices.find(p => p.key === data.crop);
    if (!selectedCrop) {
        setIsLoading(false);
        return;
    }

    const currentPrice = parseInt(prices.find(p => p.key === data.crop)!.price.replace('₹', '').replace(',', ''));
    
    // --- MOCK DATA WORKAROUND for 429 Quota Error ---
    const mockPrediction: PredictMandiPriceOutput = {
      predictions: [
        { week: t('week1'), price: Math.round(currentPrice * 1.02) },
        { week: t('week2'), price: Math.round(currentPrice * 1.05) },
        { week: t('week3'), price: Math.round(currentPrice * 1.03) },
        { week: t('week4'), price: Math.round(currentPrice * 1.06) },
      ],
      analysis: t('mandiAnalysisMock')
          .replace('{cropType}', t(selectedCrop.cropKey))
          .replace('{location}', data.location)
    };
    
    setPrediction(mockPrediction);
    setIsLoading(false);
  }

  const chartConfig = {
    price: {
      label: t('price'),
      color: "hsl(var(--primary))",
    },
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <Card className="bg-background">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">{t('mandiPriceAdvisor')}</CardTitle>
          <CardDescription>{t('mandiPriceInfo')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">{t('crop')}</TableHead>
                <TableHead className="font-semibold">{t('price')}</TableHead>
                <TableHead className="font-semibold text-right">{t('region')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prices.map((item) => (
                <TableRow key={item.key} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{t(item.cropKey)}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    <TrendArrow trend={item.trend} />
                    {item.price}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{t(item.regionKey)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-background">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">AI Price Prediction</CardTitle>
          <CardDescription>Get a 4-week price forecast for a crop.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4 items-start">
                  <div>
                    <Label htmlFor="crop-select">{t('crop')}</Label>
                    <Controller
                        name="crop"
                        control={control}
                        rules={{ required: t('cropTypeRequired') }}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger id="crop-select">
                              <SelectValue placeholder="Select a crop to predict" />
                            </SelectTrigger>
                            <SelectContent>
                              {prices.map(item => (
                                <SelectItem key={item.key} value={item.key}>{t(item.cropKey)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.crop && <p className="text-destructive text-sm mt-1">{errors.crop.message}</p>}
                  </div>
                   <div>
                    <Label htmlFor="location">{t('location')}</Label>
                    <div className="relative">
                      <Input id="location" placeholder={t('egAndhraPradesh')} {...register('location', { required: t('locationRequired') })} />
                       <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleSttToggle('location')}
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                          disabled={!isSupported}
                      >
                          <Mic className={`h-5 w-5 ${isListening && activeSttField === 'location' ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                      </Button>
                    </div>
                    {errors.location && <p className="text-destructive text-sm mt-1">{errors.location.message}</p>}
                </div>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full !mt-6">
                {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <TrendingUp className="mr-2" />}
                Predict
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
                          <BarChart accessibilityLayer data={prediction.predictions}>
                          <CartesianGrid vertical={false} />
                          <XAxis
                              dataKey="week"
                              tickLine={false}
                              tickMargin={10}
                              axisLine={false}
                              tickFormatter={(value) => value}
                          />
                          <YAxis 
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `₹${value}`}
                          />
                          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                          <Bar dataKey="price" fill="var(--color-price)" radius={4} />
                          </BarChart>
                      </ChartContainer>
                  </CardContent>
                  <CardFooter className="flex-col items-start gap-2 text-sm">
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
  )
}
