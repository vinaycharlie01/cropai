
'use client';

import { useState } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Landmark, Loader2, Bot, Lightbulb, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { assessLoanEligibility, LoanEligibilityOutput } from '@/ai/flows/assess-loan-eligibility';
import { useAuth } from '@/contexts/AuthContext';

type LoanFormInputs = {
  loanPurpose: string;
  amountRequired: number;
};

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
    const { register, handleSubmit, control, formState: { errors } } = useForm<LoanFormInputs>();

    const [isLoading, setIsLoading] = useState(false);
    const [eligibilityResult, setEligibilityResult] = useState<LoanEligibilityOutput | null>(null);

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
        } catch (e: any) {
            console.error("Error assessing loan eligibility:", e);
            toast({ variant: 'destructive', title: t('error'), description: e.message || 'Could not assess loan eligibility.' });
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
            <div className="grid md:grid-cols-2 gap-6">
                 {/* Main Page Card */}
                <Card className="md:col-span-2 lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl flex items-center gap-2">
                            <Landmark /> {t('smartCapitalAccess')}
                        </CardTitle>
                        <CardDescription>{t('smartCapitalAccessDesc')}</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <CardContent className="space-y-6">
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
                                <Input id="amountRequired" type="number" {...register('amountRequired', { required: t('fieldRequired'), valueAsNumber: true, min: { value: 1, message: "Amount must be positive."} })} />
                                {errors.amountRequired && <p className="text-destructive text-sm">{errors.amountRequired.message}</p>}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Bot className="mr-2" />}
                                {t('assessEligibility')}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
                
                {/* Status and Results Column */}
                <div className="space-y-6">
                    <AnimatePresence>
                    {isLoading && (
                         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <Card>
                                <CardContent className="pt-6 flex flex-col items-center justify-center h-48">
                                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                    <p className="mt-4 text-muted-foreground">Assessing your eligibility...</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                    {eligibilityResult && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className={eligibilityResult.status === 'approved' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        {eligibilityResult.status === 'approved' && <CheckCircle2 className="text-green-600"/>}
                                        {eligibilityResult.status === 'pending_review' && <AlertTriangle className="text-yellow-600"/>}
                                        {eligibilityResult.status === 'rejected' && <AlertTriangle className="text-red-600"/>}
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
                    {!isLoading && !eligibilityResult && (
                         <Card>
                            <CardContent className="pt-6 flex flex-col items-center justify-center h-48">
                                <Lightbulb className="h-10 w-10 text-yellow-400" />
                                <p className="mt-4 text-center text-muted-foreground">Your loan eligibility results will appear here once you submit the form.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
