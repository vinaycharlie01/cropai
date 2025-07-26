
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { Bot, Loader2, Search, LineChart, MapPin, BadgeIndianRupee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getLiveMandiPriceTool } from '@/ai/flows/get-live-mandi-prices';
import { MandiPriceRecord } from '@/types/mandi-prices';


type SearchFormInputs = {
    state: string;
    district: string;
    commodity: string;
};


export default function MandiPricesPage() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const searchForm = useForm<SearchFormInputs>();
    
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<MandiPriceRecord[] | null>(null);

    const onSearchSubmit: SubmitHandler<SearchFormInputs> = async (data) => {
        setIsLoading(true);
        setResults(null);
        try {
            const priceResults = await getLiveMandiPriceTool(data);
            setResults(priceResults);
            if (priceResults.length === 0) {
                toast({
                    title: "No Results",
                    description: "No market data found for your search. Try a different location or crop.",
                });
            }
        } catch (error) {
            console.error("Failed to fetch live prices", error);
            const errorMessage = (error instanceof Error) ? error.message : "Could not fetch live market prices.";
            toast({ variant: 'destructive', title: t('error'), description: errorMessage });
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
                    <CardTitle className="font-headline text-2xl flex items-center gap-2"><LineChart />{t('mandiPrices')}</CardTitle>
                    <CardDescription>{t('mandiPriceInfo')}</CardDescription>
                </CardHeader>
                <form onSubmit={searchForm.handleSubmit(onSearchSubmit)}>
                    <CardContent className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="state">{t('yourState')}</Label>
                            <Input id="state" placeholder="e.g., Karnataka" {...searchForm.register('state', { required: "State is required."})} />
                            {searchForm.formState.errors.state && <p className="text-destructive text-sm">{searchForm.formState.errors.state.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="district">District</Label>
                            <Input id="district" placeholder="e.g., Kolar" {...searchForm.register('district')} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="commodity">{t('crop')}</Label>
                            <Input id="commodity" placeholder="e.g., Tomato" {...searchForm.register('commodity', { required: "Crop/Commodity is required."})} />
                             {searchForm.formState.errors.commodity && <p className="text-destructive text-sm">{searchForm.formState.errors.commodity.message}</p>}
                        </div>
                    </CardContent>
                    <CardFooter>
                         <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Search className="mr-2" />}
                            Search Prices
                        </Button>
                    </CardFooter>
                </form>
            </Card>
                
            <AnimatePresence>
                {isLoading && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </motion.div>
                )}
                {results && results.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <h2 className="text-xl font-bold">Results for {searchForm.getValues('commodity')} in {searchForm.getValues('district') || searchForm.getValues('state')}</h2>
                         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {results.map((item, index) => (
                                <Card key={index} className="bg-background hover:border-primary/50 transition-colors">
                                    <CardHeader>
                                        <CardTitle className="text-lg">{item.market}</CardTitle>
                                        <CardDescription>Variety: {item.variety}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className="flex items-baseline gap-2">
                                            <BadgeIndianRupee className="h-6 w-6 text-primary" />
                                            <span className="text-3xl font-bold text-primary">{parseInt(item.modal_price).toLocaleString('en-IN')}</span>
                                            <span className="text-sm text-muted-foreground">/ quintal</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                           Last updated: {new Date(item.arrival_date.split('/').reverse().join('-')).toLocaleDateString('en-IN')}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </motion.div>
                )}
                 {results && results.length === 0 && !isLoading && (
                     <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                        <Card className="text-center p-10 border-dashed">
                             <CardContent className="pt-6">
                                <p className="text-muted-foreground">No market data found for your search.</p>
                                <p className="text-sm text-muted-foreground">Please try different criteria or a broader location.</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
