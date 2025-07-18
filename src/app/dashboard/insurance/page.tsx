
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Upload,
  Loader2,
  FilePlus,
  CircleHelp,
  FileClock,
  CheckCircle,
  XCircle,
  Hourglass,
  BadgeIndianRupee,
  MapPin,
  Bot,
  Lightbulb,
} from 'lucide-react';
import { db, storage, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuthState } from 'react-firebase-hooks/auth';

import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getInsuranceAdvice, InsuranceAdviceOutput } from '@/ai/flows/insurance-advice';

// Form Types
type InsuranceFormInputs = {
  cropType: string;
  location: string;
  landArea: number;
  sowingDate: Date;
  harvestDate: Date;
  scheme: 'pmfby' | 'private';
  season: 'kharif' | 'rabi';
  sumInsured: number;
  landProof: FileList;
  idProof: FileList;
};

type ClaimFormInputs = {
  policyId: string;
  reason: string;
  description: string;
  damageProof: FileList;
};

// Data Types from Firestore
interface InsurancePolicy {
  id: string;
  cropType: string;
  location: string;
  sumInsured: number;
  status: 'active' | 'expired' | 'claimed';
  createdAt: any;
  harvestDate: any;
}

interface InsuranceClaim {
  id: string;
  policyId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  createdAt: any;
}

export default function InsurancePage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [user] = useAuthState(auth);

  const [activeTab, setActiveTab] = useState('register');
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [selectedPolicyForClaim, setSelectedPolicyForClaim] = useState<string | null>(null);

  // Fetch Policies
  useEffect(() => {
    if (!user) return;
    setIsDataLoading(true);
    const q = query(collection(db, 'insurance'), where('userId', '==', user.uid), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userPolicies = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InsurancePolicy));
      setPolicies(userPolicies);
      setIsDataLoading(false);
    }, (error) => {
      console.error("Error fetching policies:", error);
      toast({ variant: 'destructive', title: t('error'), description: 'Failed to load insurance policies.' });
      setIsDataLoading(false);
    });
    return () => unsubscribe();
  }, [user, toast, t]);

  // Fetch Claims
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'claims'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userClaims = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InsuranceClaim));
      setClaims(userClaims);
    }, (error) => {
      console.error("Error fetching claims:", error);
      toast({ variant: 'destructive', title: t('error'), description: 'Failed to load claims history.' });
    });
    return () => unsubscribe();
  }, [user, toast, t]);

  const handleFileClaim = (policyId: string) => {
    setSelectedPolicyForClaim(policyId);
    setActiveTab('claim');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <Shield /> {t('cropInsurance')}
          </CardTitle>
          <CardDescription>{t('cropInsuranceDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="register">{t('registerInsurance')}</TabsTrigger>
              <TabsTrigger value="status">{t('viewStatus')}</TabsTrigger>
              <TabsTrigger value="claim">{t('fileClaim')}</TabsTrigger>
            </TabsList>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <TabsContent value="register" className="pt-6">
                  <InsuranceRegistrationForm />
                </TabsContent>
                <TabsContent value="status" className="pt-6">
                  <StatusTracker policies={policies} claims={claims} isLoading={isDataLoading} onFileClaim={handleFileClaim} />
                </TabsContent>
                <TabsContent value="claim" className="pt-6">
                  <ClaimSubmissionForm
                    policies={policies}
                    selectedPolicyId={selectedPolicyForClaim}
                    onClaimSubmitted={() => setActiveTab('status')}
                  />
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// --- Insurance Registration Form Component ---
function InsuranceRegistrationForm() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const [user] = useAuthState(auth);
    const { register, handleSubmit, control, watch, formState: { errors } } = useForm<InsuranceFormInputs>();
    
    const [isLoading, setIsLoading] = useState(false);
    const [aiAdvice, setAiAdvice] = useState<InsuranceAdviceOutput | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const sumInsured = watch('sumInsured');
    const scheme = watch('scheme');
    const season = watch('season');
    const cropType = watch('cropType');
    const location = watch('location');
    const landArea = watch('landArea');

    const calculatePremium = useCallback(() => {
        if (!sumInsured || !scheme) return { farmerShare: 0, govtSubsidy: 0, total: 0 };
        
        // As per PMFBY: Kharif all crops: 2%, Rabi all crops: 1.5%. Simplified for this example.
        // Commercial and horticultural crops have higher rates, not implemented here for simplicity.
        const totalPremiumRate = 0.05; // Assumed total premium rate for calculation
        const totalPremium = sumInsured * totalPremiumRate;
        let farmerRate = totalPremiumRate;

        if (scheme === 'pmfby') {
            if (season === 'kharif') {
                farmerRate = 0.02; // 2% for Kharif
            } else if (season === 'rabi') {
                farmerRate = 0.015; // 1.5% for Rabi
            } else {
                farmerRate = 0.02; // Default fallback
            }
        }

        const farmerShare = sumInsured * farmerRate;
        const govtSubsidy = Math.max(0, totalPremium - farmerShare);

        return { farmerShare, govtSubsidy, total: totalPremium };
    }, [sumInsured, scheme, season]);

    const { farmerShare, govtSubsidy } = calculatePremium();

    const fetchAiAdvice = async () => {
        if (!cropType || !location || !landArea || !sumInsured) {
            toast({ variant: 'destructive', title: t('error'), description: t('fillAllFieldsForAdvice') });
            return;
        }
        setIsAiLoading(true);
        setAiAdvice(null);
        try {
            const result = await getInsuranceAdvice({
                cropType,
                location,
                landArea,
                sumInsured,
                language,
            });
            setAiAdvice(result);
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: t('error'), description: 'Failed to get AI advice.' });
        } finally {
            setIsAiLoading(false);
        }
    };

    const uploadFile = async (file: File, path: string): Promise<string> => {
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    const onSubmit: SubmitHandler<InsuranceFormInputs> = async (data) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in.' });
            return;
        }
        setIsLoading(true);
        try {
            const landProofUrl = await uploadFile(data.landProof[0], `insurance/${user.uid}/${Date.now()}_land`);
            const idProofUrl = await uploadFile(data.idProof[0], `insurance/${user.uid}/${Date.now()}_id`);

            await addDoc(collection(db, 'insurance'), {
                userId: user.uid,
                ...data,
                landProofUrl,
                idProofUrl,
                premium: calculatePremium(),
                status: 'active',
                createdAt: serverTimestamp(),
            });

            toast({ title: t('success'), description: t('insuranceRegisteredSuccess') });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: t('error'), description: 'Failed to register insurance.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="cropType">{t('cropType')}</Label>
                    <Input id="cropType" {...register('cropType', { required: true })} />
                    {errors.cropType && <p className="text-destructive text-sm">{t('fieldRequired')}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="location">{t('location')}</Label>
                    <Input id="location" placeholder={t('egAndhraPradesh')} {...register('location', { required: true })} />
                    {errors.location && <p className="text-destructive text-sm">{t('fieldRequired')}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="landArea">{t('landAreaAcres')}</Label>
                    <Input id="landArea" type="number" {...register('landArea', { required: true, valueAsNumber: true })} />
                    {errors.landArea && <p className="text-destructive text-sm">{t('fieldRequired')}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="sumInsured">{t('sumInsured')}</Label>
                    <Input id="sumInsured" type="number" {...register('sumInsured', { required: true, valueAsNumber: true })} />
                    {errors.sumInsured && <p className="text-destructive text-sm">{t('fieldRequired')}</p>}
                </div>
                 <div className="space-y-2">
                    <Label>{t('sowingDate')}</Label>
                    <Controller
                        name="sowingDate"
                        control={control}
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
                    {errors.sowingDate && <p className="text-destructive text-sm">{t('fieldRequired')}</p>}
                </div>
                <div className="space-y-2">
                    <Label>{t('harvestDate')}</Label>
                    <Controller
                        name="harvestDate"
                        control={control}
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
                    {errors.harvestDate && <p className="text-destructive text-sm">{t('fieldRequired')}</p>}
                </div>
                 <div className="space-y-2">
                    <Label>{t('insuranceScheme')}</Label>
                    <Controller
                        name="scheme"
                        control={control}
                        rules={{ required: true }}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger><SelectValue placeholder={t('selectScheme')} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pmfby">{t('pmfby')}</SelectItem>
                                    <SelectItem value="private">{t('privateInsurance')}</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.scheme && <p className="text-destructive text-sm">{t('fieldRequired')}</p>}
                </div>
                 <div className="space-y-2">
                    <Label>{t('season')}</Label>
                    <Controller
                        name="season"
                        control={control}
                        rules={{ required: true }}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger><SelectValue placeholder={t('selectSeason')} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="kharif">{t('kharif')}</SelectItem>
                                    <SelectItem value="rabi">{t('rabi')}</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.season && <p className="text-destructive text-sm">{t('fieldRequired')}</p>}
                </div>
                 {scheme === 'pmfby' && farmerShare > 0 && (
                    <Card className="bg-muted/50 md:col-span-2">
                        <CardHeader className="pb-2"><CardTitle className="text-base">{t('premiumDetails')}</CardTitle></CardHeader>
                        <CardContent className="space-y-1 text-sm">
                            <div className="flex justify-between"><span>{t('yourShare')}:</span> <span className="font-semibold">₹{farmerShare.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>{t('govtSubsidy')}:</span> <span className="font-semibold">₹{govtSubsidy.toFixed(2)}</span></div>
                            <hr className="my-1"/>
                            <div className="flex justify-between font-bold"><span>{t('totalPremium')}:</span> <span>₹{(farmerShare + govtSubsidy).toFixed(2)}</span></div>
                        </CardContent>
                    </Card>
                )}
                 <div className="space-y-2">
                    <Label htmlFor="landProof">{t('landProof')}</Label>
                    <Input id="landProof" type="file" accept="image/*,application/pdf" {...register('landProof', { required: true })} />
                    {errors.landProof && <p className="text-destructive text-sm">{t('fieldRequired')}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="idProof">{t('idProof')}</Label>
                    <Input id="idProof" type="file" accept="image/*,application/pdf" {...register('idProof', { required: true })} />
                    {errors.idProof && <p className="text-destructive text-sm">{t('fieldRequired')}</p>}
                </div>
            </div>

            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Bot /> {t('aiInsuranceAdvisor')}</CardTitle>
                    <CardDescription>{t('aiInsuranceAdvisorDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {isAiLoading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin" /> {t('gettingAdvice')}</div>}
                    {aiAdvice && (
                        <div className="space-y-4">
                            <div className="bg-background p-4 rounded-md">
                                <h4 className="font-semibold flex items-center gap-2"><Lightbulb className="text-yellow-400" /> {t('recommendation')}: <span className="text-primary">{aiAdvice.recommendation}</span></h4>
                                <p className="text-sm text-muted-foreground">{aiAdvice.reasoning}</p>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-background p-4 rounded-md">
                                    <h4 className="font-semibold">PMFBY</h4>
                                    <p className="text-sm text-muted-foreground">{aiAdvice.pmfbyDetails}</p>
                                </div>
                                <div className="bg-background p-4 rounded-md">
                                    <h4 className="font-semibold">{t('privateInsurance')}</h4>
                                    <p className="text-sm text-muted-foreground">{aiAdvice.privateDetails}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button type="button" variant="outline" onClick={fetchAiAdvice} disabled={isAiLoading}>
                        {isAiLoading ? <Loader2 className="mr-2 animate-spin" /> : <CircleHelp className="mr-2" />}
                        {t('getAiAdvice')}
                    </Button>
                </CardFooter>
            </Card>

            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <FilePlus className="mr-2" />}
                {t('registerInsurance')}
            </Button>
        </form>
    );
}

// --- Status Tracker Component ---
function StatusTracker({ policies, claims, isLoading, onFileClaim }: { policies: InsurancePolicy[], claims: InsuranceClaim[], isLoading: boolean, onFileClaim: (policyId: string) => void }) {
    const { t } = useLanguage();
    
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Hourglass className="h-5 w-5 text-yellow-500" />;
            case 'approved': return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'rejected': return <XCircle className="h-5 w-5 text-red-500" />;
            case 'paid': return <BadgeIndianRupee className="h-5 w-5 text-blue-500" />;
            case 'active': return <CheckCircle className="h-5 w-5 text-green-500" />;
            default: return <FileClock className="h-5 w-5 text-muted-foreground" />;
        }
    };
    
    if (isLoading) return <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin h-8 w-8" /></div>;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>{t('activePolicies')}</CardTitle></CardHeader>
                <CardContent>
                    {policies.length === 0 ? <p className="text-muted-foreground">{t('noActivePolicies')}</p> : (
                        <ul className="space-y-4">
                            {policies.map(p => (
                                <li key={p.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4">
                                    <div className="flex-1 space-y-1">
                                        <p className="font-semibold">{p.cropType} - ₹{p.sumInsured.toLocaleString()}</p>
                                        <p className="text-sm text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" /> {p.location}</p>
                                    </div>
                                    <Button onClick={() => onFileClaim(p.id)}>{t('fileClaim')}</Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>{t('claimHistory')}</CardTitle></CardHeader>
                <CardContent>
                    {claims.length === 0 ? <p className="text-muted-foreground">{t('noClaimsFound')}</p> : (
                        <ul className="space-y-2">
                           {claims.map(c => (
                                <li key={c.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                                    <div className="flex items-center gap-3">
                                        {getStatusIcon(c.status)}
                                        <div>
                                            <p className="font-semibold">{c.reason}</p>
                                            <p className="text-xs text-muted-foreground">Policy ID: {c.policyId.substring(0, 8)}...</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium capitalize">{t(c.status as any)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// --- Claim Submission Component ---
function ClaimSubmissionForm({ policies, selectedPolicyId, onClaimSubmitted }: { policies: InsurancePolicy[], selectedPolicyId: string | null, onClaimSubmitted: () => void }) {
    const { t } = useLanguage();
    const { toast } = useToast();
    const [user] = useAuthState(auth);
    const { register, handleSubmit, control, formState: { errors }, setValue } = useForm<ClaimFormInputs>();

    const [isLoading, setIsLoading] = useState(false);
    const [location, setLocation] = useState<{ lat: number, lon: number } | null>(null);

    useEffect(() => {
        if (selectedPolicyId) {
            setValue('policyId', selectedPolicyId);
        }
    }, [selectedPolicyId, setValue]);

    const captureLocation = () => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({ lat: position.coords.latitude, lon: position.coords.longitude });
                toast({ title: t('success'), description: t('locationCaptured') });
            },
            (error) => {
                toast({ variant: 'destructive', title: t('error'), description: 'Could not capture location.' });
                console.error("Geolocation error:", error);
            }
        );
    };

    const uploadFile = async (file: File, path: string): Promise<string> => {
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    const onSubmit: SubmitHandler<ClaimFormInputs> = async (data) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Not Authenticated' });
            return;
        }
        if (!location) {
            toast({ variant: 'destructive', title: t('error'), description: t('locationRequiredForClaim') });
            return;
        }
        setIsLoading(true);
        try {
            const damageProofUrl = await uploadFile(data.damageProof[0], `claims/${user.uid}/${Date.now()}_damage`);
            
            await addDoc(collection(db, 'claims'), {
                userId: user.uid,
                policyId: data.policyId,
                reason: data.reason,
                description: data.description,
                location,
                damageProofUrl,
                status: 'pending',
                createdAt: serverTimestamp(),
            });

            toast({ title: t('success'), description: t('claimSubmittedSuccess') });
            onClaimSubmitted();
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: t('error'), description: 'Failed to submit claim.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    if (policies.length === 0) {
        return <div className="text-center text-muted-foreground py-10">{t('noPoliciesToClaim')}</div>
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
                <Label>{t('selectPolicy')}</Label>
                <Controller
                    name="policyId"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                            <SelectTrigger><SelectValue placeholder={t('selectPolicyToClaim')} /></SelectTrigger>
                            <SelectContent>
                                {policies.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.cropType} - {p.location} (₹{p.sumInsured.toLocaleString()})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
                 {errors.policyId && <p className="text-destructive text-sm">{t('fieldRequired')}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="reason">{t('reasonForClaim')}</Label>
                <Input id="reason" placeholder={t('egDrought')} {...register('reason', { required: true })} />
                {errors.reason && <p className="text-destructive text-sm">{t('fieldRequired')}</p>}
            </div>
             <div className="space-y-2">
                <Label htmlFor="description">{t('description')}</Label>
                <Textarea id="description" placeholder={t('describeDamage')} {...register('description', { required: true })} />
                {errors.description && <p className="text-destructive text-sm">{t('fieldRequired')}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="damageProof">{t('damageProof')}</Label>
                <Input id="damageProof" type="file" accept="image/*,video/*" {...register('damageProof', { required: true })} />
                 {errors.damageProof && <p className="text-destructive text-sm">{t('fieldRequired')}</p>}
            </div>
            <div>
                 <Button type="button" variant="outline" onClick={captureLocation} className="w-full">
                    <MapPin className="mr-2" /> {location ? t('locationCaptured') : t('captureGeolocation')}
                </Button>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Shield className="mr-2" />}
                {t('submitClaim')}
            </Button>
        </form>
    )
}
