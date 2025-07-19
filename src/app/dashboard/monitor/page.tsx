
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useForm, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Bot, Loader2, Activity, Sprout, Video, Camera, SwitchCamera, Mic } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { monitorCropGrowth, CropGrowthOutput } from '@/ai/flows/daily-crop-growth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { TranslationKeys } from '@/lib/translations';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { getTtsLanguageCode } from '@/lib/translations';

type FormInputs = {
  cropType: string;
  daysSincePlanting: number;
  image: FileList;
};

type SttField = 'cropType';
type FacingMode = 'user' | 'environment';

// Mock data for growth history timeline
const mockHistory: { day: number, stageKey: TranslationKeys, hint: string }[] = [
  { day: 1, stageKey: "stageGermination", hint: "sprout soil" },
  { day: 7, stageKey: "stageSeedling", hint: "small plant" },
  { day: 14, stageKey: "stageVegetative", hint: "green leaves" },
  { day: 21, stageKey: "stageVegetative", hint: "bushy plant" },
];

export default function MonitorPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors }, setValue, clearErrors } = useForm<FormInputs>();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CropGrowthOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [activeSttField, setActiveSttField] = useState<SttField | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
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
    if (isListening) {
        stopListening();
    } else {
        setActiveSttField(field);
        const ttsLang = getTtsLanguageCode(language);
        startListening(ttsLang);
    }
  };


  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, []);

  const startCamera = useCallback(async (mode: FacingMode) => {
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      setHasCameraPermission(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
      streamRef.current = stream;
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({ variant: 'destructive', title: t('cameraAccessDeniedTitle'), description: t('cameraAccessDeniedDesc') });
    }
  }, [stopCamera, t, toast]);

  const detectCameras = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      setHasMultipleCameras(videoInputs.length > 1);
    } catch (error) {
      console.error("Could not enumerate devices:", error);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'camera') {
      startCamera(facingMode);
      detectCameras();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab, facingMode, startCamera, stopCamera, detectCameras]);

  const handleTabChange = (value: string) => setActiveTab(value);
  const handleSwitchCamera = () => setFacingMode(prev => prev === 'user' ? 'environment' : 'user');

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

  const handleCapture = async () => {
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
        setAnalysis(null);
        setError(null);
        
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'capture.png', { type: 'image/png' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        setValue('image', dataTransfer.files, { shouldValidate: true });
        clearErrors('image');
        setActiveTab('upload');
      }
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

    let imageDataUri: string | null = null;
    
    if (data.image && data.image.length > 0) {
      imageDataUri = await fileToDataUri(data.image[0]);
    } else if (imagePreview) {
      imageDataUri = imagePreview;
    }

    if (!imageDataUri) {
      toast({ variant: 'destructive', title: t('error'), description: t('noImage') });
      setIsLoading(false);
      return;
    }
    
    try {
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
                      <Label htmlFor="daysSincePlanting">{t('daysSincePlanting')}</Label>
                      <Input id="daysSincePlanting" type="number" placeholder="e.g., 15" {...register('daysSincePlanting', { required: t('daysSincePlantingRequired'), valueAsNumber: true })} />
                      {errors.daysSincePlanting && <p className="text-destructive text-sm">{errors.daysSincePlanting.message}</p>}
                  </div>
              </div>

              <div className="space-y-2">
                <Label>{t('uploadDailyPhoto')}</Label>
                 <Tabs defaultValue="upload" className="w-full" onValueChange={handleTabChange} value={activeTab}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upload"><Upload className="mr-2" /> {t('uploadImage')}</TabsTrigger>
                        <TabsTrigger value="camera"><Video className="mr-2" /> {t('useCamera')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload">
                        <Input id="image-upload" type="file" accept="image/*" className="hidden" {...register('image', { onChange: handleImageChange, validate: (value) => (value && value.length > 0) || imagePreview !== null || t('noImage') })} />
                        <label htmlFor="image-upload" className="cursor-pointer mt-4 flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors">
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
                        {errors.image && !imagePreview && <p className="text-destructive text-sm mt-2">{errors.image.message}</p>}
                    </TabsContent>
                    <TabsContent value="camera">
                        <div className="space-y-4 pt-4">
                            <div className="w-full aspect-video rounded-md border bg-muted overflow-hidden relative flex items-center justify-center">
                                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                                <canvas ref={canvasRef} className="hidden" />
                                {hasCameraPermission === false && (
                                    <Alert variant="destructive" className="w-auto m-4">
                                       <AlertTitle>{t('cameraAccessDeniedTitle')}</AlertTitle>
                                        <AlertDescription>{t('cameraAccessDeniedDesc')}</AlertDescription>
                                    </Alert>
                                )}
                                {activeTab === 'camera' && hasCameraPermission === null && (
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                )}
                                {hasCameraPermission && hasMultipleCameras && (
                                   <Button type="button" size="icon" variant="ghost" className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/75 text-white rounded-full" onClick={handleSwitchCamera}>
                                     <SwitchCamera />
                                   </Button>
                                )}
                            </div>
                          <Button type="button" onClick={handleCapture} className="w-full" disabled={!hasCameraPermission}>
                            <Camera className="mr-2" />
                            {t('captureImage')}
                          </Button>
                        </div>
                    </TabsContent>
                 </Tabs>
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
                                    <p className="text-sm text-muted-foreground">{t(item.stageKey)}</p>
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
