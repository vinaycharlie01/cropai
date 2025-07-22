
'use client';

import { useState, useCallback, useEffect, useMemo } from "react";
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


type FilterFormInputs = {
  crop: string;
  state: string;
  district: string;
  market: string;
}

export default function MandiPricesPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { control, handleSubmit, watch, setValue } = useForm<FilterFormInputs>({
    defaultValues: {
        state: "Maharashtra",
        crop: "Onion",
        district: "All",
        market: "All",
    }
  });

  const [allPricesForState, setAllPricesForState] = useState<MandiPriceRecord[]>([]);
  const [filteredPrices, setFilteredPrices] = useState<MandiPriceRecord[]>([]);
  const [isLivePricesLoading, setIsLivePricesLoading] = useState(true);
  const [prediction, setPrediction] = useState<any | null>(null);
  const [isPredictionLoading, setIsPredictionLoading] = useState(false);

  const selectedState = watch('state');
  const selectedCrop = watch('crop');
  const selectedDistrict = watch('district');
  const selectedMarket = watch('market');

  const districts = useMemo(() => {
    if (!allPricesForState) return [];
    const uniqueDistricts = [...new Set(allPricesForState.filter(p=>p.commodity.toLowerCase() === selectedCrop.toLowerCase()).map(p => p.district))];
    return ["All", ...uniqueDistricts];
  }, [allPricesForState, selectedCrop]);

  const markets = useMemo(() => {
    if (!allPricesForState) return [];
    let filtered = allPricesForState.filter(p=>p.commodity.toLowerCase() === selectedCrop.toLowerCase());
    if (selectedDistrict !== "All") {
      filtered = filtered.filter(p => p.district === selectedDistrict);
    }
    const uniqueMarkets = [...new Set(filtered.map(p => p.market))];
    return ["All", ...uniqueMarkets];
  }, [allPricesForState, selectedCrop, selectedDistrict]);
  
  
  const fetchLivePrices = useCallback(async (state: string, commodity: string) => {
    setIsLivePricesLoading(true);
    setAllPricesForState([]);
    setFilteredPrices([]);
    setValue('district', 'All');
    setValue('market', 'All');
    try {
        const results = await getMandiPrices({ state, commodity });
        setAllPricesForState(results);
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
  }, [t, toast, setValue]);
  
  // Filter prices whenever selections change
  useEffect(() => {
    let results = allPricesForState.filter(p=>p.commodity.toLowerCase() === selectedCrop.toLowerCase());
    if (selectedDistrict !== 'All') {
      results = results.filter(p => p.district === selectedDistrict);
    }
    if (selectedMarket !== 'All') {
      results = results.filter(p => p.market === selectedMarket);
    }
    setFilteredPrices(results);
  }, [selectedDistrict, selectedMarket, selectedCrop, allPricesForState]);


  // Fetch default prices on initial load and when state/crop changes
  useEffect(() => {
    fetchLivePrices(selectedState, selectedCrop);
  }, [selectedState, selectedCrop, fetchLivePrices]);
  
  const onPredictionSubmit = useCallback(async (state: string, crop: string) => {
    setIsPredictionLoading(true);
    setPrediction(null);
    
    try {
        const result = await predictMandiPrice({
            cropType: crop,
            location: state,
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
  }, [language, toast, t])

  useEffect(() => {
    onPredictionSubmit(selectedState, selectedCrop);
  }, [selectedState, selectedCrop, onPredictionSubmit]);
  

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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="space-y-2">
                        <Label htmlFor="crop-select-live">{t('crop')}</Label>
                        <Controller name="crop" control={control} render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger id="crop-select-live"><SelectValue /></SelectTrigger>
                                <SelectContent>{commodities.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                            </Select>
                        )} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="state-select-live">{t('region')}</Label>
                        <Controller name="state" control={control} render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger id="state-select-live"><SelectValue /></SelectTrigger>
                                <SelectContent>{states.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                            </Select>
                        )} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="district-select-live">District</Label>
                        <Controller name="district" control={control} render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value} disabled={districts.length <= 1}>
                                <SelectTrigger id="district-select-live"><SelectValue /></SelectTrigger>
                                <SelectContent>{districts.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                            </Select>
                        )} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="market-select-live">{t('market')}</Label>
                        <Controller name="market" control={control} render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value} disabled={markets.length <= 1}>
                                <SelectTrigger id="market-select-live"><SelectValue /></SelectTrigger>
                                <SelectContent>{markets.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                            </Select>
                        )} />
                    </div>
                </div>
                <div className="min-h-[300px]">
                {isLivePricesLoading ? (
                    <div className="space-y-2 pt-2">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="w-full h-12" />)}
                    </div>
                ) : filteredPrices && filteredPrices.length > 0 ? (
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
                        {filteredPrices.slice(0, 10).map((item, index) => (
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
                        No prices found for the selected filters.
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
