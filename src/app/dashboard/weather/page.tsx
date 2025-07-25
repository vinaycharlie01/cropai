
'use client';

import { useState, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Loader2, Mic, Wind, Droplets, Sun, Cloud, CloudRain, CloudSun } from 'lucide-react';
import Image from 'next/image';

import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { getTtsLanguageCode } from '@/lib/translations';
import { getWeatherAction, WeatherOutput } from '@/ai/flows/weather-api';
import { cn } from '@/lib/utils';

type FormInputs = {
  location: string;
};

const getBackgroundClass = (condition: string = '') => {
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) return 'from-slate-400 to-slate-600';
    if (lowerCondition.includes('cloudy') || lowerCondition.includes('overcast')) return 'from-sky-400 to-sky-600';
    if (lowerCondition.includes('clear') || lowerCondition.includes('sunny')) return 'from-blue-400 to-blue-600';
    return 'from-gray-500 to-gray-700';
};

const WeatherIcon = ({ condition, className }: { condition: string; className?: string }) => {
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) return <CloudRain className={cn("h-10 w-10", className)} />;
    if (lowerCondition.includes('sunny') || lowerCondition.includes('clear')) return <Sun className={cn("h-10 w-10", className)} />;
    if (lowerCondition.includes('partly cloudy')) return <CloudSun className={cn("h-10 w-10", className)} />;
    if (lowerCondition.includes('cloudy') || lowerCondition.includes('overcast')) return <Cloud className={cn("h-10 w-10", className)} />;
    return <Cloud className={cn("h-10 w-10", className)} />;
};

export default function WeatherPage() {
    const { t, language } = useLanguage();
    const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormInputs>();
    const [weather, setWeather] = useState<WeatherOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const onRecognitionResult = useCallback((result: string) => {
        setValue('location', result, { shouldValidate: true });
        handleSubmit(onSubmit)({ location: result });
    }, [setValue, handleSubmit]);

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
    
    const fetchWeather = async (query: string) => {
        setIsLoading(true);
        setWeather(null);
        try {
            const result = await getWeatherAction({ locationQuery: query, language: language });
            setWeather(result);
        } catch (e: any) {
            console.error(e);
            toast({ variant: 'destructive', title: t('error'), description: e.message || 'Could not fetch weather data.' });
        } finally {
            setIsLoading(false);
        }
    }

    const onSubmit: SubmitHandler<FormInputs> = (data) => {
        fetchWeather(data.location);
    };
    
    const handleCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                fetchWeather(`${latitude},${longitude}`);
            }, (error) => {
                toast({ variant: 'destructive', title: t('error'), description: 'Unable to retrieve your location.' });
            });
        } else {
            toast({ variant: 'destructive', title: t('error'), description: 'Geolocation is not supported by your browser.' });
        }
    };
    
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            staggerChildren: 0.1,
          },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1 },
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
        >
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">{t('weatherForecast')}</CardTitle>
                    <CardDescription>{t('weatherInstruction')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col sm:flex-row items-start gap-4">
                        <div className="w-full space-y-2">
                             <div className="relative w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    id="location"
                                    placeholder={t('egAndhraPradesh')}
                                    className="pl-10"
                                    {...register('location', { required: t('locationRequired') })}
                                />
                                 <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleVoiceSearch}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                    disabled={!isSupported}
                                >
                                    <Mic className={`h-5 w-5 ${isListening ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                                </Button>
                             </div>
                              {errors.location && <p className="text-destructive text-sm">{errors.location.message}</p>}
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading ? <Loader2 className="animate-spin" /> : <Search />}
                            </Button>
                             <Button type="button" variant="outline" onClick={handleCurrentLocation} disabled={isLoading} className="w-full">
                                <MapPin />
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <AnimatePresence>
                {isLoading && (
                     <motion.div variants={itemVariants} className="flex justify-center items-center py-20">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </motion.div>
                )}
                {weather && (
                     <motion.div 
                        key="weather-results" 
                        variants={containerVariants}
                        className="space-y-6"
                     >
                        {/* Current Weather Card */}
                        <motion.div variants={itemVariants}>
                            <Card className={cn(
                                "text-white overflow-hidden relative bg-gradient-to-br",
                                getBackgroundClass(weather.current.condition)
                            )}>
                               <div className="absolute inset-0 bg-black/20"></div>
                               <CardContent className="relative z-10 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div className="text-center md:text-left">
                                        <h2 className="text-2xl font-bold">{weather.location}</h2>
                                        <p className="text-7xl font-bold tracking-tighter">{Math.round(weather.current.temp_c)}°C</p>
                                        <p className="font-medium text-lg capitalize">{weather.current.condition}</p>
                                    </div>
                                    <div className="flex flex-col items-center md:items-end gap-2 text-lg">
                                        <div className="flex items-center gap-2"><Wind /> {weather.current.wind_kph} kph</div>
                                        <div className="flex items-center gap-2"><Droplets /> {weather.current.humidity}%</div>
                                        <div className="flex items-center gap-2"><CloudRain /> {weather.forecast[0].daily_chance_of_rain}% {t('rain')}</div>
                                    </div>
                               </CardContent>
                            </Card>
                        </motion.div>
                        
                        {/* 5-Day Forecast */}
                         <motion.div variants={itemVariants}>
                            <Card>
                                <CardHeader>
                                    <CardTitle>5-Day Forecast</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                {weather.forecast.map((day, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="flex flex-col items-center gap-2 p-4 bg-muted/50 rounded-lg"
                                    >
                                        <p className="font-bold text-lg">{day.day}</p>
                                        <WeatherIcon condition={day.condition} className="h-12 w-12 text-primary" />
                                        <p className="text-2xl font-bold">{Math.round(day.avgtemp_c)}°C</p>
                                        <p className="text-sm text-muted-foreground capitalize text-center h-10">{day.condition}</p>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <CloudRain className="h-3 w-3" /> {day.daily_chance_of_rain}%
                                        </div>
                                    </motion.div>
                                ))}
                                </CardContent>
                            </Card>
                         </motion.div>

                        {/* AI Advisory */}
                         <motion.div variants={itemVariants}>
                            <Card>
                                 <CardHeader>
                                    <CardTitle>AI Spraying Advisory</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">{weather.sprayingAdvisory}</p>
                                </CardContent>
                            </Card>
                         </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
