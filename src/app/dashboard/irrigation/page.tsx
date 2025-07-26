
'use client';

import { useState, useCallback } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Droplets, Loader2, Search, Wind, Sun, Cloud, CloudRain, Mic } from 'lucide-react';

import { getIrrigationAdvice, IrrigationAdviceOutput } from '@/ai/flows/irrigation-advice';
import { generateSpeech } from '@/ai/flows/tts-flow';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { getTtsLanguageCode } from '@/lib/translations';
import { AudioPlayer } from '@/components/AudioPlayer';

type FormInputs = {
  cropType: string;
  location: string;
  soilType: string;
  currentWeather: string;
};

type SttField = 'cropType' | 'location';

const soilTypes = ['sandy', 'clay', 'loam', 'silt', 'peat'];
const weatherConditions = ['sunny', 'cloudy', 'windy', 'recentRain'];

export default function IrrigationPage() {
  const { t, language } = useLanguage();
  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<FormInputs>();
  const [advice, setAdvice] = useState<IrrigationAdviceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [activeSttField, setActiveSttField] = useState<SttField | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

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

  const getAudio = useCallback(async (textToSpeak: string) => {
    setIsAudioLoading(true);
    try {
      const response = await generateSpeech({ text: textToSpeak, language });
      setAudioSrc(response.audioDataUri);
    } catch (err) {
      console.error('TTS Generation Error:', err);
      toast({
        variant: 'destructive',
        title: 'Audio Error',
        description: 'Failed to generate audio for this text.',
      });
    } finally {
      setIsAudioLoading(false);
    }
  }, [language, toast]);

  const handlePlaybackRequest = () => {
    if (advice) {
        const textToSpeak = `Recommendation: ${advice.recommendation}. Reasoning: ${advice.reasoning}. Suggested Amount: ${advice.amount}.`;
        getAudio(textToSpeak);
    }
  };

  const handleSttToggle = (field: SttField) => {
    if (isListening && activeSttField === field) {
        stopListening();
    } else {
        setActiveSttField(field);
        const ttsLang = getTtsLanguageCode(language);
        startListening(ttsLang);
    }
  };


  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    setIsLoading(true);
    setError(null);
    setAdvice(null);
    setAudioSrc(null);

    try {
      const result = await getIrrigationAdvice({ ...data, language });
      setAdvice(result);
      const textToSpeak = `Recommendation: ${result.recommendation}. Reasoning: ${result.reasoning}. Suggested Amount: ${result.amount}.`;
      getAudio(textToSpeak);
    } catch (e) {
      console.error(e);
      setError(t('errorGettingAdvice'));
      toast({ variant: 'destructive', title: t('error'), description: t('errorGettingAdvice') });
    } finally {
      setIsLoading(false);
    }
  };
  
  const WeatherIcon = ({ weather }: { weather: string }) => {
    switch (weather) {
      case 'sunny': return <Sun className="mr-2" />;
      case 'cloudy': return <Cloud className="mr-2" />;
      case 'windy': return <Wind className="mr-2" />;
      case 'recentRain': return <CloudRain className="mr-2" />;
      default: return null;
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
          <CardTitle className="font-headline text-2xl">{t('smartIrrigation')}</CardTitle>
          <CardDescription>{t('irrigationInstruction')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
             <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="cropType">{t('cropType')}</Label>
                    <div className="relative">
                      <Input id="cropType" placeholder={t('egTomato')} {...register('cropType', { required: t('cropTypeRequired') })} />
                       <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleSttToggle('cropType')}
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                          disabled={!isSupported}
                      >
                          <Mic className={`h-5 w-5 ${isListening && activeSttField === 'cropType' ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                      </Button>
                    </div>
                    {errors.cropType && <p className="text-destructive text-sm">{errors.cropType.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="location">{t('location')}</Label>
                     <div className="relative">
                      <Input id="location" placeholder={t('egAndhraPradesh')} {...register('location', { required: t('locationRequired') })} />
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
                    {errors.location && <p className="text-destructive text-sm">{errors.location.message}</p>}
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="soilType">{t('soilType')}</Label>
                  <Controller
                    name="soilType"
                    control={control}
                    rules={{ required: t('soilTypeRequired') }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger id="soilType">
                          <SelectValue placeholder={t('selectSoilType')} />
                        </SelectTrigger>
                        <SelectContent>
                          {soilTypes.map(type => (
                            <SelectItem key={type} value={type}>{t(type as any)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.soilType && <p className="text-destructive text-sm">{errors.soilType.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentWeather">{t('currentWeather')}</Label>
                  <Controller
                    name="currentWeather"
                    control={control}
                    rules={{ required: t('weatherRequired') }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger id="currentWeather">
                           <SelectValue placeholder={t('selectCurrentWeather')} />
                        </SelectTrigger>
                        <SelectContent>
                          {weatherConditions.map(weather => (
                            <SelectItem key={weather} value={weather}>
                              <div className="flex items-center">
                                <WeatherIcon weather={weather} />
                                {t(weather as any)}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.currentWeather && <p className="text-destructive text-sm">{errors.currentWeather.message}</p>}
                </div>
             </div>
            <Button type="submit" disabled={isLoading} className="w-full !mt-6">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {t('getAdvice')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AnimatePresence>
        {advice && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="bg-background">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bot />
                            <CardTitle className="font-headline">{t('irrigationAdvice')}</CardTitle>
                        </div>
                        <AudioPlayer
                            audioSrc={audioSrc}
                            isLoading={isAudioLoading}
                            onPlaybackRequest={handlePlaybackRequest}
                        />
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-6 bg-primary/10 rounded-lg text-center">
                        <h3 className="text-lg font-semibold text-muted-foreground">{t('recommendation')}</h3>
                        <p className="text-3xl font-bold text-primary mt-1">{advice.recommendation}</p>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-muted-foreground">{t('reasoning')}</h4>
                            <p>{advice.reasoning}</p>
                        </div>
                         <div>
                            <h4 className="font-semibold text-muted-foreground">{t('suggestedAmount')}</h4>
                            <p className="flex items-center gap-2"><Droplets className="text-blue-400" /> {advice.amount}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
