
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { Bot, Loader2, Search, LineChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { predictMandiPrice, MandiPricePredictionOutput } from '@/ai/flows/predict-mandi-price';
import { getLiveMandiPrice } from '@/ai/flows/get-live-mandi-prices';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MandiPriceRecord } from '@/types/mandi-prices';


type PredictionFormInputs = {
    cropType: string;
    location: string;
};

type LivePriceFormInputs = {
    state: string;
    district: string;
    commodity: string;
};

export default function MandiPricesPage() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    
    const predictionForm = useForm<PredictionFormInputs>();
    const [isPredictionLoading, setIsPredictionLoading] = useState(false);
    const [predictionResult, setPredictionResult] = useState<MandiPricePredictionOutput | null>(null);
    const [predictionError, setPredictionError] = useState<string | null>(null);

    const livePriceForm = useForm<LivePriceFormInputs>();
    const [isLivePriceLoading, setIsLivePriceLoading] = useState(false);
    const [livePrices, setLivePrices] = useState<MandiPriceRecord[] | null>(null);
    const [livePriceError, setLivePriceError] = useState<string | null>(null);

    const onPredictionSubmit: SubmitHandler<PredictionFormInputs> = async (data) => {
        setIsPredictionLoading(true);
        setPredictionResult(null);
        setPredictionError(null);
        try {
            const result = await predictMandiPrice({ ...data, language });
            setPredictionResult(result);
        } catch (error) {
            console.error("Failed to fetch prediction", error);
            const errorMessage = (error instanceof Error) ? error.message : "Could not fetch AI price prediction.";
            setPredictionError(errorMessage);
            toast({ variant: 'destructive', title: t('error'), description: errorMessage });
        } finally {
            setIsPredictionLoading(false);
        }
    };

    const onLivePriceSubmit: SubmitHandler<LivePriceFormInputs> = async (data) => {
        setIsLivePriceLoading(true);
        setLivePriceError(null);
        setLivePrices(null);
        try {
            const prices = await getLiveMandiPrice(data);
            setLivePrices(prices);
            if (prices.length === 0) {
                toast({
                    title: 'No Data Found',
                    description: `No data found for ${data.commodity} in ${data.district}. Please check your spelling or try different filters.`
                });
            }
        } catch (error) {
            console.error("Failed to fetch live prices", error);
            const errorMessage = (error instanceof Error) ? error.message : "Could not load live market prices.";
            setLivePriceError(errorMessage);
        } finally {
            setIsLivePriceLoading(false);
        }
    };


    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
            <div
                className="lg:col-span-2"
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl flex items-center gap-2">
                           <LineChart /> {t('mandiPriceAdvisor')}
                        </CardTitle>
                        <CardDescription>{t('mandiPriceInfo')}</CardDescription>
                    </CardHeader>
                    <form onSubmit={livePriceForm.handleSubmit(onLivePriceSubmit)}>
                        <CardContent className="space-y-4">
                            <div className="grid sm:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="state">{t('yourState')}</Label>
                                    <Input id="state" placeholder="Andhra Pradesh" {...livePriceForm.register('state', { required: true })} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="district">District</Label>
                                    <Input id="district" placeholder="Chittoor" {...livePriceForm.register('district', { required: true })} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="commodity">{t('crop')}</Label>
                                    <Input id="commodity" placeholder="Tomato" {...livePriceForm.register('commodity', { required: true })} />
                                </div>
                            </div>
                             <Button type="submit" className="w-full sm:w-auto" disabled={isLivePriceLoading}>
                                {isLivePriceLoading ? <Loader2 className="mr-2 animate-spin" /> : <Search className="mr-2" />}
                                Search Live Prices
                            </Button>
                        </CardContent>
                    </form>
                    
                    <CardContent>
                         <AnimatePresence>
                            {isLivePriceLoading && (
                                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex justify-center items-center h-40">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </motion.div>
                            )}
                            {livePriceError && (
                                <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="text-red-600 bg-red-100 dark:bg-red-900/20 p-4 rounded-md text-center">{livePriceError}</motion.div>
                            )}
                            {livePrices && livePrices.length > 0 && (
                                <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="border rounded-md mt-4 overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('market')}</TableHead>
                                                <TableHead>{t('variety')}</TableHead>
                                                <TableHead>Min Price (₹)</TableHead>
                                                <TableHead>Max Price (₹)</TableHead>
                                                <TableHead className="font-bold">Modal Price (₹)</TableHead>
                                                <TableHead className="text-right">{t('date')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {livePrices.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">{item.market}</TableCell>
                                                    <TableCell>{item.variety}</TableCell>
                                                    <TableCell>{item.min_price}</TableCell>
                                                    <TableCell>{item.max_price}</TableCell>
                                                    <TableCell className="font-semibold text-primary">{item.modal_price}</TableCell>
                                                    <TableCell className="text-right">{item.arrival_date}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </CardContent>
                </Card>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="lg:col-span-1 space-y-6"
            >
                <Card>
                     <CardHeader>
                        <CardTitle className="font-headline text-xl flex items-center gap-2">
                            <Bot /> AI Price Prediction
                        </CardTitle>
                        <CardDescription>Get a 4-week price forecast for your crop.</CardDescription>
                    </CardHeader>
                    <form onSubmit={predictionForm.handleSubmit(onPredictionSubmit)}>
                        <CardContent className="space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="predCropType">{t('cropType')}</Label>
                                <Input id="predCropType" placeholder={t('egTomato')} {...predictionForm.register('cropType', { required: t('cropTypeRequired')})} />
                                {predictionForm.formState.errors.cropType && <p className="text-destructive text-sm">{predictionForm.formState.errors.cropType.message}</p>}
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="predLocation">{t('location')}</Label>
                                <Input id="predLocation" placeholder={t('egAndhraPradesh')} {...predictionForm.register('location', { required: t('locationRequired')})} />
                                {predictionForm.formState.errors.location && <p className="text-destructive text-sm">{predictionForm.formState.errors.location.message}</p>}
                            </div>
                        </CardContent>
                        <CardFooter>
                             <Button type="submit" className="w-full" disabled={isPredictionLoading}>
                                {isPredictionLoading ? <Loader2 className="mr-2 animate-spin" /> : <Search className="mr-2" />}
                                Get AI Prediction
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
                
                <AnimatePresence>
                    {isPredictionLoading && (
                        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </motion.div>
                    )}
                    {predictionError && (
                         <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="text-red-600 bg-red-100 dark:bg-red-900/20 p-4 rounded-md text-center">{predictionError}</motion.div>
                    )}
                    {predictionResult && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                             <Card>
                                <CardHeader>
                                    <CardTitle>4-Week Forecast</CardTitle>
                                    <CardDescription className="text-sm italic text-muted-foreground">{predictionResult.overall_trend}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Week</TableHead>
                                                <TableHead className="text-right">Price (₹)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {predictionResult.forecast.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">
                                                        <p>{item.week}</p>
                                                        <p className="text-xs text-muted-foreground">{item.reasoning}</p>
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {item.price.toLocaleString('en-IN')}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}
