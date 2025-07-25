
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
  Bot,
  SprayCan,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getWeatherAction } from '@/ai/flows/weather-api';
import type { WeatherOutput } from '@/types/weather';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';


const weatherIcons: { [key: string]: React.ReactNode } = {
  Sunny: <Sun className="w-16 h-16 text-yellow-400" />,
  'Partly Cloudy': <Cloud className="w-16 h-16 text-gray-400" />,
  'Partly cloudy': <Cloud className="w-16 h-16 text-gray-400" />,
  Cloudy: <Cloud className="w-16 h-16 text-gray-400" />,
  'Overcast': <Cloud className="w-16 h-16 text-gray-500" />,
  Rain: <CloudRain className="w-16 h-16 text-blue-400" />,
  Showers: <CloudRain className="w-16 h-16 text-blue-400" />,
  'Light rain': <CloudRain className="w-16 h-16 text-blue-400" />,
  'Light rain shower': <CloudRain className="w-16 h-16 text-blue-400" />,
  'Patchy rain nearby': <CloudRain className="w-16 h-16 text-blue-400" />,
  'Moderate rain': <CloudRain className="w-16 h-16 text-blue-400" />,
  'Heavy rain': <CloudRain className="w-16 h-16 text-blue-400" />,
  Thunderstorm: <CloudLightning className="w-16 h-16 text-yellow-500" />,
  'Thundery outbreaks in nearby': <CloudLightning className="w-16 h-16 text-yellow-500" />,
  Snow: <Snowflake className="w-16 h-16 text-blue-200" />,
  Mist: <Cloud className="w-16 h-16 text-gray-300" />,
  Fog: <Cloud className="w-16 h-16 text-gray-300" />,
};

const smallWeatherIcons: { [key: string]: React.ReactNode } = Object.entries(weatherIcons).reduce((acc, [key, icon]) => {
    acc[key] = React.cloneElement(icon as React.ReactElement, { className: 'w-8 h-8' });
    return acc;
}, {} as { [key: string]: React.ReactNode });

const WeatherCardSkeleton = () => (
    <Card className="shadow-lg">
        <CardHeader className="pb-4">
            <Skeleton className="h-8 w-3/4" />
             <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex items-center justify-center space-x-6 p-4 bg-muted/50 rounded-lg">
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
             <div className="mt-6 pt-4 border-t">
                <Skeleton className="h-6 w-1/3 mb-4" />
                <Skeleton className="h-16 w-full" />
            </div>
        </CardContent>
    </Card>
);

const WeatherPage = () => {
    const [weatherData, setWeatherData] = useState<WeatherOutput | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { toast } = useToast();
    const { t } = useLanguage();

    const fetchWeather = useCallback(async (location: string | { latitude: number, longitude: number}) => {
        setLoading(true);
        setWeatherData(null);
        
        try {
            const input = typeof location === 'string' 
                ? { city: location } 
                : { latitude: location.latitude, longitude: location.longitude };

            const data = await getWeatherAction(input);
            
            if (data.error && !data.forecast) {
                 toast({
                    variant: "destructive",
                    title: "Weather Error",
                    description: data.error,
                });
            }
            setWeatherData(data);

        } catch (err) {
            console.error(err);
            const description = err instanceof Error ? err.message : t('errorWeather');
            setWeatherData({ error: description });
        } finally {
            setLoading(false);
        }
    }, [t, toast]);

    const getLocation = useCallback(() => {
        if (!navigator.geolocation) {
            toast({
                variant: 'destructive',
                title: 'Geolocation Error',
                description: "Geolocation is not supported by your browser.",
            });
            fetchWeather('New Delhi');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                fetchWeather({ latitude: position.coords.latitude, longitude: position.coords.longitude });
            },
            () => {
                 toast({
                    variant: 'destructive',
                    title: 'Location Error',
                    description: "Unable to retrieve your location. Searching for a default city.",
                });
                fetchWeather('New Delhi');
            }
        );
    }, [fetchWeather, toast]);

    useEffect(() => {
        getLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            fetchWeather(searchQuery.trim());
        }
    };
    
    return (
    <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
        className="space-y-6"
    >
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
             <form onSubmit={handleSearch} className="flex items-center gap-2 mb-2">
                <Input 
                    placeholder={t('egAndhraPradesh')} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10"
                />
                <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5"/>}
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
                    {weatherData.overallOutlook && <CardDescription>{weatherData.overallOutlook}</CardDescription>}
                 </motion.div>
             )}
             </AnimatePresence>
          </CardHeader>
          <CardContent>
            {loading ? (
                <WeatherCardSkeleton />
            ) : !weatherData?.forecast || weatherData.forecast.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-4 min-h-[300px]">
                     <Cloud className="w-16 h-16 text-destructive mb-4"/>
                     <CardTitle className="mb-2">Could Not Fetch Weather</CardTitle>
                     <p className="text-muted-foreground mb-4 max-w-sm">{weatherData?.error || t('errorWeather')}</p>
                     <Button onClick={getLocation}>
                        Try My Location Again
                     </Button>
                </div>
            ) : (
                <AnimatePresence>
                    <motion.div initial={{ opacity: 0}} animate={{ opacity: 1 }} transition={{ duration: 0.7 }} className="space-y-8">
                        <div className="flex flex-col items-center justify-center text-center p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center justify-center space-x-4">
                                {weatherIcons[weatherData.forecast[0].condition] || <Cloud className="w-16 h-16 text-gray-400" />}
                                <div>
                                <p className="text-6xl font-bold">{weatherData.forecast[0].temperature}</p>
                                <p className="text-muted-foreground capitalize">{weatherData.forecast[0].condition}</p>
                                </div>
                            </div>
                        </div>
                        
                        {weatherData.sprayingAdvisory && (
                             <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2"><Bot /> AI Spraying Advisory</CardTitle>
                                </CardHeader>
                                <CardContent className="flex items-start gap-4">
                                     <SprayCan className="h-8 w-8 text-blue-500 mt-1 flex-shrink-0" />
                                     <p className="text-sm text-blue-900 dark:text-blue-100">{weatherData.sprayingAdvisory}</p>
                                </CardContent>
                            </Card>
                        )}
                        

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
                                   <span className="font-semibold text-base w-24">{item.day}</span>
                                   <div className="flex-shrink-0 w-10 h-10 mx-4 flex items-center justify-center">
                                     {smallWeatherIcons[item.condition] || <Cloud className="w-8 h-8 text-gray-400" />}
                                   </div>
                                   <div className="flex-1">
                                     <p className="font-medium capitalize">{item.condition}</p>
                                   </div>
                                   <div className="grid grid-cols-3 gap-2 text-sm w-48 text-right">
                                      <span className="font-bold text-lg">{item.temperature}</span>
                                      <div className="flex items-center gap-1 text-muted-foreground justify-end">
                                        <Droplet size={14}/>
                                        <span>{item.humidity}</span>
                                      </div>
                                       <div className="flex items-center gap-1 text-muted-foreground justify-end">
                                        <Wind size={14}/>
                                        <span>{item.wind_kph}</span>
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
    </motion.div>
  );
};

export default memo(WeatherPage);
