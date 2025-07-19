
'use client';

import { useState, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Lightbulb, Loader2, Search, Mic, TrendingUp, ThumbsDown, ThumbsUp } from 'lucide-react';

import { getSellingAdvice, SellingAdviceOutput } from '@/ai/flows/selling-advice';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { getTtsLanguageCode } from '@/lib/translations';

type FormInputs = {
  cropType: string;
  location: string;
  quantity: string;
  desiredSellTime: string;
};

type SttField = 'cropType' | 'location' | 'quantity' | 'desiredSellTime';

export default function SellingAdvicePage() {
  const { t, language } = useLanguage();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormInputs>();
  const [advice, setAdvice] = useState<SellingAdviceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [activeSttField, setActiveSttField] = useState<SttField | null>(null);

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
      hidden: { y: 20, opacity: 0 },
      visible: { y: 0, opacity: 1 }
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
                    <Label htmlFor="quantity">{t('quantity')}</Label>
                     <div className="relative">
                      <Input id="quantity" placeholder={t('egQuantity')} {...register('quantity', { required: t('quantityRequired') })} />
                       <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleSttToggle('quantity')}
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                          disabled={!isSupported}
                      >
                          <Mic className={`h-5 w-5 ${isListening && activeSttField === 'quantity' ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                      </Button>
                    </div>
                    {errors.quantity && <p className="text-destructive text-sm">{errors.quantity.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="desiredSellTime">{t('desiredSellTime')}</Label>
                    <div className="relative">
                      <Input id="desiredSellTime" placeholder={t('egSellTime')} {...register('desiredSellTime', { required: t('sellTimeRequired') })} />
                       <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleSttToggle('desiredSellTime')}
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                          disabled={!isSupported}
                      >
                          <Mic className={`h-5 w-5 ${isListening && activeSttField === 'desiredSellTime' ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                      </Button>
                    </div>
                    {errors.desiredSellTime && <p className="text-destructive text-sm">{errors.desiredSellTime.message}</p>}
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
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <motion.div variants={itemVariants}>
                <Card className="bg-background">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Bot />
                            <CardTitle className="font-headline">{t('sellingAdvice')}</CardTitle>
                        </div>
                    </CardHeader>
                </Card>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp /> Best Market to Sell</CardTitle>
                </CardHeader>
                <CardContent>
                    <h3 className="text-xl font-bold text-green-800 dark:text-green-300">{advice.bestMarket.name}</h3>
                    <p className="text-muted-foreground">{advice.bestMarket.reason}</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Alternative Markets</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {advice.alternativeMarkets.map((market, index) => (
                            <div key={index} className="p-4 border rounded-lg">
                                <h4 className="font-semibold">{market.marketName}</h4>
                                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-start gap-2 text-green-600">
                                        <ThumbsUp className="h-4 w-4 mt-0.5 shrink-0" />
                                        <span>{market.pros}</span>
                                    </div>
                                    <div className="flex items-start gap-2 text-red-600">
                                        <ThumbsDown className="h-4 w-4 mt-0.5 shrink-0" />
                                        <span>{market.cons}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </motion.div>
            
            <motion.div variants={itemVariants}>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Lightbulb /> General Advice</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>{advice.generalAdvice}</p>
                    </CardContent>
                </Card>
            </motion.div>
            
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
