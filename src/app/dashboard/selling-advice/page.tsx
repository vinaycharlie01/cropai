
'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Lightbulb, Loader2, Search, Mic, Play, Pause, Volume2 } from 'lucide-react';

import { getSellingAdvice, SellingAdviceOutput } from '@/ai/flows/selling-advice';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import type { TranslationKeys } from '@/lib/translations';


type FormInputs = {
  cropType: string;
  location: string;
  quantity: string;
  desiredSellTime: string;
};

const SpeechRecognition = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

const playSound = (freq: number, type: 'sine' | 'square' = 'sine') => {
    if (typeof window === 'undefined' || (typeof window.AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined')) return;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.5);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
};


export default function SellingAdvicePage() {
  const { t, language } = useLanguage();
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormInputs>();
  const [advice, setAdvice] = useState<SellingAdviceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [listeningField, setListeningField] = useState<keyof FormInputs | null>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  
  const { isLoading: isAudioLoading, isPlaying, hasAudio, generateAudio, play, pause } = useAudioPlayer();

  useEffect(() => {
    if (advice) {
      generateAudio(advice.advice, language);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advice]);


  useEffect(() => {
    if (SpeechRecognition && !recognitionRef.current) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            const currentListeningField = (recognition as any)._listeningField;
            if (currentListeningField) {
                setValue(currentListeningField, transcript, { shouldValidate: true });
            }
        };

        recognition.onaudiostart = () => {
            playSound(440, 'sine');
        };

        recognition.onaudioend = () => {
            playSound(220, 'sine');
            setListeningField(null);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            if (event.error !== 'no-speech') {
                toast({ variant: 'destructive', title: t('error'), description: "Could not recognize speech." });
            }
            setListeningField(null);
        };

        recognition.onend = () => {
            setListeningField(null);
        };
        
        recognitionRef.current = recognition;
    }
  }, [setValue, toast, t]);


  const toggleListening = (field: keyof FormInputs) => {
    if (!SpeechRecognition || !recognitionRef.current) return;
    const recognition = recognitionRef.current;

    if (listeningField === field) {
        recognition.stop();
        setListeningField(null);
    } else {
        if(listeningField) {
            recognition.stop();
        }
        (recognition as any)._listeningField = field;
        setListeningField(field);
        try {
            recognition.lang = language;
            recognition.start();
        } catch (e) {
            console.error("Could not start recognition", e);
            setListeningField(null);
        }
    }
  };


  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    setIsLoading(true);
    setError(null);
    setAdvice(null);

    try {
      const result = await getSellingAdvice({ ...data, language });
      setAdvice(result);
    } catch (e) {
      console.error(e);
      setError(t('errorGettingAdvice'));
      toast({ variant: 'destructive', title: t('error'), description: t('errorGettingAdvice') });
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderInputWithMic = (id: keyof FormInputs, placeholderKey: TranslationKeys, requiredMessageKey: TranslationKeys) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{t(id as TranslationKeys)}</Label>
      <div className="relative">
        <Input id={id} placeholder={t(placeholderKey)} {...register(id, { required: t(requiredMessageKey) })} />
        {SpeechRecognition && (
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 ${listeningField === id ? "text-destructive animate-pulse" : ""}`}
                onClick={() => toggleListening(id)}
            >
                <Mic className="h-4 w-4" />
            </Button>
        )}
      </div>
      {errors[id] && <p className="text-destructive text-sm">{errors[id]?.message}</p>}
    </div>
  );

  const AudioControls = () => {
    if (isAudioLoading) {
      return <Button variant="ghost" size="icon" disabled><Loader2 className="animate-spin" /></Button>;
    }
    if (hasAudio) {
      return (
        <Button variant="ghost" size="icon" onClick={isPlaying ? pause : play}>
          {isPlaying ? <Pause /> : <Play />}
        </Button>
      );
    }
    return <Button variant="ghost" size="icon" disabled><Volume2 /></Button>;
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
          <CardTitle className="font-headline text-2xl">{t('aiSellingAdvice')}</CardTitle>
          <CardDescription>{t('aiSellingAdviceDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
             <div className="grid md:grid-cols-2 gap-4">
                {renderInputWithMic('cropType', 'egTomato', 'cropTypeRequired')}
                {renderInputWithMic('location', 'egAndhraPradesh', 'locationRequired')}
                {renderInputWithMic('quantity', 'egQuantity', 'quantityRequired')}
                {renderInputWithMic('desiredSellTime', 'egSellTime', 'sellTimeRequired')}
             </div>
            <Button type="submit" disabled={isLoading} className="w-full !mt-6">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {t('getAdvice')}
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
        {advice && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="bg-background">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bot />
                        <CardTitle className="font-headline">{t('sellingAdvice')}</CardTitle>
                    </div>
                    <AudioControls />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                        <Lightbulb className="h-6 w-6 text-primary mt-1 shrink-0" />
                        <p className="whitespace-pre-wrap">{advice.advice}</p>
                    </div>
                </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
