
'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Lightbulb, Loader2, Search } from 'lucide-react';

import { getSellingAdvice, SellingAdviceOutput } from '@/ai/flows/selling-advice';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type FormInputs = {
  cropType: string;
  location: string;
};

export default function SellingAdvicePage() {
  const { t } = useLanguage();
  const { register, handleSubmit, formState: { errors } } = useForm<FormInputs>();
  const [advice, setAdvice] = useState<SellingAdviceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    setIsLoading(true);
    setError(null);
    setAdvice(null);
    try {
      const result = await getSellingAdvice(data);
      setAdvice(result);
    } catch (e) {
      console.error(e);
      setError(t('errorGettingAdvice'));
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
          <CardTitle className="font-headline text-2xl">{t('aiSellingAdvice')}</CardTitle>
          <CardDescription>{t('aiSellingAdviceDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
             <div className="space-y-2">
              <Label htmlFor="cropType">{t('cropType')}</Label>
              <Input id="cropType" placeholder={t('egTomato')} {...register('cropType', { required: t('cropTypeRequired') })} />
              {errors.cropType && <p className="text-destructive text-sm">{errors.cropType.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">{t('location')}</Label>
              <Input id="location" placeholder={t('egAndhraPradesh')} {...register('location', { required: t('locationRequired') })} />
              {errors.location && <p className="text-destructive text-sm">{errors.location.message}</p>}
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
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
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Bot /> {t('sellingAdvice')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                        <Lightbulb className="h-6 w-6 text-primary mt-1" />
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
