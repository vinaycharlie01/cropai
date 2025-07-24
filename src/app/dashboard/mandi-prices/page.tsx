
'use client';

import { useState, useCallback, useEffect } from "react";
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from "framer-motion";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Loader2, Bot, Mic, AlertCircle, Search, LineChart } from 'lucide-react';

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
import { getMandiPriceTool } from "@/ai/flows/get-mandi-prices";
import { MandiPriceRecord } from "@/types/mandi-prices";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

type LivePriceFormInputs = {
  state: string;
  commodity: string;
}

type PredictionFormInputs = {
  cropType: string;
  location: string;
}

type SttField = 'liveCommodity' | 'predictCropType' | 'predictLocation';

export default function MandiPricesPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  
  const livePriceForm = useForm<LivePriceFormInputs>();
  const predictionForm = useForm<PredictionFormInputs>();

  const [prediction, setPrediction] = useState<PredictMandiPriceOutput | null>(null);
  const [isPredictionLoading, setIsPredictionLoading] = useState(false);
  
  const [livePrices, setLivePrices] = useState<MandiPriceRecord[] | null>(null);
  const [isLivePriceLoading, setIsLivePriceLoading] = useState(false);
  const [livePriceError, setLivePriceError] = useState<string | null>(null);
  
  const [activeSttField, setActiveSttField] = useState<SttField | null>(null);

  const onRecognitionResult = useCallback((result: string) => {
    if (activeSttField) {
      if (activeSttField === 'liveCommodity') livePriceForm.setValue('commodity', result);
      if (activeSttField === 'predictCropType') predictionForm.setValue('cropType', result);
      if (activeSttField === 'predictLocation') predictionForm.setValue('location', result);
    }
  }, [activeSttField, livePriceForm, predictionForm]);

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

  const onLivePriceSubmit: SubmitHandler<LivePriceFormInputs> = async (data) => {
      setIsLivePriceLoading(true);
      setLivePriceError(null);
      setLivePrices(null);
      try {
        const prices = await getMandiPriceTool({ state: data.state, commodity: data.commodity });
        if (prices.length === 0) {
            setLivePriceError(`No data found for ${data.commodity} in ${data.state}. Please try a different crop or state.`);
        }
        setLivePrices(prices);
      } catch (error) {
          console.error("Failed to fetch live prices", error);
          setLivePriceError("Could not load live market prices. The data.gov.in service may be temporarily unavailable or the commodity may not be available in the selected state.");
      } finally {
          setIsLivePriceLoading(false);
      }
  };

  const onPredictionSubmit: SubmitHandler<PredictionFormInputs> = async (data) => {
    setIsPredictionLoading(true);
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
      setIsPredictionLoading(false);
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
          <CardTitle className="font-headline text-2xl flex items-center gap-2"><LineChart /> {t('mandiPriceAdvisor')}</CardTitle>
          <CardDescription>{t('mandiPriceInfo')}</CardDescription>
        </CardHeader>
        <form onSubmit={livePriceForm.handleSubmit(onLivePriceSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label htmlFor="state">{t('yourState')}</Label>
                  <Controller
                      name="state"
                      control={livePriceForm.control}
                      rules={{ required: "State is required." }}
                      render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger id="state"><SelectValue placeholder="Select a state" /></SelectTrigger>
                              <SelectContent>
                                  {indianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                          </Select>
                      )}
                  />
                  {livePriceForm.formState.errors.state && <p className="text-destructive text-sm">{livePriceForm.formState.errors.state.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="commodity">{t('crop')}</Label>
                 <div className="relative">
                    <Input id="commodity" placeholder={t('egTomato')} {...livePriceForm.register('commodity', { required: "Commodity is required." })} />
                    <Button
                      type="button" size="icon" variant="ghost"
                      onClick={() => handleSttToggle('liveCommodity')}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      disabled={!isSupported}
                    >
                      <Mic className={`h-5 w-5 ${isListening && activeSttField === 'liveCommodity' ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                    </Button>
                </div>
                {livePriceForm.formState.errors.commodity && <p className="text-destructive text-sm">{livePriceForm.formState.errors.commodity.message}</p>}
              </div>
            </div>
             <Button type="submit" className="w-full" disabled={isLivePriceLoading}>
              {isLivePriceLoading ? <Loader2 className="mr-2 animate-spin" /> : <Search className="mr-2" />}
              {isLivePriceLoading ? 'Searching...' : 'Search Live Prices'}
            </Button>
          </CardContent>
        </form>
         <CardContent>
            {isLivePriceLoading && [...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full mt-2" />)}
            {livePriceError && !isLivePriceLoading && (
                <div className="text-center py-8 text-destructive">
                  <AlertCircle className="mx-auto h-10 w-10 mb-2" />
                  <p className="font-semibold">Failed to Load Prices</p>
                  <p className="text-sm max-w-md mx-auto">{livePriceError}</p>
                </div>
            )}
            {livePrices && livePrices.length > 0 && !isLivePriceLoading && (
              <div className="border rounded-md mt-4">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>{t('market')}</TableHead>
                              <TableHead>{t('variety')}</TableHead>
                              <TableHead className="text-right">{t('price')} (₹)</TableHead>
                              <TableHead className="text-right">{t('date')}</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {livePrices.map((item, index) => (
                              <TableRow key={index}>
                                  <TableCell className="font-medium">{item.market}</TableCell>
                                  <TableCell>{item.variety}</TableCell>
                                  <TableCell className="text-right font-semibold">{item.modal_price}</TableCell>
                                  <TableCell className="text-right">{item.arrival_date}</TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl">AI Price Prediction</CardTitle>
          <CardDescription>Get a 4-week price forecast for a crop.</CardDescription>
        </CardHeader>
        <form onSubmit={predictionForm.handleSubmit(onPredictionSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cropType">{t('cropType')}</Label>
                <div className="relative">
                  <Input id="cropType" placeholder={t('egTomato')} {...predictionForm.register('cropType', { required: t('cropTypeRequired') })} />
                  <Button
                    type="button" size="icon" variant="ghost"
                    onClick={() => handleSttToggle('predictCropType')}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    disabled={!isSupported}
                  >
                    <Mic className={`h-5 w-5 ${isListening && activeSttField === 'predictCropType' ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                  </Button>
                </div>
                {predictionForm.formState.errors.cropType && <p className="text-destructive text-sm">{predictionForm.formState.errors.cropType.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">{t('location')}</Label>
                <div className="relative">
                  <Input id="location" placeholder={t('egAndhraPradesh')} {...predictionForm.register('location', { required: t('locationRequired') })} />
                   <Button
                    type="button" size="icon" variant="ghost"
                    onClick={() => handleSttToggle('predictLocation')}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    disabled={!isSupported}
                  >
                    <Mic className={`h-5 w-5 ${isListening && activeSttField === 'predictLocation' ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                  </Button>
                </div>
                {predictionForm.formState.errors.location && <p className="text-destructive text-sm">{predictionForm.formState.errors.location.message}</p>}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isPredictionLoading}>
              {isPredictionLoading ? <Loader2 className="mr-2 animate-spin" /> : <Bot className="mr-2" />}
              {isPredictionLoading ? 'Predicting...' : 'Get Prediction'}
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

    