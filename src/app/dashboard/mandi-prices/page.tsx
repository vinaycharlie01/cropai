
'use client';

import { useState, useCallback, useEffect } from "react";
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from "framer-motion";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { TrendingUp, Loader2, Bot } from 'lucide-react';

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { predictMandiPrice } from "@/ai/flows/predict-mandi-price";
import { getMandiPrices, MandiPriceRecord } from "@/ai/flows/get-mandi-prices";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";

const states = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];
const commodities = ["Potato", "Onion", "Tomato", "Wheat", "Paddy", "Cotton", "Maize"];


type PredictionFormInputs = {
  crop: string;
  location: string;
}

export default function MandiPricesPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { control, handleSubmit, formState: { errors } } = useForm<PredictionFormInputs>({
    defaultValues: {
        location: "Maharashtra",
        crop: "Onion"
    }
  });

  const [livePrices, setLivePrices] = useState<MandiPriceRecord[] | null>(null);
  const [isLivePricesLoading, setIsLivePricesLoading] = useState(true);
  const [prediction, setPrediction] = useState<any | null>(null);
  const [isPredictionLoading, setIsPredictionLoading] = useState(false);
  
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
    onPredictionSubmit(data);
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
      className="grid gap-6 lg:grid-cols-3"
    >
      <div className="lg:col-span-2 space-y-6">
        <Card className="bg-background">
            <CardHeader>
            <CardTitle className="font-headline text-2xl">{t('mandiPriceAdvisor')}</CardTitle>
            <CardDescription>{t('mandiPriceInfo')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 space-y-2">
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
                    <div className="flex-1 space-y-2">
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
                            <TableHead className="font-semibold">{t('market')}</TableHead>
                            <TableHead className="font-semibold hidden sm:table-cell">{t('variety')}</TableHead>
                            <TableHead className="font-semibold hidden md:table-cell">{t('date')}</TableHead>
                            <TableHead className="font-semibold text-right">{t('price')}</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {livePrices.slice(0, 10).map((item, index) => (
                            <TableRow key={index} className="hover:bg-muted/50">
                                <TableCell className="font-medium">
                                    <p>{item.market}</p>
                                    <p className="text-xs text-muted-foreground">{item.district}</p>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">{item.variety}</TableCell>
                                <TableCell className="hidden md:table-cell">{item.arrival_date}</TableCell>
                                <TableCell className="text-right font-semibold">
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
      </div>

      <div className="lg:col-span-1">
        <Card className="bg-background sticky top-20">
            <CardHeader>
            <CardTitle className="font-headline text-xl">AI Price Prediction</CardTitle>
            <CardDescription>A 4-week forecast based on current prices.</CardDescription>
            </CardHeader>
            <CardContent>
            {isPredictionLoading ? (
                 <div className="flex justify-center items-center h-[200px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : prediction ? (
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                            <BarChart accessibilityLayer data={prediction.predictions} margin={{top: 5, right: 5, left: -20, bottom: 5}}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="week"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                tickFormatter={(value) => value.substring(0,3)}
                            />
                            <YAxis 
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `₹${value/1000}k`}
                            />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                            <Bar dataKey="price" fill="var(--color-price)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </motion.div>
                </AnimatePresence>
             ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                   <p>Select crop/state to see prediction.</p>
                </div>
             )}
            </CardContent>
             {prediction && (
                <CardFooter className="flex-col items-start gap-2 text-sm border-t pt-4">
                    <div className="flex items-center gap-2 font-medium leading-none">
                    <Bot className="h-4 w-4" /> Analyst's Summary
                    </div>
                    <div className="mt-1 leading-relaxed text-muted-foreground">
                    {prediction.analysis}
                    </div>
                </CardFooter>
            )}
        </Card>
      </div>

    </motion.div>
  )
}
