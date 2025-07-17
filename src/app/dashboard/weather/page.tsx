'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Cloud, CloudRain, CloudSnow, Wind, Droplets, MapPin, Search, Loader2 } from 'lucide-react';

import { getWeatherForecast, WeatherForecastOutput } from '@/ai/flows/weather-forecast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type FormInputs = {
  location: string;
};

const WeatherIcon = ({ condition, className }: { condition: string; className?: string }) => {
  const lowerCaseCondition = condition.toLowerCase();
  if (lowerCaseCondition.includes('sun') || lowerCaseCondition.includes('clear')) {
    return <Sun className={className} />;
  }
  if (lowerCaseCondition.includes('rain')) {
    return <CloudRain className={className} />;
  }
  if (lowerCaseCondition.includes('snow')) {
    return <CloudSnow className={className} />;
  }
  if (lowerCaseCondition.includes('wind')) {
    return <Wind className={className} />;
  }
  return <Cloud className={className} />;
};

export default function WeatherPage() {
  const { t } = useLanguage();
  const { register, handleSubmit, formState: { errors } } = useForm<FormInputs>();
  const [forecast, setForecast] = useState<WeatherForecastOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    setIsLoading(true);
    setError(null);
    setForecast(null);
    try {
      const result = await getWeatherForecast({ location: data.location });
      setForecast(result);
    } catch (e) {
      console.error(e);
      setError(t('errorWeather'));
    } finally {
      setIsLoading(false);
    }
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
          <form onSubmit={handleSubmit(onSubmit)} className="flex items-start gap-4">
            <div className="flex-grow space-y-2">
              <Label htmlFor="location" className="sr-only">{t('location')}</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder={t('egAndhraPradesh')}
                  className="pl-10"
                  {...register('location', { required: t('locationRequired') })}
                />
              </div>
              {errors.location && <p className="text-destructive text-sm">{errors.location.message}</p>}
            </div>
            <Button type="submit" disabled={isLoading} className="h-10">
              {isLoading ? <Loader2 className="animate-spin" /> : <Search />}
              <span className="ml-2 hidden md:inline">{t('getForecast')}</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Alert variant="destructive">
              <AlertTitle>{t('error')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {forecast && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="bg-background">
                <CardHeader>
                    <CardTitle className="font-headline text-xl">{t('forecastFor')} {forecast.forecast.length > 0 ? '' : 'your location'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {forecast.forecast.map((day, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="bg-muted/30 text-center hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-lg">{day.day}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center gap-3">
                                  <WeatherIcon condition={day.condition} className="w-16 h-16 text-primary" />
                                  <p className="text-3xl font-bold">{day.temperature}</p>
                                  <p className="text-muted-foreground">{day.condition}</p>
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
      </AnimatePresence>
    </motion.div>
  );
}
