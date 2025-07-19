
'use client';

import { useState, useCallback } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Landmark, Loader2, Bot, Lightbulb, Info, AlertTriangle, FileText, CheckCircle2, Mic } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { assessLoanEligibility, LoanEligibilityOutput } from '@/ai/flows/assess-loan-eligibility';
import { useAuth } from '@/contexts/AuthContext';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { getTtsLanguageCode } from '@/lib/translations';


type LoanFormInputs = {
  loanPurpose: string;
  amountRequired: number;
  document: FileList;
};

type SttField = 'amountRequired';

const loanPurposes = [
    { key: 'loanPurposeSeeds' },
    { key: 'loanPurposeFertilizers' },
    { key: 'loanPurposePesticides' },
    { key: 'loanPurposeEquipment' },
    { key: 'loanPurposeLabor' },
];

export default function SmartCapitalPage() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const { user } = useAuth();
    const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<LoanFormInputs>();

    const [isLoading, setIsLoading] = useState(false);
    const [eligibilityResult, setEligibilityResult] = useState<LoanEligibilityOutput | null>(null);
    const [activeSttField, setActiveSttField] = useState<SttField | null>(null);

    const onRecognitionResult = useCallback((result: string) => {
      if (activeSttField) {
        // Remove non-numeric characters for amount
        const numericResult = result.replace(/[^0-9]/g, '');
        setValue(activeSttField, Number(numericResult), { shouldValidate: true });
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
      if (isListening) {
          stopListening();
      } else {
          setActiveSttField(field);
          const ttsLang = getTtsLanguageCode(language);
          startListening(ttsLang);
      }
    };
    
    const onSubmit: SubmitHandler<LoanFormInputs> = async (data) => {
        setIsLoading(true);
        setEligibilityResult(null);
        
        if (!user) {
            toast({ variant: 'destructive', title: t('error'), description: 'You must be logged in to apply.' });
            setIsLoading(false);
            return;
        }

        try {
            const result = await assessLoanEligibility({
                userId: user.uid,
                purpose: data.loanPurpose,
                amount: data.amountRequired,
                language: language,
            });
            setEligibilityResult(result);
            toast({
                title: t('assessmentComplete'),
                description: result.status === 'approved' ? t('congratulations') : t('checkResultsBelow'),
            });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: t('error'), description: 'Could not assess loan eligibility.' });
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {/* Main Page Card */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl flex items-center gap-2">
                            <Landmark /> {t('smartCapitalAccess')}
                        </CardTitle>
                        <CardDescription>{t('smartCapitalAccessDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="loanPurpose">{t('loanPurpose')}</Label>
                                    <Controller
                                        name="loanPurpose"
                                        control={control}
                                        rules={{ required: t('fieldRequired') }}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger><SelectValue placeholder={t('selectLoanPurpose')} /></SelectTrigger>
                                                <SelectContent>
                                                    {loanPurposes.map(p => (
                                                        <SelectItem key={p.key} value={t(p.key as any)}>{t(p.key as any)}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {errors.loanPurpose && <p className="text-destructive text-sm">{errors.loanPurpose.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="amountRequired">{t('amountRequired')} (₹)</Label>
                                    <div className="relative">
                                        <Input id="amountRequired" type="number" {...register('amountRequired', { required: t('fieldRequired'), valueAsNumber: true })} />
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleSttToggle('amountRequired')}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                            disabled={!isSupported}
                                        >
                                            <Mic className={`h-5 w-5 ${isListening && activeSttField === 'amountRequired' ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                                        </Button>
                                    </div>
                                    {errors.amountRequired && <p className="text-destructive text-sm">{errors.amountRequired.message}</p>}
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="document">{t('uploadDocument')}</Label>
                                <Input id="document" type="file" accept="image/*,application/pdf" {...register('document', { required: t('fieldRequired') })} />
                                <p className="text-xs text-muted-foreground">{t('documentHint')}</p>
                                {errors.document && <p className="text-destructive text-sm">{errors.document.message}</p>}
                            </div>
                            <Button type="submit" className="w-full !mt-8" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Bot className="mr-2" />}
                                {t('assessEligibility')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
                
                {/* Status and Results Column */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{t('loanStatus')}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-muted-foreground">{t('noActiveLoan')}</p>
                            <Button variant="link" className="mt-2">{t('viewLoanHistory')}</Button>
                        </CardContent>
                    </Card>

                    <AnimatePresence>
                    {eligibilityResult && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className={eligibilityResult.status === 'approved' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        {eligibilityResult.status === 'approved' ? <CheckCircle2 /> : <AlertTriangle />}
                                        {t('eligibilityResult')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div>
                                        <p className="text-sm font-semibold">{t('aiRecommendation')}</p>
                                        <p className="text-muted-foreground text-sm">{eligibilityResult.recommendation}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold">{t('approvedAmount')}</p>
                                        <p className="text-2xl font-bold">₹{eligibilityResult.approvedAmount.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold">{t('reasoning')}</p>
                                        <p className="text-muted-foreground text-sm">{eligibilityResult.reasoning}</p>
                                    </div>
                                </CardContent>
                                {eligibilityResult.status === 'approved' && (
                                    <CardFooter>
                                        <Button className="w-full">{t('acceptLoan')}</Button>
                                    </CardFooter>
                                )}
                            </Card>
                        </motion.div>
                    )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}
