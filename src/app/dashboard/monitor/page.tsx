
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Bot, Loader2, Activity, Sprout, Video, Camera, SwitchCamera, Mic, PlusCircle, LineChart, Image as ImageIcon } from 'lucide-react';
import { format, formatDistanceToNowStrict, differenceInDays } from 'date-fns';

import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { monitorCropGrowth, CropGrowthOutput } from '@/ai/flows/daily-crop-growth';
import { generateSpeech } from '@/ai/flows/tts-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { getTtsLanguageCode } from '@/lib/translations';
import { AudioPlayer } from '@/components/AudioPlayer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, getDocs, orderBy } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

// --- Types ---

interface Crop {
  id: string;
  userId: string;
  cropType: string;
  sowingDate: Date;
  location: string;
}

interface Snap {
    id: string;
    imageUrl: string;
    timestamp: any;
    daysSinceSowing: number;
    aiAnalysis: CropGrowthOutput;
}

type RegisterCropInputs = {
  cropType: string;
  sowingDate: Date;
  location: string;
};

type AddSnapInputs = {
    image: FileList;
};

type FacingMode = 'user' | 'environment';


// --- Main Component ---
export default function MonitorPage() {
    const { t } = useLanguage();
    const [user, authLoading] = useAuthState(auth);
    const [crops, setCrops] = useState<Crop[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const registerForm = useForm<RegisterCropInputs>();

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);
        const q = query(collection(db, "userCrops"), where("userId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userCrops = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                sowingDate: doc.data().sowingDate.toDate()
            } as Crop));
            setCrops(userCrops);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching crops:", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const onRegisterCrop: SubmitHandler<RegisterCropInputs> = async (data) => {
        if (!user) return;
        setIsRegistering(true);
        try {
            await addDoc(collection(db, "userCrops"), {
                userId: user.uid,
                ...data,
                cropId: `${user.uid}_${data.cropType.toLowerCase()}_${format(data.sowingDate, 'yyyy-MM-dd')}`,
                createdAt: serverTimestamp(),
            });
            setIsFormOpen(false);
            registerForm.reset();
        } catch (error) {
            console.error("Error registering crop", error);
        } finally {
            setIsRegistering(false);
        }
    };
    
    if (isLoading || authLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }
    
    return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                     <div>
                        <CardTitle className="font-headline text-2xl">{t('growthMonitoringTitle')}</CardTitle>
                        <CardDescription>{t('growthMonitoringDesc')}</CardDescription>
                    </div>
                     <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                           <Button><PlusCircle className="mr-2" /> {t('registerNewCrop')}</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t('registerNewCrop')}</DialogTitle>
                            </DialogHeader>
                             <form onSubmit={registerForm.handleSubmit(onRegisterCrop)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t('cropType')}</Label>
                                    <Input {...registerForm.register('cropType', { required: true })} placeholder={t('egTomato')} />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('location')}</Label>
                                    <Input {...registerForm.register('location', { required: true })} placeholder={t('egAndhraPradesh')} />
                                </div>
                                 <div className="space-y-2">
                                    <Label>{t('sowingDate')}</Label>
                                    <Controller
                                        name="sowingDate"
                                        control={registerForm.control}
                                        rules={{ required: true }}
                                        render={({ field }) => (
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                        {field.value ? format(field.value, 'PPP') : <span>{t('pickDate')}</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                                            </Popover>
                                        )}
                                    />
                                </div>
                                <DialogFooter>
                                     <Button type="submit" disabled={isRegistering}>
                                        {isRegistering ? <Loader2 className="animate-spin" /> : t('registerCrop')}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
            </Card>

            {crops.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {crops.map(crop => <CropCard key={crop.id} crop={crop} />)}
                </div>
            ) : (
                <Card className="text-center p-10 border-dashed">
                    <CardContent>
                        <p className="text-muted-foreground">{t('noCropsRegistered')}</p>
                        <Button variant="link" onClick={() => setIsFormOpen(true)}>{t('registerYourFirstCrop')}</Button>
                    </CardContent>
                </Card>
            )}
            
        </motion.div>
    );
}

// --- Crop Card Component ---
function CropCard({ crop }: { crop: Crop }) {
    const { t } = useLanguage();
    const [snaps, setSnaps] = useState<Snap[]>([]);
    const [isSnapsLoading, setIsSnapsLoading] = useState(true);
    const [isSnapFormOpen, setIsSnapFormOpen] = useState(false);
    const lastSnap = snaps[0];
    
    useEffect(() => {
        const snapsRef = collection(db, 'userCrops', crop.id, 'snaps');
        const q = query(snapsRef, orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedSnaps = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Snap));
            setSnaps(fetchedSnaps);
            setIsSnapsLoading(false);
        });
        return () => unsubscribe();
    }, [crop.id]);

    const daysSinceSowing = differenceInDays(new Date(), crop.sowingDate);
    
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>{crop.cropType}</CardTitle>
                <CardDescription>{t('sownOn', { date: format(crop.sowingDate, 'PPP') })}</CardDescription>
                <div className="text-sm font-semibold text-primary pt-2">{t('daysOld', { count: daysSinceSowing })}</div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                 <div className="aspect-video bg-muted rounded-md relative overflow-hidden">
                    {isSnapsLoading ? (
                        <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>
                    ) : lastSnap?.imageUrl ? (
                        <Image src={lastSnap.imageUrl} alt={`${crop.cropType} snap`} layout="fill" objectFit="cover" />
                    ) : (
                         <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <ImageIcon className="h-10 w-10 mb-2"/>
                            <p>{t('noSnapsYet')}</p>
                         </div>
                    )}
                </div>
                 {lastSnap && (
                    <div className="text-xs text-muted-foreground">
                        {t('lastSnapTaken', { time: formatDistanceToNowStrict(lastSnap.timestamp.toDate(), { addSuffix: true }) })}
                    </div>
                 )}
            </CardContent>
            <CardFooter className="flex gap-2">
                <Dialog open={isSnapFormOpen} onOpenChange={setIsSnapFormOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full"><PlusCircle /> {t('addNewSnap')}</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('addNewSnapFor', { cropType: crop.cropType })}</DialogTitle>
                        </DialogHeader>
                        <AddSnapForm crop={crop} onSnapAdded={() => setIsSnapFormOpen(false)} />
                    </DialogContent>
                </Dialog>
                <Button variant="outline" className="w-full" disabled><LineChart /> {t('viewReport')}</Button>
            </CardFooter>
        </Card>
    );
}

// --- Add Snap Form Component ---
function AddSnapForm({ crop, onSnapAdded }: { crop: Crop, onSnapAdded: () => void }) {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const { register, handleSubmit, formState: { errors }, setValue, clearErrors } = useForm<AddSnapInputs>();
    
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<CropGrowthOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [activeTab, setActiveTab] = useState('upload');
    const [facingMode, setFacingMode] = useState<FacingMode>('environment');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const stopCamera = useCallback(() => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
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
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
          console.error('Error accessing camera:', err);
          setHasCameraPermission(false);
          toast({ variant: 'destructive', title: t('cameraAccessDeniedTitle'), description: t('cameraAccessDeniedDesc') });
        }
    }, [stopCamera, t, toast]);

    useEffect(() => {
        if (activeTab === 'camera') {
          startCamera(facingMode);
        } else {
          stopCamera();
        }
        return () => stopCamera();
    }, [activeTab, facingMode, startCamera, stopCamera]);

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
    };
    
    const onSubmit: SubmitHandler<AddSnapInputs> = async (data) => {
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
            // Here you would fetch previous images and benchmark data to pass to the flow
            const daysSinceSowing = differenceInDays(new Date(), crop.sowingDate);
            const result = await monitorCropGrowth({
              photoDataUri: imageDataUri,
              cropType: crop.cropType,
              daysSincePlanting: daysSinceSowing,
              language: language,
            });
            setAnalysis(result);
            // After analysis, save snap to firestore
            const snapData = {
                imageUrl: imageDataUri, // In a real app, upload to storage and save URL
                timestamp: serverTimestamp(),
                daysSinceSowing: daysSinceSowing,
                aiAnalysis: result
            };
            await addDoc(collection(db, 'userCrops', crop.id, 'snaps'), snapData);
            toast({ title: t('success'), description: t('snapAddedSuccess') });
            onSnapAdded();
        } catch (e: any) {
            setError(e.message || t('errorDiagnosis'));
            toast({ variant: 'destructive', title: t('error'), description: e.message || t('errorDiagnosis') });
        } finally {
            setIsLoading(false);
        }
    };

    return (
         <div className="space-y-4">
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-4">
                    <Tabs defaultValue="upload" className="w-full" onValueChange={setActiveTab} value={activeTab}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="upload"><Upload className="mr-2" />{t('uploadImage')}</TabsTrigger>
                            <TabsTrigger value="camera"><Video className="mr-2" />{t('useCamera')}</TabsTrigger>
                        </TabsList>
                        <TabsContent value="upload">
                            <Input id="image-upload-snap" type="file" accept="image/*" className="hidden" {...register('image', { onChange: handleImageChange, validate: (v) => (v && v.length > 0) || imagePreview !== null || t('noImage') })} />
                            <label htmlFor="image-upload-snap" className="mt-4 cursor-pointer flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-lg hover:bg-muted/50">
                                <Upload className="h-10 w-10 text-muted-foreground" />
                                <p className="mt-2 text-sm text-muted-foreground">{t('uploadOrDrag')}</p>
                            </label>
                            {errors.image && !imagePreview && <p className="text-destructive text-sm mt-2">{errors.image.message}</p>}
                        </TabsContent>
                         <TabsContent value="camera">
                            <div className="space-y-4 pt-4">
                                <div className="w-full aspect-video rounded-md border bg-muted overflow-hidden relative flex items-center justify-center">
                                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                                    <canvas ref={canvasRef} className="hidden" />
                                </div>
                                <Button type="button" onClick={handleCapture} className="w-full" disabled={!hasCameraPermission}><Camera className="mr-2" />{t('captureImage')}</Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                    {imagePreview && (
                        <div className="pt-4">
                            <Label>{t('imagePreview')}</Label>
                            <div className="mt-2 relative w-full h-48 rounded-lg overflow-hidden border">
                            <Image src={imagePreview} alt="Preview" layout="fill" objectFit="cover" />
                            </div>
                        </div>
                    )}
                </div>
                 <Button type="submit" className="w-full !mt-6" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Activity />}
                    {t('analyzeGrowth')}
                </Button>
            </form>
            {analysis && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 space-y-2">
                    <h3 className="font-semibold">{t('analysisResult')}</h3>
                    <p><strong>{t('growthStage')}:</strong> {analysis.growthStage}</p>
                    <p><strong>{t('observations')}:</strong> {analysis.observations}</p>
                    <p><strong>{t('recommendations')}:</strong> {analysis.recommendations}</p>
                 </motion.div>
            )}
        </div>
    );
}
