
'use client';

import React, { useState, useEffect, memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sun,
  Cloud,
  CloudRain,
  Thermometer,
  Wind,
  Sunrise,
  Sunset,
  Loader2,
  MapPin,
  CloudLightning,
  Snowflake,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getWeatherAction } from '@/ai/flows/weather-tool';
import { Skeleton } from '@/components/ui/skeleton';
import type { WeatherOutput } from '@/ai/schemas/weather-schemas';
import { Input } from '@/components/ui/input';

const weatherIcons: { [key: string]: React.ReactNode } = {
  Sunny: <Sun className="w-16 h-16 text-yellow-400" />,
  Cloudy: <Cloud className="w-16 h-16 text-gray-400" />,
  Rainy: <CloudRain className="w-16 h-16 text-blue-400" />,
  Thunderstorm: <CloudLightning className="w-16 h-16 text-gray-600" />,
  Snowy: <Snowflake className="w-16 h-16 text-blue-200" />,
};

const WeatherCardSkeleton = () => (
    <Card className="shadow-lg h-full">
        <CardHeader>
            <Skeleton className="h-6 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-center space-x-4">
                <Skeleton className="w-16 h-16 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-12 w-24" />
                    <Skeleton className="h-4 w-20" />
                </div>
            </div>
            <div className="flex justify-around">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
            </div>
             <div className="mt-6">
                 <Skeleton className="h-6 w-1/2 mb-2" />
                 <div className="flex justify-between">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="w-10 h-20" />)}
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

    const fetchWeather = useCallback(async (params: { latitude?: number, longitude?: number, city?: string }) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getWeatherAction(params);
            if (data?.error) {
              setError(data.error);
              setWeatherData(null);
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
            setWeatherData(null);
            toast({
                variant: 'destructive',
                title: 'Weather Error',
                description,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const getLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser.");
            setLoading(false);
            // Fallback to a default location
            fetchWeather({ city: 'Nagpur' });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                fetchWeather({ latitude: position.coords.latitude, longitude: position.coords.longitude });
            },
            () => {
                setError("Unable to retrieve your location. Please grant permission or search for a city.");
                // Fallback to a default location if geolocation fails
                fetchWeather({ city: 'Nagpur' });
            }
        );
    }, [fetchWeather]);

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
    
    if (loading) {
        return <WeatherCardSkeleton />;
    }
    
    return (
    <Card className="shadow-lg h-full">
      <CardHeader className="pb-2">
         <form onSubmit={handleSearch} className="flex items-center gap-2 mb-2">
            <Input 
                placeholder="Search city..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
            />
            <Button type="submit" size="icon" variant="ghost" className="h-9 w-9">
                <Search className="h-4 w-4"/>
            </Button>
            <Button type="button" size="icon" variant="ghost" onClick={getLocation} title="Get Current Location" className="h-9 w-9">
                <MapPin className="h-4 w-4"/>
            </Button>
         </form>
         {weatherData && weatherData.location && (
             <CardTitle className="flex items-center justify-between font-headline">
              <span>{weatherData.location}</span>
              <Thermometer className="w-6 h-6 text-primary" />
            </CardTitle>
         )}
      </CardHeader>
      <CardContent>
        {error && !weatherData && (
            <div className="flex flex-col items-center justify-center text-center p-4 h-full">
                 <MapPin className="w-12 h-12 text-destructive mb-4"/>
                 <CardTitle className="mb-2">Location Error</CardTitle>
                 <p className="text-muted-foreground mb-4">{error}</p>
                 <Button onClick={getLocation}>
                    Try Again
                 </Button>
            </div>
        )}
        {weatherData && weatherData.condition && weatherData.temperature && weatherData.forecast && (
            <>
                <div className="flex flex-col items-center text-center space-y-4">
                <div className="flex items-center justify-center space-x-4">
                    {weatherIcons[weatherData.condition]}
                    <div>
                    <p className="text-6xl font-bold">{weatherData.temperature}</p>
                    <p className="text-muted-foreground">{weatherData.condition}</p>
                    </div>
                </div>
                <div className="flex justify-around w-full text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                    <Wind size={16} /> {weatherData.wind}
                    </div>
                    <div className="flex items-center gap-1">
                    <Sunrise size={16} /> {weatherData.sunrise}
                    </div>
                    <div className="flex items-center gap-1">
                    <Sunset size={16} /> {weatherData.sunset}
                    </div>
                </div>
                </div>
                <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2 text-primary">
                    5-Day Forecast
                </h3>
                <div className="flex justify-between text-center">
                    {weatherData.forecast.map((item) => (
                    <div
                        key={item.day}
                        className="flex flex-col items-center space-y-1"
                    >
                        <p className="font-medium">{item.day}</p>
                        <div className="text-2xl">
                        {weatherIcons[item.condition] &&
                            (
                            <div className="w-8 h-8 flex items-center justify-center">
                                {React.cloneElement(weatherIcons[item.condition] as React.ReactElement, { className: "w-8 h-8" })}
                            </div>
                            )
                        }
                        </div>
                        <p className="text-sm">{item.temp}</p>
                    </div>
                    ))}
                </div>
                </div>
            </>
        )}
      </CardContent>
    </Card>
  );
};

export default memo(WeatherPage);
