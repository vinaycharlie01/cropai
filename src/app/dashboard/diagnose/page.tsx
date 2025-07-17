'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Upload, Leaf, ShieldAlert, Loader2, Bot, PlusCircle, Video, Camera } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';

import { diagnoseCropDisease, DiagnoseCropDiseaseOutput } from '@/ai/flows/diagnose-crop-disease';
import { suggestTreatment, SuggestTreatmentOutput } from '@/ai/flows/smart-treatment-suggestions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from 'framer-motion';

type FormInputs = {
  cropType: string;
  location: string;
  image: FileList;
};

export default function DiagnosePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm<FormInputs>();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnoseCropDiseaseOutput | null>(null);
  const [treatment, setTreatment] = useState<SuggestTreatmentOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTreatmentLoading, setIsTreatmentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setHasCameraPermission(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this app.',
        });
      }
    };

    getCameraPermission();
    
    return () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    }
  }, [toast]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setDiagnosis(null);
        setTreatment(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/png');
        setImagePreview(dataUrl);
        setDiagnosis(null);
        setTreatment(null);
        setError(null);

        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], 'capture.png', { type: 'image/png' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            setValue('image', dataTransfer.files);
          });
      }
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
    let imageDataUri = imagePreview;

    if (!imageDataUri && data.image && data.image[0]) {
      imageDataUri = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(data.image[0]);
      });
    }

    if (!imageDataUri) {
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
    
    try {
        const result = await diagnoseCropDisease({
          photoDataUri: imageDataUri,
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="grid gap-6 md:grid-cols-2"
    >
      <Card className="bg-background">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">{t('cropDiseaseDiagnosis')}</CardTitle>
          <CardDescription>{t('uploadInstruction')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
             <div className="space-y-2">
              <Label htmlFor="cropType">{t('cropType')}</Label>
              <Input id="cropType" placeholder={t('egTomato')} {...register('cropType', { required: 'Crop type is required.' })} />
              {errors.cropType && <p className="text-destructive text-sm">{errors.cropType.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">{t('location')}</Label>
              <Input id="location" placeholder={t('egAndhraPradesh')} {...register('location', { required: 'Location is required.' })} />
              {errors.location && <p className="text-destructive text-sm">{errors.location.message}</p>}
            </div>
            
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload"><Upload className="mr-2" /> {t('uploadImage')}</TabsTrigger>
                <TabsTrigger value="camera"><Video className="mr-2" /> {t('useCamera')}</TabsTrigger>
              </TabsList>
              <TabsContent value="upload">
                <div className="space-y-2 pt-4">
                  <Input id="image-upload" type="file" accept="image/*" className="hidden" {...register('image', { onChange: handleImageChange })} />
                  <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">Click to upload or drag and drop</p>
                  </label>
                   {errors.image && !imagePreview && <p className="text-destructive text-sm">An image is required.</p>}
                </div>
              </TabsContent>
              <TabsContent value="camera">
                <div className="space-y-4 pt-4">
                    <div className="w-full aspect-video rounded-md border bg-muted overflow-hidden relative flex items-center justify-center">
                        <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                        <canvas ref={canvasRef} className="hidden" />
                         {hasCameraPermission === false && (
                            <Alert variant="destructive" className="w-auto m-4">
                               <AlertTitle>Camera Access Required</AlertTitle>
                                <AlertDescription>
                                    Please allow camera access.
                                </AlertDescription>
                            </Alert>
                         )}
                         {hasCameraPermission === null && (
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                         )}
                    </div>
                  <Button type="button" onClick={handleCapture} className="w-full" disabled={!hasCameraPermission}>
                    <Camera className="mr-2" />
                    {t('captureImage')}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {imagePreview && (
              <div className="pt-4">
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
        <AnimatePresence>
            {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <Alert variant="destructive">
                      <ShieldAlert className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </motion.div>
            )}
            {diagnosis && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="bg-background">
                    <CardHeader>
                      <CardTitle className="font-headline flex items-center gap-2"><Bot /> {t('diagnosisResult')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-muted-foreground">{t('disease')}</h3>
                        <p className="text-lg">{diagnosis.disease}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-muted-foreground">{t('remedies')}</h3>
                        <p>{diagnosis.remedies}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-muted-foreground">{t('confidence')}</h3>
                        <p className="text-lg font-bold text-primary">{(diagnosis.confidence * 100).toFixed(0)}%</p>
                      </div>
                    </CardContent>
                    <CardFooter>
                       <Button onClick={getTreatmentSuggestions} disabled={isTreatmentLoading} className="w-full">
                          {isTreatmentLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                          {t('getTreatment')}
                        </Button>
                    </CardFooter>
                </Card>
              </motion.div>
            )}
            {treatment && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="bg-background">
                        <CardHeader>
                            <CardTitle className="font-headline">{t('treatmentSuggestions')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>{treatment.treatmentSuggestions}</p>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
