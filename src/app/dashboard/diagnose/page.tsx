
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Upload, Leaf, ShieldAlert, Loader2, Bot, Video, Camera, SwitchCamera, Mic, LifeBuoy, ShoppingCart } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';
import Link from 'next/link';

import { diagnoseCropDisease, DiagnoseCropDiseaseOutput } from '@/ai/flows/diagnose-crop-disease';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from 'framer-motion';
import { getTtsLanguageCode } from '@/lib/translations';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { AudioPlayer } from '@/components/AudioPlayer';


type FormInputs = {
  cropType: string;
  location: string;
  image: FileList;
};

type SttField = 'cropType' | 'location';
type FacingMode = 'user' | 'environment';

const HighlightedText = ({ text }: { text: string }) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
        <p>
            {parts.map((part, index) =>
                part.startsWith('**') && part.endsWith('**') ? (
                    <strong key={index} className="font-bold text-primary bg-primary/10 px-1 py-0.5 rounded-sm">
                        {part.slice(2, -2)}
                    </strong>
                ) : (
                    part
                )
            )}
        </p>
    );
};


export default function DiagnosePage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { register, handleSubmit, watch, formState: { errors }, setValue, clearErrors } = useForm<FormInputs>();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnoseCropDiseaseOutput | null>(null);
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
      if (mode === 'environment') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          setFacingMode('user');
          streamRef.current = stream;
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (userError) {
          setHasCameraPermission(false);
          toast({ variant: 'destructive', title: t('cameraAccessDeniedTitle'), description: t('cameraAccessDeniedDesc') });
        }
      } else {
        setHasCameraPermission(false);
        toast({ variant: 'destructive', title: t('cameraAccessDeniedTitle'), description: t('cameraAccessDeniedDesc') });
      }
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

    return () => {
      stopCamera();
    };
  }, [activeTab, facingMode, startCamera, stopCamera, detectCameras]);
  
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleSwitchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setDiagnosis(null);
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
        setDiagnosis(null);
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

  const saveDiagnosis = async (data: FormInputs, diagnosisResult: DiagnoseCropDiseaseOutput) => {
    try {
      await addDoc(collection(db, "diagnoses"), {
        cropType: data.cropType,
        location: data.location,
        language: language,
        ...diagnosisResult,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error adding document: ", e);
      toast({
        variant: 'destructive',
        title: t('error'),
        description: 'Failed to save diagnosis to your history.',
      });
    }
  };


  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    setIsLoading(true);
    setError(null);
    setDiagnosis(null);

    let imageDataUri: string | null = null;
    
    if (data.image && data.image.length > 0) {
      imageDataUri = await fileToDataUri(data.image[0]);
    } else if (imagePreview) {
      imageDataUri = imagePreview;
    }

    if (!imageDataUri) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('noImage'),
      });
      setIsLoading(false);
      return;
    }
    
    try {
        const result = await diagnoseCropDisease({
          photoDataUri: imageDataUri,
          cropType: data.cropType,
          location: data.location,
          language: language,
        });
        setDiagnosis(result);
        await saveDiagnosis(data, result);
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
            
            <Tabs defaultValue="upload" className="w-full" onValueChange={handleTabChange} value={activeTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload"><Upload className="mr-2" /> {t('uploadImage')}</TabsTrigger>
                <TabsTrigger value="camera"><Video className="mr-2" /> {t('useCamera')}</TabsTrigger>
              </TabsList>
              <TabsContent value="upload">
                <div className="space-y-2 pt-4">
                  <Input id="image-upload" type="file" accept="image/*" className="hidden" {...register('image', { onChange: handleImageChange, validate: (value) => (value && value.length > 0) || imagePreview !== null || t('noImage') })} />
                  <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">{t('uploadOrDrag')}</p>
                  </label>
                   {errors.image && !imagePreview && <p className="text-destructive text-sm">{errors.image.message}</p>}
                </div>
              </TabsContent>
              <TabsContent value="camera">
                <div className="space-y-4 pt-4">
                    <div className="w-full aspect-video rounded-md border bg-muted overflow-hidden relative flex items-center justify-center">
                        <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                        <canvas ref={canvasRef} className="hidden" />
                         {hasCameraPermission === false && (
                            <Alert variant="destructive" className="w-auto m-4">
                               <AlertTitle>{t('cameraAccessDeniedTitle')}</AlertTitle>
                                <AlertDescription>
                                    {t('cameraAccessDeniedDesc')}
                                </AlertDescription>
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
                      <div className="flex justify-between items-center">
                        <div className='flex items-center'>
                           <ShieldAlert className="h-4 w-4" />
                           <AlertTitle className="ml-2">{t('error')}</AlertTitle>
                        </div>
                         <Button variant="outline" size="sm" asChild>
                           <Link href="/dashboard/help"><LifeBuoy className="mr-2" /> {t('contactSupport')}</Link>
                         </Button>
                      </div>
                      <AlertDescription className="mt-2">{error}</AlertDescription>
                    </Alert>
                </motion.div>
            )}
            {diagnosis && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="bg-background">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bot />
                            <CardTitle className="font-headline">{t('diagnosisResult')}</CardTitle>
                        </div>
                        <AudioPlayer textToSpeak={`Disease: ${diagnosis.disease}. Treatment: ${diagnosis.treatment}. Remedies: ${diagnosis.remedies}`} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-muted-foreground">{t('disease')}</h3>
                        <p className="text-lg">{diagnosis.disease}</p>
                      </div>
                       <div>
                        <h3 className="font-semibold text-muted-foreground">{t('treatment')}</h3>
                        <HighlightedText text={diagnosis.treatment} />
                      </div>
                       {diagnosis.pesticideRecommendations && diagnosis.pesticideRecommendations.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-muted-foreground">Pesticide Recommendations</h3>
                            <div className="space-y-3 mt-2">
                                {diagnosis.pesticideRecommendations.map((p, index) => (
                                    <div key={index} className="p-4 bg-muted/50 rounded-lg">
                                        <p className="font-bold text-primary">{p.pesticideName}</p>
                                        <p className="text-sm my-1">{p.usageInstructions}</p>
                                        <Button size="sm" variant="outline" asChild>
                                            <a href={p.productUrl} target="_blank" rel="noopener noreferrer">
                                                <ShoppingCart className="mr-2" /> {t('buyNow')}
                                            </a>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                       )}
                      <div>
                        <h3 className="font-semibold text-muted-foreground">{t('remedies')}</h3>
                        <p>{diagnosis.remedies}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-muted-foreground">{t('confidence')}</h3>
                        <p className="text-lg font-bold text-primary">{(diagnosis.confidence * 100).toFixed(0)}%</p>
                      </div>
                    </CardContent>
                </Card>
              </motion.div>
            )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
