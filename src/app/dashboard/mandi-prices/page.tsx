
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { Bot, Loader2, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { predictMandiPrice, MandiPricePredictionOutput } from '@/ai/flows/predict-mandi-price';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';


type PredictionFormInputs = {
    cropType: string;
    location: string;
};

const staticMandiData = [
  {
    crop: "tomato",
    price: 2500,
    region: "maharashtra",
    trend: "up",
  },
  {
    crop: "onion",
    price: 1800,
    region: "karnataka",
    trend: "down",
  },
  {
    crop: "potato",
    price: 1500,
    region: "uttarPradesh",
    trend: "stable",
  },
  {
    crop: "wheat",
    price: 2200,
    region: "punjab",
    trend: "up",
  },
  {
    crop: "riceBasmati",
    price: 9500,
    region: "haryana",
    trend: "down",
  },
  {
    crop: "cotton",
    price: 7500,
    region: "gujarat",
    trend: "stable",
  },
];


const TrendIcon = ({ trend }: { trend: "up" | "down" | "stable" }) => {
  if (trend === "up") {
    return <ArrowUp className="h-5 w-5 text-green-500" />;
  }
  if (trend === "down") {
    return <ArrowDown className="h-5 w-5 text-red-500" />;
  }
  return <span className="text-gray-500 font-bold">-</span>;
};


export default function MandiPricesPage() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    
    const predictionForm = useForm<PredictionFormInputs>();
    const [isPredictionLoading, setIsPredictionLoading] = useState(false);
    const [predictionResult, setPredictionResult] = useState<MandiPricePredictionOutput | null>(null);
    const [predictionError, setPredictionError] = useState<string | null>(null);

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
                        <CardTitle className="font-headline text-2xl">{t('mandiPriceAdvisor')}</CardTitle>
                        <CardDescription>{t('mandiPriceInfo')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <div className="space-y-4">
                            <div className="grid grid-cols-3 font-semibold text-muted-foreground px-4">
                                <div>{t('crop')}</div>
                                <div>{t('price')}</div>
                                <div>{t('region')}</div>
                            </div>
                            {staticMandiData.map((item, index) => (
                                <div key={index} className="grid grid-cols-3 items-center px-4 py-3 bg-background hover:bg-muted/50 rounded-lg transition-colors">
                                    <div className="font-medium">{t(item.crop as any)}</div>
                                    <div className="flex items-center gap-2">
                                        <TrendIcon trend={item.trend as any} />
                                        <span className={cn(
                                            "font-semibold",
                                            item.trend === 'up' && 'text-green-600 dark:text-green-400',
                                            item.trend === 'down' && 'text-red-600 dark:text-red-400'
                                        )}>
                                            ₹{item.price.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div>{t(item.region as any)}</div>
                                </div>
                            ))}
                       </div>
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
