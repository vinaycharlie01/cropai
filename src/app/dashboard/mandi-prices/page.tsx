
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Bot, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranslationKeys } from '@/lib/translations';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { predictMandiPrice, MandiPricePredictionOutput } from '@/ai/flows/predict-mandi-price';

type Trend = 'up' | 'down' | 'stable';

interface PriceData {
    cropKey: TranslationKeys;
    price: number;
    regionKey: TranslationKeys;
    trend: Trend;
}

type ForecastFormInputs = {
    cropType: string;
    location: string;
};

const staticPriceData: PriceData[] = [
    { cropKey: 'tomato', price: 2500, regionKey: 'maharashtra', trend: 'up' },
    { cropKey: 'onion', price: 1800, regionKey: 'karnataka', trend: 'down' },
    { cropKey: 'potato', price: 1500, regionKey: 'uttarPradesh', trend: 'stable' },
    { cropKey: 'wheat', price: 2200, regionKey: 'punjab', trend: 'up' },
    { cropKey: 'riceBasmati', price: 9500, regionKey: 'haryana', trend: 'down' },
    { cropKey: 'cotton', price: 7500, regionKey: 'gujarat', trend: 'stable' },
];

const TrendIcon = ({ trend, className }: { trend: Trend, className?: string }) => {
    switch (trend) {
        case 'up':
            return <TrendingUp className={cn("h-5 w-5 text-green-500", className)} />;
        case 'down':
            return <TrendingDown className={cn("h-5 w-5 text-red-500", className)} />;
        case 'stable':
            return <Minus className={cn("h-5 w-5 text-gray-500", className)} />;
    }
};

export default function MandiPricesPage() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const { register, handleSubmit, formState: { errors } } = useForm<ForecastFormInputs>();
    
    const [forecast, setForecast] = useState<MandiPricePredictionOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };
    
    const onForecastSubmit: SubmitHandler<ForecastFormInputs> = async (data) => {
        setIsLoading(true);
        setForecast(null);
        try {
            const result = await predictMandiPrice({ ...data, language });
            setForecast(result);
        } catch (e: any) {
            console.error(e);
            toast({ variant: 'destructive', title: t('error'), description: e.message || "Failed to get price forecast." });
        } finally {
            setIsLoading(false);
        }
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
                        <motion.div 
                            className="hidden md:grid grid-cols-3 gap-4 px-4 font-semibold text-muted-foreground"
                            initial="hidden"
                            animate="visible"
                            variants={containerVariants}
                        >
                            <motion.div variants={itemVariants}>{t('crop')}</motion.div>
                            <motion.div variants={itemVariants}>{t('price')}</motion.div>
                            <motion.div variants={itemVariants}>{t('region')}</motion.div>
                        </motion.div>
                        
                        <motion.div 
                            className="space-y-2"
                            initial="hidden"
                            animate="visible"
                            variants={containerVariants}
                        >
                            {staticPriceData.map((item) => (
                                <motion.div
                                    key={item.cropKey}
                                    variants={itemVariants}
                                    className="grid grid-cols-3 gap-4 items-center p-4 rounded-lg bg-background hover:bg-muted/50 transition-colors"
                                >
                                    <div className="font-medium">{t(item.cropKey)}</div>
                                    <div className="flex items-center gap-2 font-semibold">
                                        <TrendIcon trend={item.trend} />
                                        <span>₹{item.price.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="text-muted-foreground">{t(item.regionKey)}</div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-xl flex items-center gap-2"><Bot /> AI Price Forecast</CardTitle>
                    <CardDescription>Get a detailed 4-week price forecast for your specific crop and location.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit(onForecastSubmit)}>
                    <CardContent className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="cropType">{t('cropType')}</Label>
                            <Input id="cropType" {...register('cropType', { required: true })} placeholder={t('egTomato')} />
                            {errors.cropType && <p className="text-sm text-destructive">{t('fieldRequired')}</p>}
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="location">{t('location')}</Label>
                            <Input id="location" {...register('location', { required: true })} placeholder={t('egAndhraPradesh')} />
                            {errors.location && <p className="text-sm text-destructive">{t('fieldRequired')}</p>}
                        </div>
                    </CardContent>
                    <CardFooter>
                         <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Search className="mr-2" />}
                            Get Forecast
                        </Button>
                    </CardFooter>
                </form>
            </Card>
            
            <AnimatePresence>
                {forecast && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <Card>
                            <CardHeader>
                                <CardTitle>Forecast for {forecast.cropType} in {forecast.location}</CardTitle>
                                <CardDescription>{forecast.overall_trend}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {forecast.forecast.map(week => (
                                    <div key={week.week} className="p-4 bg-muted/50 rounded-lg">
                                        <div className="flex justify-between items-center">
                                            <p className="font-bold text-lg">{week.week}</p>
                                            <div className="flex items-center gap-2 text-lg font-bold">
                                                <TrendIcon trend={week.trend} />
                                                <span>₹{week.price.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">{week.reasoning}</p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

        </motion.div>
    );
}

