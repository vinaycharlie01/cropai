
'use client';

import { useState } from "react";
import { useForm, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Bot, Loader2, TrendingUp } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { predictMandiPrice, MandiPricePredictionOutput } from "@/ai/flows/predict-mandi-price";
import { getMandiPriceTool, MandiPriceRecord } from "@/ai/flows/get-mandi-prices";


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
  const { t } = useLanguage();
  const { toast } = useToast();
  const predictionForm = useForm<PredictionFormInputs>();
  const livePriceForm = useForm<LivePriceFormInputs>();

  const [isPredictionLoading, setIsPredictionLoading] = useState(false);
  const [prediction, setPrediction] = useState<MandiPricePredictionOutput | null>(null);

  const [isLivePriceLoading, setIsLivePriceLoading] = useState(false);
  const [livePrices, setLivePrices] = useState<MandiPriceRecord[] | null>(null);
  const [livePriceError, setLivePriceError] = useState<string | null>(null);

  const onPredictionSubmit: SubmitHandler<PredictionFormInputs> = async (data) => {
      setIsPredictionLoading(true);
      setPrediction(null);
      try {
        const result = await predictMandiPrice({
          cropType: data.cropType,
          location: data.location,
          language: t('en'), // Language for AI model
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
  
  const onLivePriceSubmit: SubmitHandler<LivePriceFormInputs> = async (data) => {
      setIsLivePriceLoading(true);
      setLivePriceError(null);
      setLivePrices(null);
      try {
        const prices = await getMandiPriceTool({ state: data.state, district: data.district, commodity: data.commodity });
        if (prices.length === 0) {
            setLivePriceError(`No data found for ${data.commodity} in ${data.district}, ${data.state}. Please try a different crop or location.`);
        }
        setLivePrices(prices);
      } catch (error) {
          console.error("Failed to fetch live prices", error);
          const errorMessage = (error instanceof Error) ? error.message : "Could not load live market prices. The data.gov.in service may be temporarily unavailable or the commodity may not be available in the selected location.";
          setLivePriceError(errorMessage);
      } finally {
          setIsLivePriceLoading(false);
      }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center gap-2">
                    <LineChart /> {t('mandiPriceAdvisor')}
                </CardTitle>
                <CardDescription>Search for live commodity prices from markets in your district.</CardDescription>
            </CardHeader>
            <form onSubmit={livePriceForm.handleSubmit(onLivePriceSubmit)}>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="state">{t('yourState')}</Label>
                            <Input id="state" placeholder="e.g., Andhra Pradesh" {...livePriceForm.register('state', { required: true })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="district">District</Label>
                            <Input id="district" placeholder="e.g., Chittor" {...livePriceForm.register('district', { required: true })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="commodity">{t('crop')}</Label>
                            <Input id="commodity" placeholder={t('egTomato')} {...livePriceForm.register('commodity', { required: true })} />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isLivePriceLoading}>
                        {isLivePriceLoading ? <Loader2 className="mr-2 animate-spin" /> : <TrendingUp className="mr-2" />}
                         Search Live Prices
                    </Button>
                </CardFooter>
            </form>

            <AnimatePresence>
                {isLivePriceLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center p-4">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                        <p className="mt-2 text-muted-foreground">Fetching live prices...</p>
                    </motion.div>
                )}

                {livePriceError && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <Alert variant="destructive">
                            <AlertTitle>{t('error')}</AlertTitle>
                            <AlertDescription>{livePriceError}</AlertDescription>
                        </Alert>
                    </motion.div>
                )}

                {livePrices && livePrices.length > 0 && !isLivePriceLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border rounded-md mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('market')}</TableHead>
                                    <TableHead>{t('variety')}</TableHead>
                                    <TableHead className="text-right">{t('price')} (₹)</TableHead>
                                    <TableHead className="text-right">{t('date')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {livePrices.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{item.market}</TableCell>
                                        <TableCell>{item.variety}</TableCell>
                                        <TableCell className="text-right font-semibold">{item.modal_price}</TableCell>
                                        <TableCell className="text-right">{item.arrival_date}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center gap-2">
                    <Bot /> AI Price Prediction
                </CardTitle>
                <CardDescription>Get a 4-week price forecast for a crop in a specific location.</CardDescription>
            </CardHeader>
            <form onSubmit={predictionForm.handleSubmit(onPredictionSubmit)}>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="cropType-pred">{t('cropType')}</Label>
                            <Input id="cropType-pred" placeholder={t('egTomato')} {...predictionForm.register('cropType', { required: t('cropTypeRequired') })} />
                            {predictionForm.formState.errors.cropType && <p className="text-destructive text-sm">{predictionForm.formState.errors.cropType.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location-pred">{t('location')}</Label>
                            <Input id="location-pred" placeholder={t('egAndhraPradesh')} {...predictionForm.register('location', { required: t('locationRequired') })} />
                             {predictionForm.formState.errors.location && <p className="text-destructive text-sm">{predictionForm.formState.errors.location.message}</p>}
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isPredictionLoading}>
                        {isPredictionLoading ? <Loader2 className="mr-2 animate-spin" /> : <Bot className="mr-2" />}
                         Get AI Prediction
                    </Button>
                </CardFooter>
            </form>

             <AnimatePresence>
              {prediction && (
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 pt-0">
                      <Card className="bg-muted/50">
                          <CardHeader>
                              <CardTitle className="font-headline text-xl">4-Week Forecast for {prediction.cropType}</CardTitle>
                              <CardDescription>{prediction.overall_trend}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                                {prediction.forecast.map(week => (
                                    <div key={week.week} className="flex gap-4">
                                        <div className="flex-shrink-0 font-semibold">{week.week}</div>
                                        <div className="flex-1">
                                            <p className="font-medium">₹{week.price.toLocaleString('en-IN')}</p>
                                            <p className="text-sm text-muted-foreground">{week.reasoning}</p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                      </Card>
                  </motion.div>
              )}
            </AnimatePresence>
        </Card>
    </motion.div>
  );
}
