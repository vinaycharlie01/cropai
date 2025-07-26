
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { Bot, Loader2, Search, LineChart, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { predictMandiPrice } from '@/ai/flows/predict-mandi-price';
import { MandiPricePredictionOutput, MandiPricePredictionInput } from '@/types/mandi-prices';
import { cn } from '@/lib/utils';
import { AudioPlayer } from '@/components/AudioPlayer';


type SearchFormInputs = {
    location: string;
    cropType: string;
};


export default function MandiPricesPage() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const searchForm = useForm<SearchFormInputs>();
    
    const [isLoading, setIsLoading] = useState(false);
    const [prediction, setPrediction] = useState<MandiPricePredictionOutput | null>(null);

    const onSearchSubmit: SubmitHandler<SearchFormInputs> = async (data) => {
        setIsLoading(true);
        setPrediction(null);
        try {
            const result = await predictMandiPrice({ ...data, language });
            setPrediction(result);
        } catch (error) {
            console.error("Failed to fetch price prediction", error);
            const errorMessage = (error instanceof Error) ? error.message : "Could not fetch price prediction.";
            toast({ variant: 'destructive', title: t('error'), description: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };
    
    const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
        if (trend === 'up') return <TrendingUp className="h-5 w-5 text-green-500" />;
        if (trend === 'down') return <TrendingDown className="h-5 w-5 text-red-500" />;
        return <ArrowRight className="h-5 w-5 text-gray-500" />;
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
                    <CardTitle className="font-headline text-2xl flex items-center gap-2"><LineChart />{t('mandiPrices')}</CardTitle>
                    <CardDescription>Get a 4-week AI-powered price forecast for your crop.</CardDescription>
                </CardHeader>
                <form onSubmit={searchForm.handleSubmit(onSearchSubmit)}>
                    <CardContent className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="location">{t('location')} (District, State)</Label>
                            <Input id="location" placeholder="e.g., Kolar, Karnataka" {...searchForm.register('location', { required: "Location is required."})} />
                            {searchForm.formState.errors.location && <p className="text-destructive text-sm">{searchForm.formState.errors.location.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cropType">{t('crop')}</Label>
                            <Input id="cropType" placeholder="e.g., Tomato" {...searchForm.register('cropType', { required: "Crop/Commodity is required."})} />
                             {searchForm.formState.errors.cropType && <p className="text-destructive text-sm">{searchForm.formState.errors.cropType.message}</p>}
                        </div>
                    </CardContent>
                    <CardFooter>
                         <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Bot className="mr-2" />}
                            Get Forecast
                        </Button>
                    </CardFooter>
                </form>
            </Card>
                
            <AnimatePresence>
                {isLoading && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex justify-center items-center h-40">
                        <div className="text-center space-y-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                            <p className="text-muted-foreground">Our AI analyst is crunching the numbers...</p>
                        </div>
                    </motion.div>
                )}
                {prediction && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                         <Card>
                             <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Forecast for {prediction.cropType} in {prediction.location}</span>
                                    <AudioPlayer textToSpeak={prediction.overall_trend} language={language} />
                                </CardTitle>
                                <CardDescription>{prediction.overall_trend}</CardDescription>
                            </CardHeader>
                            <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {prediction.forecast.map((item, index) => (
                                    <Card key={index} className="bg-background hover:border-primary/50 transition-colors flex flex-col">
                                        <CardHeader className="flex-row items-center justify-between pb-2">
                                            <CardTitle className="text-base">{item.week}</CardTitle>
                                            <TrendIcon trend={item.trend} />
                                        </CardHeader>
                                        <CardContent className="flex-grow space-y-2">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-3xl font-bold text-primary">₹{item.price.toLocaleString('en-IN')}</span>
                                                <span className="text-sm text-muted-foreground">/ quintal</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{item.reasoning}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
