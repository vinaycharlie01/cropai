
'use client';

import { useState } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Loader2, Send, Paperclip } from 'lucide-react';
import Image from 'next/image';

import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { TranslationKeys } from '@/lib/translations';

type FormInputs = {
  issueType: string;
  description: string;
  attachment?: FileList;
};

const issueTypes: { key: TranslationKeys }[] = [
    { key: 'issueTypeApp' },
    { key: 'issueTypeDiagnosis' },
    { key: 'issueTypePayment' },
    { key: 'issueTypeOther' },
];

export default function SubmitIssuePage() {
    const { t, language } = useLanguage();
    const { register, handleSubmit, control, formState: { errors } } = useForm<FormInputs>();
    const [isLoading, setIsLoading] = useState(false);
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
    const { toast } = useToast();

    const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAttachmentPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        setIsLoading(true);
        console.log("Submitting issue:", data);

        // This is where you would typically send the data to your backend/Firestore
        await new Promise(resolve => setTimeout(resolve, 2000));

        setIsLoading(false);
        toast({
            title: t('issueSubmittedTitle'),
            description: t('issueSubmittedDesc'),
        });
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
                    <CardTitle className="font-headline text-2xl">{t('submitIssue')}</CardTitle>
                    <CardDescription>{t('submitIssueDescLong')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="issueType">{t('issueTypeLabel')}</Label>
                            <Controller
                                name="issueType"
                                control={control}
                                rules={{ required: t('issueTypeRequired') }}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger id="issueType">
                                            <SelectValue placeholder={t('selectIssueType')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {issueTypes.map(type => (
                                                <SelectItem key={t(type.key)} value={t(type.key)}>{t(type.key)}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.issueType && <p className="text-destructive text-sm">{errors.issueType.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">{t('issueDescriptionLabel')}</Label>
                            <Textarea
                                id="description"
                                placeholder={t('issueDescriptionPlaceholder')}
                                {...register('description', { required: t('issueDescriptionRequired') })}
                                className="min-h-[120px]"
                            />
                            {errors.description && <p className="text-destructive text-sm">{errors.description.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="attachment">{t('attachPhotoLabel')}</Label>
                             <Input id="attachment" type="file" accept="image/*" {...register('attachment', { onChange: handleAttachmentChange })} />
                             {attachmentPreview && (
                                <div className="mt-4 relative w-full h-48 rounded-lg overflow-hidden border">
                                    <Image src={attachmentPreview} alt="Attachment preview" layout="fill" objectFit="contain" />
                                </div>
                            )}
                        </div>

                        <Button type="submit" disabled={isLoading} className="w-full !mt-8">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            {t('submitIssueButton')}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </motion.div>
    );
}
