
'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Lightbulb, Loader2, Search, Mic, Play, Pause } from 'lucide-react';

import { getSellingAdvice, SellingAdviceOutput } from '@/ai/flows/selling-advice';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import type { TranslationKeys } from '@/lib/translations';


type FormInputs = {
  cropType: string;
  location: string;
  quantity: string;
  desiredSellTime: string;
};

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function SellingAdvicePage() {
  const { t, language } = useLanguage();
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormInputs>();
  const [advice, setAdvice] = useState<SellingAdviceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const adviceAudio = useAudioPlayer();
  const { toast } = useToast();

  useEffect(() => {
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = language;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const targetField = (recognitionRef.current as any).targetField as keyof FormInputs;
        if (targetField) {
            setValue(targetField, transcript, { shouldValidate: true });
        }
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        toast({ variant: 'destructive', title: t('error'), description: "Could not recognize speech." });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [language, setValue, toast]);


  const startListening = (field: keyof FormInputs) => {
    if (recognitionRef.current) {
        if(isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            (recognitionRef.current as any).targetField = field;
            recognitionRef.current.start();
            setIsListening(true);
        }
    }
  };


  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    setIsLoading(true);
    setError(null);
    setAdvice(null);
    adviceAudio.cleanup();

    try {
      const result = await getSellingAdvice({ ...data, language });
      setAdvice(result);
      adviceAudio.generateAudio(result.advice, language);
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
                className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 ${isListening && (recognitionRef.current as any)?.targetField === id ? "text-destructive animate-pulse" : ""}`}
                onClick={() => startListening(id)}
            >
                <Mic className="h-4 w-4" />
            </Button>
        )}
      </div>
      {errors[id] && <p className="text-destructive text-sm">{errors[id]?.message}</p>}
    </div>
  );

  const AudioControls = ({ audioHook }: { audioHook: ReturnType<typeof useAudioPlayer>}) => {
    const { isLoading, isPlaying, play, pause } = audioHook;
    if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
    if (isPlaying) return <Pause className="h-5 w-5 cursor-pointer" onClick={pause} />;
    return <Play className="h-5 w-5 cursor-pointer" onClick={play} />;
  }

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
                     <div className="flex items-center gap-2">
                        {adviceAudio.audioUrl && <AudioControls audioHook={adviceAudio} />}
                        {adviceAudio.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                      </div>
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

    