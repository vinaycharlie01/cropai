
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Cloud, CloudRain, Wind, Droplets, MapPin, Search, Loader2, ShieldAlert, Bug, Leaf, AlertTriangle, CloudFog, Upload, Mic, LocateFixed } from 'lucide-react';

import { getWeatherForecast, WeatherForecastOutput, DailyForecast } from '@/ai/flows/weather-forecast';
import { getRiskAlerts, RiskAlert } from '@/ai/flows/get-risk-alerts';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, GeoPoint } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { getTtsLanguageCode } from '@/lib/translations';


type WeatherFormInputs = {
  location: string;
};

type PestReportInputs = {
  cropType: string;
  pestName: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  image?: FileList;
};

type SttField = 'location' | 'cropType' | 'pestName' | 'description';

const WeatherIcon = ({ condition, className }: { condition: string; className?: string }) => {
  const lowerCaseCondition = condition.toLowerCase();
  if (lowerCaseCondition.includes('sun') || lowerCaseCondition.includes('clear')) {
    return <Sun className={className} />;
  }
  if (lowerCaseCondition.includes('rain') || lowerCaseCondition.includes('drizzle')) {
    return <CloudRain className={className} />;
  }
   if (lowerCaseCondition.includes('thunderstorm')) {
    return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21.73 18a2.73 2.73 0 0 0-2.43-1.5H16.5A4.5 4.5 0 0 0 12 12V8.27a4.5 4.5 0 0 0-4.5-4.5H7.1a4.5 4.5 0 0 0-4.32 3.53"/><path d="M16 16.5a2.5 2.5 0 1 1 0 5H18"/><path d="m13 19.5-2-4.5 4.5-2.5-2 4.5Z"/></svg>;
  }
  if (lowerCaseCondition.includes('fog') || lowerCaseCondition.includes('mist') || lowerCaseCondition.includes('haze') ) {
    return <CloudFog className={className} />;
  }
  if (lowerCaseCondition.includes('wind')) {
    return <Wind className={className} />;
  }
  return <Cloud className={className} />;
};

export default function WeatherPage() {
  const { t, language } = useLanguage();
  const weatherForm = useForm<WeatherFormInputs>();
  const pestReportForm = useForm<PestReportInputs>();
  
  const [forecastData, setForecastData] = useState<WeatherForecastOutput | null>(null);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAlertsLoading, setIsAlertsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmittingPest, setIsSubmittingPest] = useState(false);
  const [activeSttField, setActiveSttField] = useState<SttField | null>(null);

  const { toast } = useToast();
  const { user } = useAuth();
  
  const onRecognitionResult = useCallback((result: string) => {
    if (activeSttField === 'location') {
      weatherForm.setValue('location', result, { shouldValidate: true });
    } else {
      pestReportForm.setValue(activeSttField as keyof PestReportInputs, result, { shouldValidate: true });
    }
  }, [activeSttField, weatherForm, pestReportForm]);

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
    if (isListening && activeSttField === field) {
        stopListening();
    } else {
        setActiveSttField(field);
        const ttsLang = getTtsLanguageCode(language);
        startListening(ttsLang);
    }
  };

  const fetchWeatherAndAlerts = useCallback(async ({ lat, lon, locationName }: { lat?: number; lon?: number; locationName?: string }) => {
    setIsLoading(true);
    setIsAlertsLoading(true);
    setError(null);
    setForecastData(null);
    setAlerts([]);

    let weatherResult: WeatherForecastOutput | null = null;

    // Fetch Weather
    try {
        weatherResult = await getWeatherForecast({ lat, lon, location: locationName });
        setForecastData(weatherResult);
    } catch (e) {
        console.error("Weather fetch error:", e);
        const errorMessage = t('errorWeather');
        setError(errorMessage);
        toast({ variant: 'destructive', title: t('error'), description: errorMessage });
        setIsLoading(false);
        setIsAlertsLoading(false);
        return; // Stop if weather fails
    } finally {
        setIsLoading(false);
    }
    
    // Fetch Alerts using location from weather result
    if (weatherResult?.location) {
        try {
            const alertsResult = await getRiskAlerts({ location: weatherResult.location, cropType: 'various' });
            setAlerts(alertsResult);
        } catch (e) {
            console.error("Risk alerts fetch error:", e);
            toast({ variant: 'destructive', title: t('error'), description: "Could not fetch risk alerts." });
        } finally {
            setIsAlertsLoading(false);
        }
    } else {
        setIsAlertsLoading(false);
    }
  }, [t, toast]);


  const onWeatherSubmit: SubmitHandler<WeatherFormInputs> = async (data) => {
    fetchWeatherAndAlerts({ locationName: data.location });
  };

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
        toast({ variant: 'destructive', title: 'Geolocation Not Supported', description: 'Your browser does not support geolocation.' });
        return;
    }
    fetchWeatherAndAlerts({ lat: undefined, lon: undefined, locationName: undefined }); // Clear previous data
    navigator.geolocation.getCurrentPosition(
        (position) => {
            fetchWeatherAndAlerts({ lat: position.coords.latitude, lon: position.coords.longitude });
        },
        (error) => {
            setIsLoading(false);
            toast({ variant: 'destructive', title: 'Location Error', description: 'Could not retrieve your location. Please enter it manually.' });
            console.error(error);
        }
    );
  }, [fetchWeatherAndAlerts, toast]);
  
   useEffect(() => {
    // Automatically fetch weather for current location on initial load
    handleUseCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

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

  const onPestSubmit: SubmitHandler<PestReportInputs> = async (data) => {
    if (!user) {
        toast({ variant: 'destructive', title: t('error'), description: 'You must be logged in to report.'});
        return;
    }
    setIsSubmittingPest(true);
    try {
        let imageUrl = '';
        if (data.image && data.image.length > 0) {
            const file = data.image[0];
            const storageRef = ref(storage, `pest-reports/${user.uid}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            imageUrl = await getDownloadURL(storageRef);
        }

        // Mock geopoint for now
        const location = new GeoPoint(17.3850, 78.4867);

        await addDoc(collection(db, 'pestReports'), {
            userId: user.uid,
            cropType: data.cropType,
            pestName: data.pestName,
            severity: data.severity,
            description: data.description,
            imageUrl: imageUrl,
            location: location,
            reportedAt: serverTimestamp(),
        });

        toast({ title: "Report Submitted", description: "Thank you for contributing to community pest monitoring."});
        pestReportForm.reset();
        setImagePreview(null);
    } catch (e) {
        console.error("Pest report submission error:", e);
        toast({ variant: 'destructive', title: t('error'), description: "Failed to submit your report."});
    } finally {
        setIsSubmittingPest(false);
    }
  };

  const RiskLevelBadge = ({ level }: { level: string }) => {
    const variant = level === 'high' ? 'destructive' : level === 'medium' ? 'secondary' : 'default';
    const levelClass = level === 'high' ? 'bg-red-500/80' : level === 'medium' ? 'bg-yellow-500/80' : 'bg-green-500/80';
    return <Badge variant={variant} className={cn('capitalize', levelClass, variant === 'destructive' && 'text-white')}>{level}</Badge>
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <Card className="bg-background">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">{t('weatherForecast')}</CardTitle>
            <CardDescription>{t('weatherInstruction')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={weatherForm.handleSubmit(onWeatherSubmit)} className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-full flex-grow space-y-2">
                <Label htmlFor="location" className="sr-only">{t('location')}</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="location"
                    placeholder={t('egAndhraPradesh')}
                    className="pl-10 pr-12"
                    {...weatherForm.register('location')}
                  />
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
                {weatherForm.formState.errors.location && <p className="text-destructive text-sm">{weatherForm.formState.errors.location.message}</p>}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                 <Button type="submit" disabled={isLoading} className="flex-1">
                    <Search className="h-4 w-4" />
                    <span className="ml-2 hidden md:inline">{t('search')}</span>
                </Button>
                 <Button type="button" onClick={handleUseCurrentLocation} disabled={isLoading} variant="outline" className="flex-1">
                    <LocateFixed className="h-4 w-4" />
                    <span className="ml-2 hidden md:inline">{t('useCurrentLocation')}</span>
                 </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div variants={itemVariants} initial="hidden" animate="visible" exit="hidden">
            <Alert variant="destructive">
              <AlertTitle>{t('error')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
             {isLoading ? (
                 <Card>
                    <CardHeader>
                        <div className="h-6 w-1/2 bg-muted rounded animate-pulse"></div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[...Array(5)].map((_, i) => (
                             <Card key={i} className="bg-muted/30 text-center h-full flex flex-col justify-between p-2">
                                <div className="h-5 w-1/2 mx-auto bg-muted rounded animate-pulse mb-2"></div>
                                <div className="w-16 h-16 mx-auto bg-muted rounded-full animate-pulse mb-2"></div>
                                <div className="h-8 w-1/3 mx-auto bg-muted rounded animate-pulse mb-2"></div>
                                <div className="h-4 w-2/3 mx-auto bg-muted rounded animate-pulse mb-2"></div>
                                <div className="h-4 w-1/2 mx-auto bg-muted rounded animate-pulse"></div>
                             </Card>
                        ))}
                    </CardContent>
                 </Card>
            ) : forecastData && (
              <motion.div variants={itemVariants}>
                <Card className="bg-background">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl">{t('forecastFor')} {forecastData.location}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                          {forecastData.forecast.map((day, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="bg-muted/30 text-center hover:shadow-lg transition-shadow h-full flex flex-col justify-between">
                                    <CardHeader className="pb-2">
                                      <CardTitle className="text-base md:text-lg">{day.day}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-col items-center gap-2 p-2 md:p-6">
                                      <WeatherIcon condition={day.condition} className="w-12 h-12 md:w-16 md:h-16 text-primary" />
                                      <p className="text-2xl md:text-3xl font-bold">{day.temperature}</p>
                                      <p className="text-muted-foreground text-xs md:text-sm capitalize">{day.condition}</p>
                                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                          <Droplets className="w-4 h-4" />
                                          <span>{day.humidity}</span>
                                      </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                          ))}
                        </div>
                    </CardContent>
                </Card>
              </motion.div>
            )}
            

             <motion.div variants={itemVariants}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline text-xl"><ShieldAlert/> AgriShield AI - Risk Alerts</CardTitle>
                        <CardDescription>AI-powered pest and weather risk predictions for your location.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isAlertsLoading ? (
                            <div className="flex justify-center items-center h-40">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : alerts.length > 0 ? (
                            <div className="space-y-4">
                                {alerts.map((alert, index) => (
                                    <Card key={index} className={cn(
                                      'border-l-4',
                                      alert.riskLevel === 'high' && 'border-red-500 bg-red-500/5',
                                      alert.riskLevel === 'medium' && 'border-yellow-500 bg-yellow-500/5',
                                      alert.riskLevel === 'low' && 'border-green-500 bg-green-500/5',
                                    )}>
                                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                                            <div className="flex items-center gap-2">
                                                {alert.riskType === 'pest' ? <Bug className="h-5 w-5"/> : <AlertTriangle className="h-5 w-5"/>}
                                                <CardTitle className="text-lg capitalize">{alert.riskType} Alert</CardTitle>
                                            </div>
                                            <RiskLevelBadge level={alert.riskLevel} />
                                        </CardHeader>
                                        <CardContent>
                                            <p className="font-semibold">{alert.advisory}</p>
                                            <div className="text-sm text-muted-foreground mt-2 flex justify-between">
                                                <span><Leaf className="inline h-4 w-4 mr-1"/>{alert.cropAffected}</span>
                                                <span>Predicted for: {new Date(alert.predictedDate).toLocaleDateString()}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-10">
                                <p>No alerts for your location right now.</p>
                                <p>Enter a location above to check for risks.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={itemVariants}>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline text-xl"><Bug/> Community Pest Report</CardTitle>
                    <CardDescription>Spotted a pest? Report it to help the community.</CardDescription>
                </CardHeader>
                <form onSubmit={pestReportForm.handleSubmit(onPestSubmit)}>
                    <CardContent className="space-y-4">
                         <div className="space-y-1">
                            <Label htmlFor="cropTypePest">Crop Affected</Label>
                            <div className="relative">
                                <Input id="cropTypePest" {...pestReportForm.register('cropType', { required: true })} placeholder="e.g., Cotton" />
                                <Button type="button" size="icon" variant="ghost" onClick={() => handleSttToggle('cropType')} className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" disabled={!isSupported}>
                                    <Mic className={`h-5 w-5 ${isListening && activeSttField === 'cropType' ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="pestName">Pest Name</Label>
                            <div className="relative">
                                <Input id="pestName" {...pestReportForm.register('pestName', { required: true })} placeholder="e.g., Pink Bollworm"/>
                                <Button type="button" size="icon" variant="ghost" onClick={() => handleSttToggle('pestName')} className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" disabled={!isSupported}>
                                    <Mic className={`h-5 w-5 ${isListening && activeSttField === 'pestName' ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="severity">Severity</Label>
                            <Controller
                                name="severity"
                                control={pestReportForm.control}
                                rules={{ required: true }}
                                render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger><SelectValue placeholder="Select severity" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                                )}
                            />
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="description">Description (Optional)</Label>
                             <div className="relative">
                                <Textarea id="description" {...pestReportForm.register('description')} placeholder="Describe what you see..."/>
                                <Button type="button" size="icon" variant="ghost" onClick={() => handleSttToggle('description')} className="absolute right-1 top-2 h-8 w-8" disabled={!isSupported}>
                                    <Mic className={`h-5 w-5 ${isListening && activeSttField === 'description' ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="image">Upload Photo (Optional)</Label>
                          <Input id="image" type="file" accept="image/*" {...pestReportForm.register('image', { onChange: handleImageChange })} />
                          {imagePreview && (
                            <div className="mt-2 relative w-full h-32 rounded-lg overflow-hidden border">
                                <Image src={imagePreview} alt="Pest preview" layout="fill" objectFit="cover" />
                            </div>
                           )}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isSubmittingPest}>
                            {isSubmittingPest ? <Loader2 className="mr-2 animate-spin"/> : <Bug className="mr-2"/>}
                            Submit Report
                        </Button>
                    </CardFooter>
                </form>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
