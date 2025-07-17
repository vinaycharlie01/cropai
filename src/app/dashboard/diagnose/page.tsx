'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Upload, Leaf, ShieldAlert, Loader2, Bot, PlusCircle } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';

import { diagnoseCropDisease, DiagnoseCropDiseaseOutput } from '@/ai/flows/diagnose-crop-disease';
import { suggestTreatment, SuggestTreatmentOutput } from '@/ai/flows/smart-treatment-suggestions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from "@/hooks/use-toast"

type FormInputs = {
  cropType: string;
  location: string;
  image: FileList;
};

export default function DiagnosePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormInputs>();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnoseCropDiseaseOutput | null>(null);
  const [treatment, setTreatment] = useState<SuggestTreatmentOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTreatmentLoading, setIsTreatmentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const watchImage = watch("image");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getTreatmentSuggestions = async () => {
    if (!diagnosis) return;
    setIsTreatmentLoading(true);
    setError(null);
    const { cropType, location } = watch();
    try {
      const result = await suggestTreatment({ cropType, disease: diagnosis.disease, location });
      setTreatment(result);
    } catch (e) {
      setError(t('errorDiagnosis'));
    } finally {
      setIsTreatmentLoading(false);
    }
  };

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    if (!data.image[0]) {
      toast({
        variant: "destructive",
        title: "Error",
        description: t('noImage'),
      })
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setDiagnosis(null);
    setTreatment(null);

    const reader = new FileReader();
    reader.readAsDataURL(data.image[0]);
    reader.onloadend = async () => {
      const base64data = reader.result as string;
      try {
        const result = await diagnoseCropDisease({
          photoDataUri: base64data,
          cropType: data.cropType,
          location: data.location,
        });
        setDiagnosis(result);
      } catch (e) {
        console.error(e);
        setError(t('errorDiagnosis'));
      } finally {
        setIsLoading(false);
      }
    };
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{t('cropDiseaseDiagnosis')}</CardTitle>
          <CardDescription>{t('uploadInstruction')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cropType">{t('cropType')}</Label>
              <Input id="cropType" placeholder={t('egTomato')} {...register('cropType', { required: true })} />
              {errors.cropType && <p className="text-destructive text-sm">Crop type is required.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">{t('location')}</Label>
              <Input id="location" placeholder={t('egAndhraPradesh')} {...register('location', { required: true })} />
              {errors.location && <p className="text-destructive text-sm">Location is required.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-upload">{t('uploadImage')}</Label>
              <Input id="image-upload" type="file" accept="image/*" className="hidden" {...register('image', { required: true, onChange: handleImageChange })} />
              <label htmlFor="image-upload" className="cursor-pointer flex items-center justify-center w-full p-4 border-2 border-dashed rounded-lg hover:bg-muted">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Click to upload or drag and drop</p>
                </div>
              </label>
              {errors.image && <p className="text-destructive text-sm">An image is required.</p>}
            </div>
            {imagePreview && (
              <div>
                <Label>{t('imagePreview')}</Label>
                <div className="mt-2 relative w-full h-64 rounded-lg overflow-hidden border">
                  <Image src={imagePreview} alt="Image preview" layout="fill" objectFit="cover" data-ai-hint="crop plant" />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Leaf className="mr-2 h-4 w-4" />}
              {isLoading ? t('diagnosing') : t('diagnose')}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="space-y-6">
        {error && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              <Button variant="link" className="p-0 h-auto mt-2">{t('helpSupport')}</Button>
            </Alert>
        )}
        {diagnosis && (
          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2"><Bot /> {t('diagnosisResult')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold">{t('disease')}</h3>
                <p>{diagnosis.disease}</p>
              </div>
              <div>
                <h3 className="font-semibold">{t('remedies')}</h3>
                <p>{diagnosis.remedies}</p>
              </div>
              <div>
                <h3 className="font-semibold">{t('confidence')}</h3>
                <p>{(diagnosis.confidence * 100).toFixed(2)}%</p>
              </div>
            </CardContent>
            <CardFooter>
               <Button onClick={getTreatmentSuggestions} disabled={isTreatmentLoading} className="w-full">
                  {isTreatmentLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  {t('getTreatment')}
                </Button>
            </CardFooter>
          </Card>
        )}
        {treatment && (
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">{t('treatmentSuggestions')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>{treatment.treatmentSuggestions}</p>
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
