
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowUp, ArrowDown, Minus, Bot, Loader2, Search, LineChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { predictMandiPrice, MandiPricePredictionOutput } from '@/ai/flows/predict-mandi-price';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


const mockMandiData = [
    { cropKey: 'tomato', price: 2500, regionKey: 'maharashtra', trend: 'up' },
    { cropKey: 'onion', price: 1800, regionKey: 'karnataka', trend: 'down' },
    { cropKey: 'potato', price: 1500, regionKey: 'uttarPradesh', trend: 'stable' },
    { cropKey: 'wheat', price: 2200, regionKey: 'punjab', trend: 'up' },
    { cropKey: 'riceBasmati', price: 9500, regionKey: 'haryana', trend: 'down' },
    { cropKey: 'cotton', price: 7500, regionKey: 'gujarat', trend: 'stable' },
];

type PredictionFormInputs = {
    cropType: string;
    location: string;
};

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    switch (trend) {
        case 'up': return <ArrowUp className="h-5 w-5 text-green-500" />;
        case 'down': return <ArrowDown className="h-5 w-5 text-red-500" />;
        case 'stable': return <Minus className="h-5 w-5 text-gray-500" />;
        default: return null;
    }
};

export default function MandiPricesPage() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const { register, handleSubmit, formState: { errors } } = useForm<PredictionFormInputs>();

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
            setPredictionError("Could not fetch AI price prediction. Please try again later.");
            toast({
                variant: 'destructive',
                title: t('error'),
                description: "Could not fetch AI price prediction.",
            });
        } finally {
            setIsPredictionLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Prices Column */}
            <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="lg:col-span-2"
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl flex items-center gap-2">
                           <LineChart /> {t('mandiPriceAdvisor')}
                        </CardTitle>
                        <CardDescription>{t('mandiPriceInfo')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-4 px-4 py-2 font-semibold text-muted-foreground bg-muted/50 rounded-t-lg">
                                <div className="col-span-1">{t('crop')}</div>
                                <div className="col-span-1">{t('price')}</div>
                                <div className="col-span-1">{t('region')}</div>
                            </div>
                            <motion.div variants={containerVariants}>
                                {mockMandiData.map((item, index) => (
                                    <motion.div
                                        key={index}
                                        variants={itemVariants}
                                        className="grid grid-cols-3 gap-4 px-4 py-4 items-center border-b last:border-b-0"
                                    >
                                        <div className="col-span-1 font-medium">{t(item.cropKey as any)}</div>
                                        <div className="col-span-1 flex items-center gap-2">
                                            <TrendIcon trend={item.trend as any} />
                                            <span className="font-semibold">₹{item.price.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="col-span-1 text-muted-foreground">{t(item.regionKey as any)}</div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

             {/* AI Prediction Column */}
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
                    <form onSubmit={handleSubmit(onPredictionSubmit)}>
                        <CardContent className="space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="cropType">{t('cropType')}</Label>
                                <Input id="cropType" placeholder={t('egTomato')} {...register('cropType', { required: t('cropTypeRequired')})} />
                                {errors.cropType && <p className="text-destructive text-sm">{errors.cropType.message}</p>}
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="location">{t('location')}</Label>
                                <Input id="location" placeholder={t('egAndhraPradesh')} {...register('location', { required: t('locationRequired')})} />
                                {errors.location && <p className="text-destructive text-sm">{errors.location.message}</p>}
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
                                                    <div className="flex items-center gap-2">
                                                        <span>{item.week}</span>
                                                        <TrendIcon trend={item.trend} />
                                                    </div>
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
        </div>
    );
}

