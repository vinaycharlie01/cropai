
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
import { predictMandiPrice } from "@/ai/flows/predict-mandi-price";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { getTtsLanguageCode } from "@/lib/translations";
import { getMandiPrices, MandiPriceRecord } from "@/ai/flows/get-mandi-prices";
import { Skeleton } from "@/components/ui/skeleton";

const states = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];
const commodities = ["Potato", "Onion", "Tomato", "Wheat", "Paddy", "Cotton", "Maize"];


type PredictionFormInputs = {
  crop: string;
  location: string;
}

type SttField = 'location';

export default function MandiPricesPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { control, register, handleSubmit, setValue, formState: { errors } } = useForm<PredictionFormInputs>({
    defaultValues: {
        location: "Maharashtra",
        crop: "Onion"
    }
  });

  const [livePrices, setLivePrices] = useState<MandiPriceRecord[] | null>(null);
  const [isLivePricesLoading, setIsLivePricesLoading] = useState(true);
  const [prediction, setPrediction] = useState<any | null>(null);
  const [isPredictionLoading, setIsPredictionLoading] = useState(false);
  const [activeSttField, setActiveSttField] = useState<SttField | null>(null);

  const fetchLivePrices = useCallback(async (state: string, commodity: string) => {
    setIsLivePricesLoading(true);
    setLivePrices(null);
    try {
        const results = await getMandiPrices({ state, commodity });
        setLivePrices(results);
    } catch (error) {
        console.error("Failed to fetch live prices", error);
        toast({
            variant: 'destructive',
            title: t('error'),
            description: "Could not fetch live market prices."
        })
    } finally {
        setIsLivePricesLoading(false);
    }
  }, [t, toast]);
  
  // Fetch default prices on initial load
  useEffect(() => {
    fetchLivePrices("Maharashtra", "Onion");
  }, [fetchLivePrices]);


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

  const TrendArrow = ({ trend }: { trend: number }) => {
    if (trend > 0) return <TrendingUp className="text-green-500" />
    if (trend < 0) return <TrendingDown className="text-red-500" />
    return <Minus className="text-gray-500" />
  }
  
  const onPredictionSubmit: SubmitHandler<PredictionFormInputs> = async (data) => {
    setIsPredictionLoading(true);
    setPrediction(null);
    
    // This part will call the Genkit flow
    try {
        const result = await predictMandiPrice({
            cropType: data.crop,
            location: data.location,
            language: language,
        });
        setPrediction(result);
    } catch (error) {
         console.error("Failed to fetch prediction", error);
         toast({
            variant: 'destructive',
            title: t('error'),
            description: "Could not fetch AI price prediction."
         })
    } finally {
        setIsPredictionLoading(false);
    }
  }
  
  const handleFilterChange = (data: PredictionFormInputs) => {
    fetchLivePrices(data.location, data.crop);
  };

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
            <div className="flex gap-4 mb-4 items-end">
                 <div className="flex-1">
                    <Label htmlFor="crop-select-live">{t('crop')}</Label>
                    <Controller
                        name="crop"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={(value) => { field.onChange(value); handleFilterChange({ ...control._formValues, crop: value }) }} defaultValue={field.value}>
                            <SelectTrigger id="crop-select-live">
                              <SelectValue placeholder="Select a crop" />
                            </SelectTrigger>
                            <SelectContent>
                              {commodities.map(item => (
                                <SelectItem key={item} value={item}>{item}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                  </div>
                   <div className="flex-1">
                    <Label htmlFor="location-select-live">{t('region')}</Label>
                    <Controller
                        name="location"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={(value) => { field.onChange(value); handleFilterChange({ ...control._formValues, location: value }) }} defaultValue={field.value}>
                                <SelectTrigger id="location-select-live">
                                <SelectValue placeholder="Select a state" />
                                </SelectTrigger>
                                <SelectContent>
                                {states.map(item => (
                                    <SelectItem key={item} value={item}>{item}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        )}
                        />
                   </div>
            </div>
            <div className="min-h-[300px]">
              {isLivePricesLoading ? (
                <div className="space-y-2 pt-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="w-full h-12" />)}
                </div>
              ) : livePrices && livePrices.length > 0 ? (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="font-semibold">{t('region')}</TableHead>
                        <TableHead className="font-semibold">{t('price')}</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {livePrices.slice(0, 10).map((item, index) => (
                        <TableRow key={index} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{item.market}</TableCell>
                        <TableCell className="flex items-center gap-2">
                            ₹{item.modal_price.toLocaleString('en-IN')}
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                    No prices found for the selected crop and state.
                </div>
              )}
            </div>
        </CardContent>
      </Card>

      <Card className="bg-background">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">AI Price Prediction</CardTitle>
          <CardDescription>Get a 4-week price forecast for a crop.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onPredictionSubmit)}>
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
                              {commodities.map(item => (
                                <SelectItem key={item} value={item}>{item}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.crop && <p className="text-destructive text-sm mt-1">{errors.crop.message}</p>}
                  </div>
                   <div>
                    <Label htmlFor="location">{t('region')}</Label>
                    <Controller
                        name="location"
                        control={control}
                        rules={{ required: t('locationRequired') }}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger id="location">
                                <SelectValue placeholder="Select a state" />
                                </SelectTrigger>
                                <SelectContent>
                                {states.map(item => (
                                    <SelectItem key={item} value={item}>{item}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        )}
                        />
                    {errors.location && <p className="text-destructive text-sm mt-1">{errors.location.message}</p>}
                </div>
              </div>
              <Button type="submit" disabled={isPredictionLoading} className="w-full !mt-6">
                {isPredictionLoading ? <Loader2 className="mr-2 animate-spin" /> : <TrendingUp className="mr-2" />}
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
