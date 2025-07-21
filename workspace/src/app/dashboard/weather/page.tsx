
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Cloud, CloudRain, Wind, Droplets, MapPin, Loader2, LocateFixed } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getWeatherAction, type WeatherOutput } from '@/ai/flows/weather-api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const WeatherIcon = ({ condition, className }: { condition: string; className?: string }) => {
  const lowerCaseCondition = condition?.toLowerCase() || '';
  if (lowerCaseCondition.includes('sun') || lowerCaseCondition.includes('clear')) {
    return <Sun className={className} />;
  }
  if (lowerCaseCondition.includes('rain') || lowerCaseCondition.includes('drizzle') || lowerCaseCondition.includes('shower')) {
    return <CloudRain className={className} />;
  }
  if (lowerCaseCondition.includes('wind')) {
    return <Wind className={className} />;
  }
  return <Cloud className={className} />;
};

export default function WeatherPage() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<WeatherOutput | null>(null);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getWeatherAction({ lat, lon });
      setForecastData(result);
    } catch (e) {
      const errorMessage = (e as Error).message || t('errorWeather');
      setError(errorMessage);
      toast({ variant: 'destructive', title: t('error'), description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  const handleGetLocation = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setForecastData(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchWeather(position.coords.latitude, position.coords.longitude);
      },
      (geoError) => {
        console.error("Geolocation error:", geoError);
        const errorMessage = "Could not get your location. Please enable location services and try again.";
        setError(errorMessage);
        toast({ variant: 'destructive', title: 'Location Error', description: errorMessage });
        setIsLoading(false);
      }
    );
  }, [fetchWeather, toast]);

  useEffect(() => {
    handleGetLocation();
  }, [handleGetLocation]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <Card className="bg-background">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline text-2xl">{t('weatherForecast')}</CardTitle>
            <CardDescription>{t('weatherInstruction')}</CardDescription>
          </div>
          <Button onClick={handleGetLocation} variant="outline" size="icon" disabled={isLoading}>
            <LocateFixed className="h-5 w-5" />
          </Button>
        </CardHeader>
      </Card>

      <AnimatePresence>
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : error ? (
            <Alert variant="destructive">
              <AlertTitle>{t('error')}</AlertTitle>
              <AlertDescription>
                {error}
                <Button onClick={handleGetLocation} variant="link" className="p-0 h-auto ml-2">Try Again</Button>
              </AlertDescription>
            </Alert>
        ) : forecastData && (
          <motion.div
            key={forecastData.location}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" /> Location</p>
                            <h2 className="text-2xl font-bold">{forecastData.location}</h2>
                        </div>
                        <div className="text-right">
                             <p className="text-muted-foreground">Current</p>
                             <p className="text-2xl font-bold">{forecastData.current.temp_c}°C</p>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card className="bg-background">
              <CardHeader>
                <CardTitle className="font-headline text-xl">5-Day Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {forecastData.forecast.map((day, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="bg-muted/30 text-center hover:shadow-lg transition-shadow h-full flex flex-col justify-between p-2">
                        <CardHeader className="p-2 pb-0">
                          <CardTitle className="text-base font-semibold">{day.day}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-1 p-2">
                          <WeatherIcon condition={day.condition} className="w-12 h-12 text-primary" />
                          <p className="text-2xl font-bold">{day.temperature}</p>
                          <p className="text-muted-foreground text-xs text-center line-clamp-1">{day.condition}</p>
                          <div className="flex items-center gap-1 text-muted-foreground text-xs">
                            <Droplets className="w-3 h-3" />
                            <span>{day.humidity}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
