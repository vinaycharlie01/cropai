
'use client';

import { useState, useCallback } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Loader2, Search, ArrowRight, ExternalLink } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { getSchemeRecommendations } from '@/ai/flows/scheme-advisor';
import { SchemeFinderOutput, SchemeRecommendation } from '@/types/scheme-advisor';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const formSchema = z.object({
    helpType: z.string({ required_error: 'Please select a help type.' }),
    state: z.string().min(1, 'State is required.'),
    farmerType: z.string({ required_error: 'Please select a farmer type.' }),
    hasLand: z.enum(['yes', 'no'], { required_error: 'Please select an option.' }),
    landArea: z.string().optional(),
    cropType: z.string().optional(),
});

type FormInputs = z.infer<typeof formSchema>;

const helpTypes = ['cropInsurance', 'irrigation', 'financialSupport', 'equipmentSubsidy', 'soilHealth', 'generalSupport'];
const farmerTypes = ['landholder', 'tenant', 'sharecropper', 'womanFarmer'];

export default function SchemesPage() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormInputs>({
        resolver: zodResolver(formSchema)
    });

    const [isLoading, setIsLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<SchemeRecommendation[] | null>(null);

    const hasLand = watch('hasLand');

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        setIsLoading(true);
        setRecommendations(null);
        try {
            const result = await getSchemeRecommendations({ ...data, language });
            if(result.length === 0) {
                toast({
                    title: t('noSchemesFound'),
                    description: t('noSchemesFoundDesc'),
                });
                setRecommendations([]);
            } else {
                setRecommendations(result);
            }
        } catch (e) {
            console.error(e);
            const errorMessage = e instanceof Error ? e.message : 'Could not fetch scheme recommendations.';
            toast({ variant: 'destructive', title: t('error'), description: errorMessage });
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
                    <CardTitle className="font-headline text-2xl">{t('personalizedSchemes')}</CardTitle>
                    <CardDescription>{t('schemesPersonalizedDesc')}</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardContent className="space-y-8">
                        {/* Step 1: Help Type */}
                        <div className="space-y-4">
                            <Label className="text-lg font-semibold">1. {t('whatHelpNeeded')}</Label>
                            <Controller
                                name="helpType"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger><SelectValue placeholder={t('selectHelpType')} /></SelectTrigger>
                                        <SelectContent>
                                            {helpTypes.map(type => (
                                                <SelectItem key={type} value={t(type as any)}>{t(type as any)}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.helpType && <p className="text-destructive text-sm">{errors.helpType.message}</p>}
                        </div>

                        {/* Step 2: Location & Farmer Type */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="state">2. {t('yourState')}</Label>
                                <Input id="state" placeholder={t('egAndhraPradesh')} {...register('state')} />
                                {errors.state && <p className="text-destructive text-sm">{errors.state.message}</p>}
                            </div>
                             <div className="space-y-4">
                                <Label className="text-base font-semibold">3. {t('whatFarmerType')}</Label>
                                <Controller
                                    name="farmerType"
                                    control={control}
                                    render={({ field }) => (
                                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger><SelectValue placeholder={t('selectFarmerType')} /></SelectTrigger>
                                            <SelectContent>
                                                {farmerTypes.map(type => (
                                                    <SelectItem key={type} value={t(type as any)}>{t(type as any)}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.farmerType && <p className="text-destructive text-sm">{errors.farmerType.message}</p>}
                            </div>
                        </div>

                        {/* Step 3: Land Ownership */}
                        <div className="space-y-4">
                            <Label className="text-lg font-semibold">4. {t('doYouOwnLand')}</Label>
                            <Controller
                                name="hasLand"
                                control={control}
                                render={({ field }) => (
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id="yes" />
                                            <Label htmlFor="yes">{t('yes')}</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id="no" />
                                            <Label htmlFor="no">{t('no')}</Label>
                                        </div>
                                    </RadioGroup>
                                )}
                            />
                             {errors.hasLand && <p className="text-destructive text-sm">{errors.hasLand.message}</p>}
                        </div>
                        
                        <AnimatePresence>
                        {hasLand === 'yes' && (
                             <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="grid md:grid-cols-2 gap-6 pl-4 border-l-2 border-primary/20"
                             >
                                <div className="space-y-2">
                                    <Label htmlFor="landArea">{t('howMuchLand')}</Label>
                                    <Input id="landArea" placeholder={t('egLandArea')} {...register('landArea')} />
                                </div>
                             </motion.div>
                        )}
                        </AnimatePresence>
                        
                         {/* Step 4: Crop */}
                        <div className="space-y-2">
                            <Label htmlFor="cropType">5. {t('whatCropGrow')}</Label>
                            <Input id="cropType" placeholder={t('egTomato')} {...register('cropType')} />
                        </div>
                        
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Search className="mr-2" />}
                            {t('findMySchemes')}
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            <AnimatePresence>
                {recommendations && recommendations.length > 0 && (
                     <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <Card>
                             <CardHeader>
                                <CardTitle className="font-headline text-xl flex items-center gap-2"><Bot /> {t('recommendedSchemes')}</CardTitle>
                                <CardDescription>{t('recommendedSchemesDesc')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="single" collapsible className="w-full">
                                    {recommendations.map((scheme, index) => (
                                        <AccordionItem value={`item-${index}`} key={index}>
                                            <AccordionTrigger className="font-semibold text-lg hover:no-underline text-left">
                                                <div className="flex justify-between items-center w-full pr-4">
                                                    <span>{scheme.schemeName}</span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="space-y-4 pt-2">
                                                <p className="text-muted-foreground">{scheme.description}</p>
                                                <div>
                                                    <h4 className="font-medium text-primary">{t('schemeEligibility')}:</h4>
                                                    <p className="text-sm text-muted-foreground">{scheme.eligibility}</p>
                                                </div>
                                                 <div>
                                                    <h4 className="font-medium text-primary">{t('benefits')}:</h4>
                                                    <p className="text-sm text-muted-foreground">{scheme.benefits}</p>
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-primary">{t('howToApply')}:</h4>
                                                    <p className="text-sm text-muted-foreground">{scheme.howToApply}</p>
                                                </div>
                                                <Button asChild variant="outline">
                                                    <a href={scheme.applicationUrl} target="_blank" rel="noopener noreferrer">
                                                        Apply Now <ExternalLink className="ml-2 h-4 w-4" />
                                                    </a>
                                                </Button>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </CardContent>
                        </Card>
                     </motion.div>
                )}
            </AnimatePresence>

        </motion.div>
    );
}
