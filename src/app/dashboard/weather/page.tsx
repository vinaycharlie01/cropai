
'use client';

import { useState, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Cloud, CloudRain, Wind, MapPin, Search, Loader2, Mic } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { getTtsLanguageCode } from '@/lib/translations';

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
  return <Cloud className={className} />;
};

const mockForecast = [
    { day: "Mon", temperature: "32°C", condition: "Sunny", humidity: "45%" },
    { day: "Tue", temperature: "34°C", condition: "Sunny", humidity: "48%" },
    { day: "Wed", temperature: "35°C", condition: "Partly Cloudy", humidity: "55%" },
    { day: "Thu", temperature: "33°C", condition: "Showers", humidity: "70%" },
    { day: "Fri", temperature: "31°C", condition: "Cloudy", humidity: "65%" },
];


export default function WeatherPage() {
  const { t, language } = useLanguage();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<WeatherFormInputs>({
    defaultValues: { location: "Hyderabad" }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [displayLocation, setDisplayLocation] = useState("Hyderabad");
  const [activeSttField, setActiveSttField] = useState<SttField | null>(null);

  const { toast } = useToast();

  const onRecognitionResult = useCallback((result: string) => {
    if (activeSttField) {
      setValue(activeSttField, result, { shouldValidate: true });
    }
  }, [activeSttField, setValue]);

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
    if (isListening && activeSttField === field) {
        stopListening();
    } else {
        setActiveSttField(field);
        const ttsLang = getTtsLanguageCode(language);
        startListening(ttsLang);
    }
  };

  const onWeatherSubmit: SubmitHandler<WeatherFormInputs> = async (data) => {
    setIsLoading(true);
    // Simulate a network request
    await new Promise(resolve => setTimeout(resolve, 500));
    setDisplayLocation(data.location);
    setIsLoading(false);
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
                    placeholder="Enter location"
                    className="pl-10"
                    {...register('location')}
                  />
                  <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleSttToggle('location')}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      disabled={!isSupported}
                  >
                      <Mic className={`h-5 w-5 ${isListening && activeSttField === 'location' ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                  </Button>
                </div>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-2">{t('search')}</span>
              </Button>
            </form>
          </CardContent>
        </Card>

      <AnimatePresence>
        <motion.div
            key={displayLocation} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <Card className="bg-background">
                <CardHeader>
                    <CardTitle className="font-headline text-xl">{t('forecastFor')} {displayLocation}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                      {mockForecast.map((day, index) => (
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
                                      <Wind className="w-3 h-3" />
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
      </AnimatePresence>
    </motion.div>
  );
}

