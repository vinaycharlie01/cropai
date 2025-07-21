
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Cloud, CloudRain, Wind, Droplets, MapPin, Search, Loader2, Mic, LocateFixed } from 'lucide-react';

import { WeatherForecastOutput, DailyForecast } from '@/ai/flows/weather-forecast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { getTtsLanguageCode } from '@/lib/translations';
import { cn } from '@/lib/utils';

type WeatherFormInputs = {
  location: string;
};

type SttField = 'location';

// Mock data to ensure page stability
const createMockForecastData = (location: string): WeatherForecastOutput => ({
    location: location,
    forecast: [
        { day: "Mon", temperature: "32°C", condition: "Sunny", humidity: "45%" },
        { day: "Tue", temperature: "34°C", condition: "Sunny", humidity: "48%" },
        { day: "Wed", temperature: "33°C", condition: "Partly Cloudy", humidity: "55%" },
        { day: "Thu", temperature: "31°C", condition: "Showers", humidity: "65%" },
        { day: "Fri", temperature: "30°C", condition: "Thunderstorm", humidity: "70%" },
    ]
});

const WeatherIcon = ({ condition, className }: { condition: string; className?: string }) => {
  const lowerCaseCondition = condition.toLowerCase();
  if (lowerCaseCondition.includes('sun') || lowerCaseCondition.includes('clear')) {
    return <Sun className={className} />;
  }
  if (lowerCaseCondition.includes('rain') || lowerCaseCondition.includes('drizzle') || lowerCaseCondition.includes('shower') || lowerCaseCondition.includes('thunderstorm')) {
    return <CloudRain className={className} />;
  }
  if (lowerCaseCondition.includes('wind')) {
    return <Wind className={className} />;
  }
  return <Cloud className={className} />;
};

export default function WeatherPage() {
  const { t, language } = useLanguage();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<WeatherFormInputs>();
  
  const [forecastData, setForecastData] = useState<WeatherForecastOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSttField, setActiveSttField] = useState<SttField | null>(null);

  const { toast } = useToast();

  const onRecognitionResult = useCallback((result: string) => {
    setValue('location', result, { shouldValidate: true });
    handleSubmit(onSubmit)();
  }, [setValue, handleSubmit]);

  const onRecognitionError = useCallback((err: string) => {
      console.error(err);
      toast({ variant: 'destructive', title: t('error'), description: 'Speech recognition failed.' });
  }, [t, toast]);

  const { isListening, startListening, stopListening, isSupported } = useSpeechRecognition({
    onResult: onRecognitionResult,
    onError: onRecognitionError,
    onEnd: () => setActiveSttField(null),
  });

  const handleSttToggle = (field: SttField) => {
    if (isListening) {
      stopListening();
    } else {
      setActiveSttField(field);
      startListening(getTtsLanguageCode(language));
    }
  };

  const fetchWeather = useCallback(async (location: string) => {
    setIsLoading(true);
    setError(null);
    setForecastData(null);

    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
    const mockData = createMockForecastData(location);
    setForecastData(mockData);
    setValue('location', location);
    setIsLoading(false);
  }, [setValue]);

  useEffect(() => {
    // Set initial location
    fetchWeather("Hyderabad");
  }, [fetchWeather]);

  const onSubmit: SubmitHandler<WeatherFormInputs> = async (data) => {
    if(data.location){
        fetchWeather(data.location);
    }
  };
  
  const handleCurrentLocation = () => {
      fetchWeather("My Current Location"); // Simulate getting current location
      toast({title: "Location Updated", description: "Using your current location for the forecast."});
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <Card className="bg-background">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">{t('weatherForecast')}</CardTitle>
            <CardDescription>{t('weatherInstruction')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-full flex-grow space-y-2">
                <Label htmlFor="location" className="sr-only">{t('location')}</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="location"
                    placeholder="Enter a location..."
                    className="pl-10 pr-20"
                    {...register('location')}
                  />
                  <div className='absolute right-1 top-1/2 -translate-y-1/2 flex items-center'>
                     <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleSttToggle('location')}
                        className="h-8 w-8"
                        disabled={!isSupported}
                    >
                        <Mic className={`h-5 w-5 ${isListening ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button type='button' variant='ghost' size='icon' className='h-8 w-8' onClick={handleCurrentLocation}>
                        <LocateFixed className='h-5 w-5 text-muted-foreground'/>
                    </Button>
                  </div>
                </div>
                {errors.location && <p className="text-destructive text-sm">{errors.location.message}</p>}
              </div>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-2">{t('search')}</span>
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div variants={itemVariants} initial="hidden" animate="visible" exit="hidden">
            <Alert variant="destructive">
              <AlertTitle>{t('error')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
      
      {isLoading ? (
          <Card>
              <CardHeader>
                  <div className="h-6 w-1/2 bg-muted rounded animate-pulse"></div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[...Array(5)].map((_, i) => (
                        <Card key={i} className="bg-muted/30 text-center h-full flex flex-col justify-between p-2">
                          <div className="h-5 w-1/2 mx-auto bg-muted rounded animate-pulse mb-2"></div>
                          <div className="w-16 h-16 mx-auto bg-muted rounded-full animate-pulse mb-2"></div>
                          <div className="h-8 w-1/3 mx-auto bg-muted rounded animate-pulse mb-2"></div>
                          <div className="h-4 w-2/3 mx-auto bg-muted rounded animate-pulse mb-2"></div>
                          <div className="h-4 w-1/2 mx-auto bg-muted rounded animate-pulse"></div>
                        </Card>
                  ))}
              </CardContent>
          </Card>
      ) : forecastData && (
        <motion.div variants={itemVariants}>
          <Card className="bg-background">
              <CardHeader>
                  <CardTitle className="font-headline text-xl">{t('forecastFor')} {forecastData.location}</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {forecastData.forecast.slice(0, 5).map((day, index) => (
                      <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                      >
                          <Card className="bg-muted/30 text-center hover:shadow-lg transition-shadow h-full flex flex-col justify-between">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base md:text-lg">{day.day}</CardTitle>
                              </CardHeader>
                              <CardContent className="flex flex-col items-center gap-2 p-2 md:p-6">
                                <WeatherIcon condition={day.condition} className="w-12 h-12 md:w-16 md:h-16 text-primary" />
                                <p className="text-2xl md:text-3xl font-bold">{day.temperature}</p>
                                <p className="text-muted-foreground text-xs md:text-sm capitalize">{day.condition}</p>
                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                    <Droplets className="w-4 h-4" />
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
    </motion.div>
  );
}
