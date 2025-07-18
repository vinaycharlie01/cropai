
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useForm, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Bot, Loader2, Activity, CalendarDays, Sprout } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { monitorCropGrowth, CropGrowthOutput } from '@/ai/flows/daily-crop-growth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type FormInputs = {
  cropType: string;
  daysSincePlanting: number;
  image: FileList;
};

// Mock data for growth history timeline
const mockHistory = [
  { day: 1, stage: "Germination", image: "https://placehold.co/100x100.png", hint: "sprout soil" },
  { day: 7, stage: "Seedling", image: "https://placehold.co/100x100.png", hint: "small plant" },
  { day: 14, stage: "Vegetative", image: "https://placehold.co/100x100.png", hint: "green leaves" },
  { day: 21, stage: "Vegetative", image: "https://placehold.co/100x100.png", hint: "bushy plant" },
];

export default function MonitorPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { register, handleSubmit, watch, formState: { errors }, setValue, clearErrors } = useForm<FormInputs>();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CropGrowthOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setAnalysis(null);
        setError(null);
        clearErrors('image');
      };
      reader.readAsDataURL(file);
    }
  };

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    if (!data.image || data.image.length === 0) {
      toast({ variant: 'destructive', title: t('error'), description: t('noImage') });
      setIsLoading(false);
      return;
    }
    
    try {
        const imageDataUri = await fileToDataUri(data.image[0]);
        const result = await monitorCropGrowth({
          photoDataUri: imageDataUri,
          cropType: data.cropType,
          daysSincePlanting: Number(data.daysSincePlanting),
          language: language,
        });
        setAnalysis(result);
      } catch (e) {
        console.error(e);
        const errorMessage = (e as Error).message || t('errorDiagnosis');
        setError(errorMessage);
        toast({ variant: "destructive", title: t('error'), description: errorMessage });
      } finally {
        setIsLoading(false);
      }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="grid gap-6 lg:grid-cols-3"
    >
      <div className="lg:col-span-2 space-y-6">
        <Card className="bg-background">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">{t('growthMonitoringTitle')}</CardTitle>
            <CardDescription>{t('growthMonitoringDesc')}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="cropType">{t('cropType')}</Label>
                      <Input id="cropType" placeholder={t('egTomato')} {...register('cropType', { required: t('cropTypeRequired') })} />
                      {errors.cropType && <p className="text-destructive text-sm">{errors.cropType.message}</p>}
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="daysSincePlanting">{t('daysSincePlanting')}</Label>
                      <Input id="daysSincePlanting" type="number" placeholder="e.g., 15" {...register('daysSincePlanting', { required: t('daysSincePlantingRequired'), valueAsNumber: true })} />
                      {errors.daysSincePlanting && <p className="text-destructive text-sm">{errors.daysSincePlanting.message}</p>}
                  </div>
              </div>

              <div className="space-y-2">
                <Label>{t('uploadDailyPhoto')}</Label>
                <Input id="image-upload" type="file" accept="image/*" className="hidden" {...register('image', { onChange: handleImageChange, required: t('noImage') })} />
                <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors">
                    {imagePreview ? (
                        <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                            <Image src={imagePreview} alt="Image preview" layout="fill" objectFit="cover" data-ai-hint="crop plant" />
                        </div>
                    ) : (
                        <>
                            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                            <p className="mt-2 text-sm text-muted-foreground">{t('uploadOrDrag')}</p>
                        </>
                    )}
                </label>
                 {errors.image && !imagePreview && <p className="text-destructive text-sm">{errors.image.message}</p>}
              </div>

            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                {isLoading ? t('analyzing') : t('analyzeGrowth')}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <AnimatePresence>
          {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Alert variant="destructive">
                     <AlertTitle>{t('error')}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
              </motion.div>
          )}
          {analysis && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="bg-background">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Bot />
                      <CardTitle className="font-headline">{t('growthAnalysis')}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-muted-foreground">{t('growthStage')}</h3>
                      <p className="text-lg">{analysis.growthStage}</p>
                    </div>
                     <div>
                      <h3 className="font-semibold text-muted-foreground">{t('observations')}</h3>
                      <p>{analysis.observations}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-muted-foreground">{t('recommendations')}</h3>
                      <p>{analysis.recommendations}</p>
                    </div>
                  </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="lg:col-span-1">
        <Card>
            <CardHeader>
                <CardTitle>{t('growthTimeline')}</CardTitle>
                <CardDescription>{t('growthTimelineDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative pl-6">
                    {/* Vertical line */}
                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border"></div>

                    <div className="space-y-8">
                        {mockHistory.map((item, index) => (
                             <div key={index} className="flex items-start gap-4">
                                <div className="z-10 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground">
                                    <Sprout className="h-5 w-5" />
                                </div>
                                <div className="pt-1.5">
                                    <h4 className="font-semibold">{t('day')} {item.day}</h4>
                                    <p className="text-sm text-muted-foreground">{item.stage}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

    </motion.div>
  );
}
