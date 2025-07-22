
'use client';

import { useState, useCallback, useEffect } from "react";
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from "framer-motion";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { TrendingUp, Loader2, Bot, Mic, AlertCircle } from 'lucide-react';

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
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { getTtsLanguageCode } from "@/lib/translations";
import { getMandiPrices, MandiPrice } from "@/ai/flows/get-mandi-prices";
import { predictMandiPrice } from "@/ai/flows/predict-mandi-price";
import { Skeleton } from "@/components/ui/skeleton";


type PredictionFormInputs = {
  crop: string;
  location: string;
}

type SttField = 'location';

export default function MandiPricesPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { control, register, handleSubmit, setValue, formState: { errors } } = useForm<PredictionFormInputs>();

  const [prices, setPrices] = useState<MandiPrice[]>([]);
  const [isPriceLoading, setIsPriceLoading] = useState(true);
  const [prediction, setPrediction] = useState<any | null>(null);
  const [isPredictionLoading, setIsPredictionLoading] = useState(false);
  const [activeSttField, setActiveSttField] = useState<SttField | null>(null);

  useEffect(() => {
    async function fetchPrices() {
        setIsPriceLoading(true);
        try {
            const livePrices = await getMandiPrices();
            setPrices(livePrices);
        } catch (error) {
            console.error("Failed to fetch mandi prices", error);
            toast({
                variant: 'destructive',
                title: t('error'),
                description: "Could not load live mandi prices."
            });
        } finally {
            setIsPriceLoading(false);
        }
    }
    fetchPrices();
  }, [t, toast]);


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
    if (trend > 0) return <span className="text-green-500">▲</span>
    if (trend < 0) return <span className="text-red-500">▼</span>
    return <span className="text-gray-500">▬</span>
  }
  
  const onSubmit: SubmitHandler<PredictionFormInputs> = async (data) => {
    setIsPredictionLoading(true);
    setPrediction(null);
    
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
              {isPriceLoading ? (
                [...Array(6)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-28 ml-auto" /></TableCell>
                    </TableRow>
                ))
              ) : prices.length > 0 ? (
                 prices.map((item) => (
                    <TableRow key={item.commodity} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{item.commodity}</TableCell>
                        <TableCell className="flex items-center gap-2">
                            <TrendArrow trend={item.trend} />
                            ₹{item.price.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{item.region}</TableCell>
                    </TableRow>
                 ))
              ) : (
                <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                        <AlertCircle className="inline-block mr-2"/>Could not load live price data.
                    </TableCell>
                </TableRow>
              )}
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
                                <SelectItem key={item.commodity} value={item.commodity}>{item.commodity}</SelectItem>
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
