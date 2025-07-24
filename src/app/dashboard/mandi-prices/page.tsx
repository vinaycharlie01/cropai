
'use client';

import { useState } from "react";
import { useForm, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Minus, LineChart, TrendingUp, Bot, Loader2, Mic } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { predictMandiPrice, MandiPricePredictionOutput } from "@/ai/flows/predict-mandi-price";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type MandiData = {
  cropKey: 'tomato' | 'onion' | 'potato' | 'wheat' | 'riceBasmati' | 'cotton';
  price: number;
  regionKey: 'maharashtra' | 'karnataka' | 'uttarPradesh' | 'punjab' | 'haryana' | 'gujarat';
  trend: 'up' | 'down' | 'stable';
};

const mandiData: MandiData[] = [
  { cropKey: 'tomato', price: 2500, regionKey: 'maharashtra', trend: 'up' },
  { cropKey: 'onion', price: 1800, regionKey: 'karnataka', trend: 'down' },
  { cropKey: 'potato', price: 1500, regionKey: 'uttarPradesh', trend: 'stable' },
  { cropKey: 'wheat', price: 2200, regionKey: 'punjab', trend: 'up' },
  { cropKey: 'riceBasmati', price: 9500, regionKey: 'haryana', trend: 'down' },
  { cropKey: 'cotton', price: 7500, regionKey: 'gujarat', trend: 'stable' },
];

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  switch (trend) {
    case 'up':
      return <ArrowUpRight className="h-5 w-5 text-green-500" />;
    case 'down':
      return <ArrowDownRight className="h-5 w-5 text-red-500" />;
    case 'stable':
      return <Minus className="h-5 w-5 text-gray-500" />;
  }
};

type PredictionFormInputs = {
  cropType: string;
  location: string;
};


export default function MandiPricesPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm<PredictionFormInputs>();

  const [isPredictionLoading, setIsPredictionLoading] = useState(false);
  const [prediction, setPrediction] = useState<MandiPricePredictionOutput | null>(null);

  const onPredictionSubmit: SubmitHandler<PredictionFormInputs> = async (data) => {
      setIsPredictionLoading(true);
      setPrediction(null);
      try {
        const result = await predictMandiPrice({
          cropType: data.cropType,
          location: data.location,
          language: language,
        });
        setPrediction(result);
      } catch (e) {
        console.error(e);
        toast({
          variant: 'destructive',
          title: t('error'),
          description: 'Failed to get AI price prediction. Please try again later.',
        });
      } finally {
        setIsPredictionLoading(false);
      }
  };

  const chartData = prediction?.forecast.map(item => ({
      name: item.week,
      price: item.price,
  }));
  const chartConfig = { price: { label: "Price (₹)", color: "hsl(var(--primary))" }};

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center gap-2">
                    <TrendingUp /> AI Price Prediction
                </CardTitle>
                <CardDescription>Get a 4-week price forecast for a crop.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onPredictionSubmit)}>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="cropType">{t('cropType')}</Label>
                            <Input id="cropType" placeholder={t('egTomato')} {...register('cropType', { required: t('cropTypeRequired') })} />
                            {errors.cropType && <p className="text-destructive text-sm">{errors.cropType.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location">{t('location')}</Label>
                            <Input id="location" placeholder={t('egAndhraPradesh')} {...register('location', { required: t('locationRequired') })} />
                             {errors.location && <p className="text-destructive text-sm">{errors.location.message}</p>}
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isPredictionLoading}>
                        {isPredictionLoading ? <Loader2 className="mr-2 animate-spin" /> : <Bot className="mr-2" />}
                         Get Prediction
                    </Button>
                </CardFooter>
            </form>
        </Card>

        <AnimatePresence>
            {prediction && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline text-xl">4-Week Forecast for {prediction.cropType}</CardTitle>
                            <CardDescription>{prediction.overall_trend}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                {prediction.forecast.map(week => (
                                    <div key={week.week} className="flex gap-4">
                                        <div className="flex-shrink-0 font-semibold">{week.week}</div>
                                        <div className="flex-1">
                                            <p className="font-medium">₹{week.price.toLocaleString('en-IN')}</p>
                                            <p className="text-sm text-muted-foreground">{week.reasoning}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div>
                                {chartData && (
                                    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                                        <BarChart accessibilityLayer data={chartData}>
                                             <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                                             <YAxis hide={true} domain={['dataMin - 500', 'dataMax + 500']} />
                                             <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                             <Bar dataKey="price" fill="var(--color-price)" radius={4} />
                                        </BarChart>
                                    </ChartContainer>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>


      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <LineChart /> {t('mandiPriceAdvisor')}
          </CardTitle>
          <CardDescription>{t('mandiPriceInfo')}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Header Row */}
          <motion.div
            variants={itemVariants}
            className="flex justify-between px-4 py-2 text-muted-foreground font-semibold"
          >
            <div className="w-1/3">{t('crop')}</div>
            <div className="w-1/3 text-center">{t('price')}</div>
            <div className="w-1/3 text-right">{t('region')}</div>
          </motion.div>
          
          {/* Data Rows */}
          <div className="space-y-2">
            {mandiData.map((item, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="flex items-center justify-between px-4 py-3 bg-background hover:bg-muted/50 rounded-lg transition-colors"
              >
                <div className="w-1/3 font-medium">{t(item.cropKey)}</div>
                <div className="w-1/3 text-center flex items-center justify-center gap-2">
                  <TrendIcon trend={item.trend} />
                  <span className={cn(
                    "font-semibold",
                    item.trend === 'up' && 'text-green-500',
                    item.trend === 'down' && 'text-red-500'
                  )}>
                    ₹{item.price.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-1/3 text-right text-muted-foreground">{t(item.regionKey)}</div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

    