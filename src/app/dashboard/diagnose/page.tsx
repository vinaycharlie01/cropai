
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Upload, Leaf, ShieldAlert, Loader2, Bot, PlusCircle, Video, Camera, SwitchCamera, Mic, Play, Pause, Volume2 } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';

import { diagnoseCropDisease, DiagnoseCropDiseaseOutput } from '@/ai/flows/diagnose-crop-disease';
import { suggestTreatment, SuggestTreatmentOutput } from '@/ai/flows/smart-treatment-suggestions';
import { useAudioPlayer } from '@/hooks/use-audio-player';

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

type FacingMode = 'user' | 'environment';

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function DiagnosePage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { register, handleSubmit, watch, formState: { errors }, setValue, clearErrors } = useForm<FormInputs>();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnoseCropDiseaseOutput | null>(null);
  const [treatment, setTreatment] = useState<SuggestTreatmentOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTreatmentLoading, setIsTreatmentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const diagnosisAudio = useAudioPlayer();
  const treatmentAudio = useAudioPlayer();

  useEffect(() => {
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = language; 

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const targetField = (recognitionRef.current as any).targetField as keyof FormInputs;
        if (targetField) {
            setValue(targetField, transcript, { shouldValidate: true });
        }
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        toast({ variant: 'destructive', title: t('error'), description: "Could not recognize speech." });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [language, setValue, toast]);


  const startListening = (field: keyof FormInputs) => {
    if (recognitionRef.current) {
        if(isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            (recognitionRef.current as any).targetField = field;
            recognitionRef.current.start();
            setIsListening(true);
        }
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
    // Reset audio players when tab changes
    diagnosisAudio.cleanup();
    treatmentAudio.cleanup();
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
        setTreatment(null);
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
        setTreatment(null);
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

  const getTreatmentSuggestions = async () => {
    if (!diagnosis) return;
    setIsTreatmentLoading(true);
    setError(null);
    treatmentAudio.cleanup();
    const { cropType, location } = watch();
    try {
      const result = await suggestTreatment({ cropType, disease: diagnosis.disease, location });
      setTreatment(result);
      treatmentAudio.generateAudio(result.treatmentSuggestions, language);
    } catch (e) {
      setError(t('errorDiagnosis'));
      toast({ variant: "destructive", title: t('error'), description: "Could not generate treatment suggestions." });
    } finally {
      setIsTreatmentLoading(false);
    }
  };

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    let imageDataUri: string | null = imagePreview;

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
            title: t('error'),
            description: t('noImage'),
        })
        return;
    }

    setIsLoading(true);
    setError(null);
    setDiagnosis(null);
    setTreatment(null);
    diagnosisAudio.cleanup();
    treatmentAudio.cleanup();
    
    try {
        const result = await diagnoseCropDisease({
          photoDataUri: imageDataUri,
          cropType: data.cropType,
          location: data.location,
          language: language,
        });
        setDiagnosis(result);
        const diagnosisText = `${t('disease')}: ${result.disease}. ${t('remedies')}: ${result.remedies}`;
        diagnosisAudio.generateAudio(diagnosisText, language);
      } catch (e) {
        console.error(e);
        setError(t('errorDiagnosis'));
        toast({ variant: "destructive", title: t('error'), description: t('errorDiagnosis') });
      } finally {
        setIsLoading(false);
      }
  };
  
  const renderInputWithMic = (id: keyof FormInputs, placeholder: string, requiredMessage: string) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{t(id as TranslationKeys)}</Label>
      <div className="relative">
        <Input id={id} placeholder={placeholder} {...register(id, { required: requiredMessage })} />
        {SpeechRecognition && (
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 ${isListening && (recognitionRef.current as any)?.targetField === id ? "text-destructive animate-pulse" : ""}`}
                onClick={() => startListening(id)}
            >
                <Mic className="h-4 w-4" />
            </Button>
        )}
      </div>
      {errors[id] && <p className="text-destructive text-sm">{errors[id]?.message}</p>}
    </div>
  );

  const AudioControls = ({ audioHook }: { audioHook: ReturnType<typeof useAudioPlayer>}) => {
    const { isLoading, isPlaying, play, pause } = audioHook;

    if (isLoading) {
      return <Loader2 className="h-5 w-5 animate-spin" />;
    }
    if (isPlaying) {
      return <Pause className="h-5 w-5 cursor-pointer" onClick={pause} />;
    }
    return <Play className="h-5 w-5 cursor-pointer" onClick={play} />;
  }

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
             {renderInputWithMic('cropType', t('egTomato'), t('cropTypeRequired'))}
             {renderInputWithMic('location', t('egAndhraPradesh'), t('locationRequired'))}
            
            <Tabs defaultValue="upload" className="w-full" onValueChange={handleTabChange} value={activeTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload"><Upload className="mr-2" /> {t('uploadImage')}</TabsTrigger>
                <TabsTrigger value="camera"><Video className="mr-2" /> {t('useCamera')}</TabsTrigger>
              </TabsList>
              <TabsContent value="upload">
                <div className="space-y-2 pt-4">
                  <Input id="image-upload" type="file" accept="image/*" className="hidden" {...register('image', { onChange: handleImageChange, validate: () => imagePreview !== null || activeTab === 'camera' || t('noImage') })} />
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
                      <ShieldAlert className="h-4 w-4" />
                      <AlertTitle>{t('error')}</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </motion.div>
            )}
            {diagnosis && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="bg-background">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot />
                        <CardTitle className="font-headline">{t('diagnosisResult')}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {diagnosisAudio.audioUrl && <AudioControls audioHook={diagnosisAudio} />}
                        {diagnosisAudio.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                      </div>
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
                       <Button onClick={getTreatmentSuggestions} disabled={isTreatmentLoading || !!treatment} className="w-full">
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
                        <CardHeader className="flex flex-row items-center justify-between">
                             <div className="flex items-center gap-2">
                                <Bot />
                                <CardTitle className="font-headline">{t('treatmentSuggestions')}</CardTitle>
                             </div>
                             <div className="flex items-center gap-2">
                                {treatmentAudio.audioUrl && <AudioControls audioHook={treatmentAudio} />}
                                {treatmentAudio.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                             </div>
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

    