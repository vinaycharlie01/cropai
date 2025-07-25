
'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Wind, Droplets, Sun, CloudRain, Bot, Loader2, Mic } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { weatherApiFlow, WeatherOutput } from '@/ai/flows/weather-api';
import { Skeleton } from '@/components/ui/skeleton';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { getTtsLanguageCode } from '@/lib/translations';

export default function WeatherPage() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const [locationQuery, setLocationQuery] = useState('');
    const [weatherData, setWeatherData] = useState<WeatherOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

     const onRecognitionResult = useCallback((result: string) => {
        if (result) {
            setLocationQuery(result);
            handleSearch(result);
        }
    }, []);

    const onRecognitionError = useCallback((err: string) => {
        console.error(err);
        toast({ variant: 'destructive', title: t('error'), description: 'Speech recognition failed.' });
    }, [t, toast]);

    const { isListening, startListening, stopListening, isSupported } = useSpeechRecognition({
        onResult: onRecognitionResult,
        onError: onRecognitionError,
    });
    
    const handleVoiceSearch = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening(getTtsLanguageCode(language));
        }
    };


    const handleSearch = async (query: string) => {
        if (!query) {
            toast({ variant: 'destructive', title: t('error'), description: "Please enter a location." });
            return;
        }
        setIsLoading(true);
        setError(null);
        setWeatherData(null);
        try {
            const result = await weatherApiFlow({ locationQuery: query, language });
            setWeatherData(result);
        } catch (e) {
            const errorMessage = (e as Error).message || 'An unexpected error occurred.';
            setError(errorMessage);
            console.error(e);
            toast({ variant: 'destructive', title: t('error'), description: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGeolocation = () => {
        if (!navigator.geolocation) {
            toast({ variant: 'destructive', title: t('error'), description: 'Geolocation is not supported by your browser.' });
            return;
        }
        setIsLoading(true);
        setError(null);
        setWeatherData(null);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                handleSearch(`${latitude},${longitude}`);
            },
            () => {
                toast({ variant: 'destructive', title: t('error'), description: 'Unable to retrieve your location.' });
                setIsLoading(false);
            }
        );
    };
    
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">{t('weatherForecast')}</CardTitle>
                    <CardDescription>{t('weatherInstruction')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                            <Input
                                type="text"
                                value={locationQuery}
                                onChange={(e) => setLocationQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch(locationQuery)}
                                placeholder="Enter city name..."
                                className="pr-10"
                            />
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={handleVoiceSearch}
                                disabled={!isSupported || isLoading}
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                            >
                                <Mic className={`h-5 w-5 ${isListening ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                            </Button>
                        </div>
                        <Button onClick={() => handleSearch(locationQuery)} disabled={isLoading} className="w-full sm:w-auto">
                            <Search className="mr-2" /> {t('search')}
                        </Button>
                        <Button onClick={handleGeolocation} variant="outline" disabled={isLoading} className="w-full sm:w-auto">
                            <MapPin className="mr-2" /> {t('useCurrentLocation')}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <AnimatePresence>
                {isLoading && (
                    <motion.div variants={itemVariants} initial="hidden" animate="visible">
                        <WeatherSkeleton />
                    </motion.div>
                )}
                {error && (
                     <motion.div variants={itemVariants} initial="hidden" animate="visible">
                        <Card className="border-destructive">
                            <CardHeader>
                                <CardTitle className="text-destructive">{t('error')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p>{error}</p>
                            </CardContent>
                        </Card>
                     </motion.div>
                )}
                {weatherData && (
                    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid gap-6 lg:grid-cols-3">
                        <motion.div variants={itemVariants} className="lg:col-span-1">
                             <Card className="h-full bg-gradient-to-br from-primary/80 to-primary text-primary-foreground">
                                <CardHeader>
                                    <CardTitle className="text-xl">{weatherData.location.name}</CardTitle>
                                    <CardDescription className="text-primary-foreground/80">{weatherData.location.region}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center text-center">
                                    <Image src={weatherData.current.iconUrl} alt={weatherData.current.conditionText} width={128} height={128} />
                                    <p className="text-6xl font-bold mt-4">{Math.round(weatherData.current.tempC)}°C</p>
                                    <p className="text-lg mt-2">{weatherData.current.conditionText}</p>
                                    <div className="flex gap-4 mt-4 text-sm text-primary-foreground/90">
                                        <div className="flex items-center gap-1"><Wind size={16} />{weatherData.current.windKph} kph</div>
                                        <div className="flex items-center gap-1"><Droplets size={16} />{weatherData.current.humidity}%</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><Bot />AI Spraying Advisory</CardTitle></CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">{weatherData.sprayingAdvisory}</p>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>5-Day Forecast</CardTitle></CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {weatherData.forecast.map((day) => (
                                            <li key={day.date} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                                <div className="flex items-center gap-3 font-medium">
                                                    <Image src={day.iconUrl} alt={day.conditionText} width={40} height={40} />
                                                    <span>{day.dayOfWeek}</span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                     <span className="flex items-center gap-1"><CloudRain size={16} /> {day.chanceOfRain}%</span>
                                                     <span className="flex items-center gap-1"><Wind size={16} /> {Math.round(day.windKph)}kph</span>
                                                     <span className="font-semibold text-lg text-foreground/90">{Math.round(day.avgTempC)}°C</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}


function WeatherSkeleton() {
    return (
        <div className="grid gap-6 lg:grid-cols-3">
             <div className="lg:col-span-1">
                <Card className="h-full">
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="flex flex-col items-center text-center">
                        <Skeleton className="h-32 w-32 rounded-full" />
                        <Skeleton className="h-16 w-24 mt-4" />
                        <Skeleton className="h-6 w-32 mt-2" />
                        <div className="flex gap-4 mt-4">
                            <Skeleton className="h-5 w-16" />
                            <Skeleton className="h-5 w-16" />
                        </div>
                    </CardContent>
                </Card>
             </div>
              <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                    <CardContent className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
                    <CardContent className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                             <div key={i} className="flex items-center justify-between p-2">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-10 w-10" />
                                    <Skeleton className="h-5 w-20" />
                                </div>
                                <div className="flex items-center gap-4">
                                     <Skeleton className="h-5 w-12" />
                                     <Skeleton className="h-5 w-12" />
                                     <Skeleton className="h-6 w-10" />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
             </div>
        </div>
    );
}

