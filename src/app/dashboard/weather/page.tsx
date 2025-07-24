
'use client';

import React, { useState, useEffect, memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Sun,
  Cloud,
  CloudRain,
  Thermometer,
  Wind,
  Droplet,
  MapPin,
  CloudLightning,
  Snowflake,
  Search,
  Loader2,
  SprayCan,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getWeatherAction, WeatherOutput } from '@/ai/flows/weather-api';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getSprayingAdvice, SprayingAdvice } from '@/ai/flows/spraying-advice';
import { cn } from '@/lib/utils';


const weatherIcons: { [key: string]: React.ReactNode } = {
  Sunny: <Sun className="w-16 h-16 text-yellow-400" />,
  'Partly Cloudy': <Cloud className="w-16 h-16 text-gray-400" />,
  Cloudy: <Cloud className="w-16 h-16 text-gray-400" />,
  Rain: <CloudRain className="w-16 h-16 text-blue-400" />,
  Showers: <CloudRain className="w-16 h-16 text-blue-400" />,
  'Light rain': <CloudRain className="w-16 h-16 text-blue-400" />,
  'Moderate rain': <CloudRain className="w-16 h-16 text-blue-400" />,
  'Heavy rain': <CloudRain className="w-16 h-16 text-blue-400" />,
  Thunderstorm: <CloudLightning className="w-16 h-16 text-yellow-500" />,
  Snow: <Snowflake className="w-16 h-16 text-blue-200" />,
};

const smallWeatherIcons: { [key: string]: React.ReactNode } = {
  Sunny: <Sun className="w-8 h-8 text-yellow-400" />,
  'Partly cloudy': <Cloud className="w-8 h-8 text-gray-400" />,
  Cloudy: <Cloud className="w-8 h-8 text-gray-400" />,
  Rain: <CloudRain className="w-8 h-8 text-blue-400" />,
  'Light rain': <CloudRain className="w-8 h-8 text-blue-400" />,
  'Moderate rain': <CloudRain className="w-8 h-8 text-blue-400" />,
  'Heavy rain': <CloudRain className="w-8 h-8 text-blue-400" />,
  Showers: <CloudRain className="w-8 h-8 text-blue-400" />,
  Thunderstorm: <CloudLightning className="w-8 h-8 text-yellow-500" />,
  Snow: <Snowflake className="w-8 h-8 text-blue-200" />,
};

const SprayingStatusIcon = ({ status, className }: { status: string, className?: string }) => {
    switch (status) {
        case 'Optimal': return <CheckCircle2 className={cn("h-6 w-6", className)} />;
        case 'Moderate': return <AlertTriangle className={cn("h-6 w-6", className)} />;
        case 'Unfavourable': return <XCircle className={cn("h-6 w-6", className)} />;
        default: return null;
    }
};

const sprayingStatusConfig = {
    'Optimal': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
    'Moderate': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    'Unfavourable': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
};

const WeatherCardSkeleton = () => (
    <Card className="shadow-lg">
        <CardHeader className="pb-4">
            <Skeleton className="h-8 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex items-center justify-center space-x-6">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-12 w-28" />
                    <Skeleton className="h-5 w-24" />
                </div>
            </div>
            <div className="mt-6 pt-4 border-t">
                 <Skeleton className="h-6 w-1/3 mb-4" />
                 <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="w-full h-12 rounded-lg" />)}
                 </div>
            </div>
        </CardContent>
    </Card>
);

const WeatherPage = () => {
    const [weatherData, setWeatherData] = useState<WeatherOutput | null>(null);
    const [sprayingAdvice, setSprayingAdvice] = useState<SprayingAdvice[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const { toast } = useToast();
    const { t, language } = useLanguage();

    const fetchWeatherAndAdvice = useCallback(async (location: string | { latitude: number, longitude: number}) => {
        setLoading(true);
        setError(null);
        setWeatherData(null);
        setSprayingAdvice(null);
        
        try {
            const input = typeof location === 'string' 
                ? { city: location } 
                : { latitude: location.latitude, longitude: location.longitude };

            const data = await getWeatherAction(input);
            if (data.error) {
                setError(data.error);
                toast({
                    variant: "destructive",
                    title: "Weather Error",
                    description: data.error,
                });
                setLoading(false);
                return;
            }
            setWeatherData(data);

            if (data.forecast) {
                 try {
                    const advice = await getSprayingAdvice({ forecast: data.forecast, language });
                    setSprayingAdvice(advice);
                 } catch (adviceError) {
                     console.error("Failed to get spraying advice", adviceError);
                     toast({ variant: 'destructive', title: "AI Advice Error", description: "Could not fetch spraying recommendations."});
                 }
            }
        } catch (err) {
            console.error(err);
            const description = err instanceof Error ? err.message : t('errorWeather');
            setError(description);
        } finally {
            setLoading(false);
        }
    }, [t, toast, language]);

    const getLocation = useCallback(() => {
        if (!navigator.geolocation) {
            toast({
                variant: 'destructive',
                title: 'Geolocation Error',
                description: "Geolocation is not supported by your browser.",
            });
            fetchWeatherAndAdvice('New Delhi');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                fetchWeatherAndAdvice({ latitude: position.coords.latitude, longitude: position.coords.longitude });
            },
            () => {
                 toast({
                    variant: 'destructive',
                    title: 'Location Error',
                    description: "Unable to retrieve your location. Searching for a default city.",
                });
                fetchWeatherAndAdvice('New Delhi');
            }
        );
    }, [fetchWeatherAndAdvice, toast]);

    useEffect(() => {
        getLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            fetchWeatherAndAdvice(searchQuery.trim());
        }
    };
    
    return (
    <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
        className="space-y-6"
    >
        <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                 <form onSubmit={handleSearch} className="flex items-center gap-2 mb-2">
                    <Input 
                        placeholder={t('egAndhraPradesh')} 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10"
                    />
                    <Button type="submit" size="icon" className="h-10 w-10 shrink-0">
                        <Search className="h-5 w-5"/>
                    </Button>
                    <Button type="button" size="icon" variant="outline" onClick={getLocation} title="Get Current Location" className="h-10 w-10 shrink-0">
                        <MapPin className="h-5 w-5"/>
                    </Button>
                 </form>
                 <AnimatePresence>
                 {weatherData?.location && (
                     <motion.div initial={{opacity:0}} animate={{opacity:1}}>
                        <CardTitle className="flex items-center justify-between font-headline text-2xl pt-2">
                            <span>{t('forecastFor')} {weatherData.location}</span>
                            <Thermometer className="w-7 h-7 text-primary" />
                        </CardTitle>
                     </motion.div>
                 )}
                 </AnimatePresence>
              </CardHeader>
              <CardContent>
                {loading ? (
                    <WeatherCardSkeleton />
                ) : error || !weatherData?.forecast || weatherData.forecast.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-4 min-h-[300px]">
                         <Cloud className="w-16 h-16 text-destructive mb-4"/>
                         <CardTitle className="mb-2">Could Not Fetch Weather</CardTitle>
                         <p className="text-muted-foreground mb-4 max-w-sm">{error || t('errorWeather')}</p>
                         <Button onClick={getLocation}>
                            Try My Location Again
                         </Button>
                    </div>
                ) : (
                    <AnimatePresence>
                        <motion.div initial={{ opacity: 0}} animate={{ opacity: 1 }} transition={{ duration: 0.7 }}>
                            <div className="flex flex-col items-center justify-center text-center p-4 bg-muted/50 rounded-lg">
                                <div className="flex items-center justify-center space-x-4">
                                    {weatherIcons[weatherData.forecast[0].condition] || <Cloud className="w-16 h-16 text-gray-400" />}
                                    <div>
                                    <p className="text-6xl font-bold">{weatherData.forecast[0].temperature}</p>
                                    <p className="text-muted-foreground capitalize">{weatherData.forecast[0].condition}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t">
                                <ul className="space-y-4">
                                  {weatherData.forecast.map((item, index) => (
                                     <motion.li
                                       key={index}
                                       initial={{ opacity: 0, x: -20 }}
                                       animate={{ opacity: 1, x: 0 }}
                                       transition={{ duration: 0.3, delay: index * 0.1 }}
                                       className="flex items-center p-3 rounded-lg bg-background hover:bg-muted/50 transition-colors"
                                     >
                                       <span className="font-semibold text-base w-20">{item.day}</span>
                                       <div className="flex-shrink-0 w-10 h-10 mx-4 flex items-center justify-center">
                                         {smallWeatherIcons[item.condition] || <Cloud className="w-8 h-8 text-gray-400" />}
                                       </div>
                                       <div className="flex-1">
                                         <p className="font-medium capitalize">{item.condition}</p>
                                       </div>
                                       <div className="flex items-center gap-4 text-sm w-32 justify-end">
                                          <span className="font-bold text-lg">{item.temperature}</span>
                                          <div className="flex items-center gap-1 text-muted-foreground">
                                            <Droplet size={14}/>
                                            <span>{item.humidity}</span>
                                          </div>
                                       </div>
                                     </motion.li>
                                  ))}
                                </ul>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                )}
              </CardContent>
            </Card>

            <AnimatePresence>
                {sprayingAdvice && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                         <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="font-headline text-2xl flex items-center gap-2">
                                    <SprayCan /> Spraying Schedule
                                </CardTitle>
                                <CardDescription>Daily advice for pesticide application based on the forecast.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {sprayingAdvice.map((advice, index) => (
                                        <li key={index} className={cn("flex items-center gap-4 p-4 border rounded-lg", sprayingStatusConfig[advice.status as keyof typeof sprayingStatusConfig])}>
                                            <SprayingStatusIcon status={advice.status} className="h-8 w-8 shrink-0" />
                                            <div className="flex-1">
                                                <div className="flex justify-between items-baseline">
                                                    <span className="font-bold text-lg">{advice.day}</span>
                                                    <span className="font-semibold text-base">{advice.status}</span>
                                                </div>
                                                <p className="text-sm opacity-90">{advice.reason}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                         </Card>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    </motion.div>
  );
};

export default memo(WeatherPage);
