
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Cloud, CloudRain, Wind, MapPin, Search, Loader2, LocateFixed, Mic, Droplets } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { getTtsLanguageCode } from '@/lib/translations';
import { getWeatherAction, WeatherOutput } from '@/ai/flows/weather-api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type WeatherFormInputs = {
  location: string;
};

type SttField = 'location';

const WeatherIcon = ({ condition, className }: { condition: string; className?: string }) => {
  const lowerCaseCondition = condition.toLowerCase();
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
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<WeatherFormInputs>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<WeatherOutput | null>(null);
  const [activeSttField, setActiveSttField] = useState<SttField | null>(null);

  const { toast } = useToast();

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getWeatherAction({ lat, lon });
      setForecastData(result);
      setValue('location', result.location);
    } catch (e) {
      console.error("Weather fetch error:", e);
      const errorMessage = (e as Error).message || t('errorWeather');
      setError(errorMessage);
      toast({ variant: 'destructive', title: t('error'), description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast, setValue]);

  const getLocation = useCallback(() => {
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchWeather(position.coords.latitude, position.coords.longitude);
      },
      (geoError) => {
        console.error("Geolocation error:", geoError);
        toast({ variant: 'destructive', title: 'Location Error', description: 'Could not get your location. Defaulting to Hyderabad.' });
        fetchWeather(17.3850, 78.4867); // Fallback to Hyderabad
      }
    );
  }, [fetchWeather, toast]);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  const onRecognitionResult = useCallback((result: string) => {
    if (activeSttField === 'location') {
      setValue('location', result, { shouldValidate: true });
    }
  }, [activeSttField, setValue]);

  const { isListening, startListening, stopListening, isSupported } = useSpeechRecognition({
    onResult: onRecognitionResult,
    onError: (err) => toast({ variant: 'destructive', title: 'Speech Error', description: err }),
    onEnd: () => setActiveSttField(null),
  });

  const handleSttToggle = (field: SttField) => {
    if (isListening) {
      stopListening();
    } else {
      setActiveSttField(field);
      startListening(getTtsLanguageCode(t('en'))); // Assuming 'en' is a valid key
    }
  };

  const onWeatherSubmit: SubmitHandler<WeatherFormInputs> = (data) => {
    toast({ title: 'Manual Search', description: 'Manual text search is not implemented. Please use the geolocation button.' });
    getLocation();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <Card className="bg-background">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">{t('weatherForecast')}</CardTitle>
          <CardDescription>{t('weatherInstruction')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onWeatherSubmit)} className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-full flex-grow space-y-2">
              <Label htmlFor="location" className="sr-only">{t('location')}</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder={isLoading ? "Getting location..." : "Enter location"}
                  className="pl-10 pr-20"
                  {...register('location')}
                  disabled
                />
                <div className='absolute right-1 top-1/2 -translate-y-1/2 flex items-center'>
                  <Button type="button" size="icon" variant="ghost" onClick={() => handleSttToggle('location')} className="h-8 w-8" disabled={!isSupported}>
                    <Mic className={`h-5 w-5 ${isListening && activeSttField === 'location' ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                  </Button>
                  <Button type='button' variant='ghost' size='icon' className='h-8 w-8' onClick={getLocation}>
                    <LocateFixed className='h-5 w-5 text-muted-foreground' />
                  </Button>
                </div>
              </div>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              <Search className="h-4 w-4" />
              <span className="ml-2">{t('search')}</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      <AnimatePresence>
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : error ? (
            <Alert variant="destructive">
              <AlertTitle>{t('error')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
        ) : forecastData && (
          <motion.div
            key={forecastData.location}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-background">
              <CardHeader>
                <CardTitle className="font-headline text-xl">{t('forecastFor')} {forecastData.location}</CardTitle>
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
