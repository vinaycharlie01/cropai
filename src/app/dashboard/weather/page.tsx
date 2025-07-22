
'use client';

import React, { useState, useEffect, memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Sun,
  Cloud,
  CloudRain,
  Thermometer,
  Wind,
  Sunrise,
  Sunset,
  MapPin,
  CloudLightning,
  Snowflake,
  Search,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getWeatherAction } from '@/ai/flows/weather-api';
import { Skeleton } from '@/components/ui/skeleton';
import type { WeatherOutput } from '@/types/weather';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';


const weatherIcons: { [key: string]: React.ReactNode } = {
  Sunny: <Sun className="w-10 h-10 text-yellow-400" />,
  Cloudy: <Cloud className="w-10 h-10 text-gray-400" />,
  Rainy: <CloudRain className="w-10 h-10 text-blue-400" />,
  Thunderstorm: <CloudLightning className="w-10 h-10 text-gray-600" />,
  Snowy: <Snowflake className="w-10 h-10 text-blue-200" />,
};


const WeatherCardSkeleton = () => (
    <Card className="shadow-lg h-full">
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
            <div className="flex justify-around pt-4">
                {[...Array(3)].map((_, i) => (
                     <div key={i} className="flex flex-col items-center space-y-1">
                        <Skeleton className="h-6 w-6" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                ))}
            </div>
             <div className="mt-6 pt-4 border-t">
                 <Skeleton className="h-6 w-1/3 mb-4" />
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="w-full h-28 rounded-lg" />)}
                 </div>
            </div>
        </CardContent>
    </Card>
);

const WeatherPage = () => {
    const [weatherData, setWeatherData] = useState<WeatherOutput | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const { toast } = useToast();
    const { t } = useLanguage();

    const fetchWeather = useCallback(async (params: { latitude?: number, longitude?: number, city?: string }) => {
        setLoading(true);
        setError(null);
        setWeatherData(null);
        
        try {
            const data = await getWeatherAction(params);
            if (data?.error) {
              setError(data.error);
              return;
            }
            
            if(data?.location){
                data.location = data.location.split(',')[0]; // Just take the city part.
            }
            setWeatherData(data);

        } catch (err) {
            console.error(err);
            const description = err instanceof Error ? err.message : 'Could not fetch weather data from the server.';
            setError(description);
        } finally {
            setLoading(false);
        }
    }, []);

    const getLocation = useCallback(() => {
        if (!navigator.geolocation) {
            toast({
                variant: 'destructive',
                title: 'Geolocation Error',
                description: "Geolocation is not supported by your browser.",
            });
            fetchWeather({ city: 'New Delhi' });
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
                fetchWeather({ city: 'New Delhi' });
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
            fetchWeather({ city: searchQuery.trim() });
        }
    };
    
    if (loading && !error) {
        return <WeatherCardSkeleton />;
    }
    
    return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
    <Card className="shadow-lg h-full">
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
         {weatherData && weatherData.location && (
             <CardTitle className="flex items-center justify-between font-headline text-2xl pt-2">
              <span>{weatherData.location}</span>
              <Thermometer className="w-7 h-7 text-primary" />
            </CardTitle>
         )}
      </CardHeader>
      <CardContent>
        {error && !weatherData && (
            <div className="flex flex-col items-center justify-center text-center p-4 min-h-[300px]">
                 <Cloud className="w-16 h-16 text-destructive mb-4"/>
                 <CardTitle className="mb-2">Could Not Fetch Weather</CardTitle>
                 <p className="text-muted-foreground mb-4 max-w-sm">{error}</p>
                 <Button onClick={getLocation}>
                    Try My Location Again
                 </Button>
            </div>
        )}
        <AnimatePresence>
        {weatherData && weatherData.condition && weatherData.temperature && weatherData.forecast && (
            <motion.div initial={{ opacity: 0}} animate={{ opacity: 1 }} transition={{ duration: 0.7 }}>
                <div className="flex flex-col md:flex-row items-center justify-center text-center md:text-left gap-6 md:gap-10 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center space-x-4">
                        {weatherIcons[weatherData.condition]}
                        <div>
                        <p className="text-6xl font-bold">{weatherData.temperature}</p>
                        <p className="text-muted-foreground capitalize">{weatherData.condition}</p>
                        </div>
                    </div>
                    <div className="flex justify-around w-full md:w-auto md:flex-col text-sm text-muted-foreground gap-4">
                        <div className="flex items-center gap-2">
                        <Wind size={16} /> {weatherData.wind}
                        </div>
                        <div className="flex items-center gap-2">
                        <Sunrise size={16} /> {weatherData.sunrise}
                        </div>
                        <div className="flex items-center gap-2">
                        <Sunset size={16} /> {weatherData.sunset}
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t">
                    <CardTitle className="font-headline text-xl mb-4">5-Day Forecast</CardTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {weatherData.forecast.map((item, index) => {
                            return (
                            <Card key={index} className="flex flex-col items-center justify-center p-4 text-center bg-background hover:shadow-md transition-shadow">
                                <p className="font-bold text-lg">{item.day}</p>
                                <div className="my-3 flex justify-center">{weatherIcons[item.condition]}</div>
                                <p className="text-2xl font-bold">{item.temp}</p>
                            </Card>
                        )})}
                    </div>
                </div>
            </motion.div>
        )}
        </AnimatePresence>
      </CardContent>
    </Card>
    </motion.div>
  );
};

export default memo(WeatherPage);
