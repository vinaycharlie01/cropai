
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Upload, Leaf, ShieldAlert, Loader2, Bot, PlusCircle, Video, Camera, SwitchCamera, Mic, Play, Pause, ShoppingCart } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';

import { diagnoseCropDisease, DiagnoseCropDiseaseOutput } from '@/ai/flows/diagnose-crop-disease';
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
import type { TranslationKeys } from '@/lib/translations';
import { Separator } from '@/components/ui/separator';

type FormInputs = {
  cropType: string;
  location: string;
  image: FileList;
};

type FacingMode = 'user' | 'environment';

const SpeechRecognition = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

const playSound = (freq: number, type: 'sine' | 'square' = 'sine') => {
    if (typeof window.AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') return;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.5);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [listeningField, setListeningField] = useState<keyof FormInputs | null>(null);
  const recognitionRef = useRef<any>(null);

  const diagnosisAudio = useAudioPlayer();

  useEffect(() => {
    if (SpeechRecognition && !recognitionRef.current) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            const currentListeningField = (recognition as any)._listeningField;
            if (currentListeningField) {
                setValue(currentListeningField, transcript, { shouldValidate: true });
            }
        };

        recognition.onaudiostart = () => {
            playSound(440, 'sine');
        };

        recognition.onaudioend = () => {
            playSound(220, 'sine');
            setListeningField(null);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            if (event.error !== 'no-speech') {
                toast({ variant: 'destructive', title: t('error'), description: "Could not recognize speech." });
            }
            setListeningField(null);
        };

        recognition.onend = () => {
            setListeningField(null);
        };

        recognitionRef.current = recognition;
    }
  }, [setValue, t, toast]);


  const toggleListening = (field: keyof FormInputs) => {
    if (!SpeechRecognition || !recognitionRef.current) return;
    const recognition = recognitionRef.current;

    if (listeningField === field) {
        recognition.stop();
        setListeningField(null);
    } else {
        if(listeningField) {
            recognition.stop();
        }
        (recognition as any)._listeningField = field;
        recognition.lang = language;
        setListeningField(field);
        try {
            recognition.start();
        } catch (e) {
            console.error("Could not start recognition", e);
            setListeningField(null);
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
    diagnosisAudio.cleanup();
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

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    setIsLoading(true);
    setError(null);
    setDiagnosis(null);
    diagnosisAudio.cleanup();

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
        if (result) {
            let diagnosisText = `${t('disease')}: ${result.disease}. ${t('remedies')}: ${result.remedies}. ${t('treatment')}: ${result.treatment}.`;
            if (diagnosisText.trim().length > 0) {
                diagnosisAudio.generateAudio(diagnosisText, language);
            }
        }
      } catch (e) {
        console.error(e);
        setError(t('errorDiagnosis'));
        toast({ variant: "destructive", title: t('error'), description: t('errorDiagnosis') });
      } finally {
        setIsLoading(false);
      }
  };
  
  const renderInputWithMic = (id: keyof FormInputs, placeholderKey: TranslationKeys, requiredMessageKey: TranslationKeys) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{t(id as TranslationKeys)}</Label>
      <div className="relative">
        <Input id={id} placeholder={t(placeholderKey)} {...register(id, { required: t(requiredMessageKey) })} />
        {SpeechRecognition && (
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 ${listeningField === id ? "text-destructive animate-pulse" : ""}`}
                onClick={() => toggleListening(id)}
            >
                <Mic className="h-4 w-4" />
            </Button>
        )}
      </div>
      {errors[id] && <p className="text-destructive text-sm">{errors[id]?.message}</p>}
    </div>
  );

  const AudioControls = ({ audioHook }: { audioHook: ReturnType<typeof useAudioPlayer>}) => {
    const { isPlaying, play, pause } = audioHook;

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
             {renderInputWithMic('cropType', 'egTomato', 'cropTypeRequired')}
             {renderInputWithMic('location', 'egAndhraPradesh', 'locationRequired')}
            
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
                        {diagnosisAudio.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                        {diagnosisAudio.audioUrl && <AudioControls audioHook={diagnosisAudio} />}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-muted-foreground">{t('disease')}</h3>
                        <p className="text-lg">{diagnosis.disease}</p>
                      </div>
                       <div>
                        <h3 className="font-semibold text-muted-foreground">{t('treatment')}</h3>
                        <p>{diagnosis.treatment}</p>
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
                </Card>
              </motion.div>
            )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
