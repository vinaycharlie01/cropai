
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, SubmitHandler } from 'react-hook-form';
import {
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { LogIn, Loader2, KeyRound } from 'lucide-react';

import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LogoIcon } from '@/components/icons/logo';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


type EmailFormInputs = {
  email: string;
  password: string;
};

type PhoneFormInputs = {
  phoneNumber: string;
  otp: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const emailForm = useForm<EmailFormInputs>();
  const phoneForm = useForm<PhoneFormInputs>();

  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const setupRecaptcha = () => {
    // This function will now be called only when the 'Send OTP' button is clicked.
    // The reCAPTCHA will be rendered into the 'recaptcha-container' div.
    return new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'normal', // Use 'normal' for a visible reCAPTCHA
      'callback': (response: any) => {
        // reCAPTCHA solved.
        // We can now proceed with sending the OTP.
        onPhoneSubmit(phoneForm.getValues());
      },
       'expired-callback': () => {
        // Response expired. Ask user to solve reCAPTCHA again.
         toast({
          variant: 'destructive',
          title: 'reCAPTCHA Expired',
          description: 'Please solve the reCAPTCHA again.',
        });
      }
    });
  };

  const onEmailSubmit: SubmitHandler<EmailFormInputs> = async (data) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onPhoneSubmit: SubmitHandler<PhoneFormInputs> = async (data) => {
    setIsLoading(true);
    if (!isOtpSent) {
      // Send OTP
      try {
        const recaptchaVerifier = setupRecaptcha();
        // Prepend +91 country code for India
        const formattedPhoneNumber = `+91${data.phoneNumber}`;
        const result = await signInWithPhoneNumber(auth, formattedPhoneNumber, recaptchaVerifier);
        setConfirmationResult(result);
        setIsOtpSent(true);
        toast({ title: 'OTP Sent', description: 'Please check your phone for the OTP.' });
      } catch (error: any) {
        console.error("OTP send error:", error);
        toast({ variant: 'destructive', title: 'Failed to Send OTP', description: error.message });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Verify OTP
      if (confirmationResult && data.otp) {
        try {
          await confirmationResult.confirm(data.otp);
          router.push('/dashboard');
        } catch (error: any) {
          console.error("OTP verify error:", error);
          toast({ variant: 'destructive', title: 'Invalid OTP', description: 'The OTP you entered is incorrect. Please try again.' });
        } finally {
          setIsLoading(false);
        }
      }
    }
  };


  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="absolute inset-0 bg-[url('https://placehold.co/1920x1080.png')] bg-cover bg-center opacity-10" data-ai-hint="farm landscape" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background to-background" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 w-full max-w-md"
      >
        <Card className="w-full bg-card/80 backdrop-blur-sm border-border/50 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
              <LogoIcon className="h-10 w-10" />
            </div>
            <CardTitle className="text-4xl font-bold font-headline text-foreground">
              Welcome Back
            </CardTitle>
            <CardDescription>
              Sign in to your Kisan Rakshak account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="phone">Phone</TabsTrigger>
              </TabsList>
              <TabsContent value="email" className="pt-6">
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      {...emailForm.register('email', { required: 'Email is required.' })}
                    />
                    {emailForm.formState.errors.email && <p className="text-destructive text-sm">{emailForm.formState.errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      {...emailForm.register('password', { required: 'Password is required.' })}
                    />
                    {emailForm.formState.errors.password && <p className="text-destructive text-sm">{emailForm.formState.errors.password.message}</p>}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                    {isLoading ? 'Signing In...' : 'Sign In with Email'}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="phone" className="pt-6">
                <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-6">
                   <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <div className="flex items-center gap-2">
                        <div className="flex h-10 items-center rounded-md border border-input bg-background px-3">
                           <span className="text-sm text-muted-foreground">+91</span>
                        </div>
                        <Input
                          id="phoneNumber"
                          type="tel"
                          placeholder="Your 10-digit number"
                          disabled={isOtpSent}
                          maxLength={10}
                          {...phoneForm.register('phoneNumber', { 
                            required: 'Phone number is required.',
                            pattern: {
                                value: /^\d{10}$/,
                                message: "Please enter a valid 10-digit phone number."
                            }
                           })}
                        />
                    </div>
                    {phoneForm.formState.errors.phoneNumber && <p className="text-destructive text-sm">{phoneForm.formState.errors.phoneNumber.message}</p>}
                  </div>
                  
                  <div id="recaptcha-container" className="flex justify-center"></div>

                  {isOtpSent && (
                    <div className="space-y-2">
                      <Label htmlFor="otp">OTP</Label>
                      <Input
                        id="otp"
                        type="text"
                        maxLength={6}
                        placeholder="Enter 6-digit OTP"
                        {...phoneForm.register('otp', { required: 'OTP is required.', minLength: 6, maxLength: 6 })}
                      />
                      {phoneForm.formState.errors.otp && <p className="text-destructive text-sm">{phoneForm.formState.errors.otp.message}</p>}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      isOtpSent ? <KeyRound className="mr-2 h-4 w-4" /> : <LogIn className="mr-2 h-4 w-4" />
                    )}
                    {isLoading ? (isOtpSent ? 'Verifying...' : 'Sending OTP...') : (isOtpSent ? 'Verify OTP' : 'Send OTP')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            <p className="mt-6 text-center text-sm">
              Don't have an account?{' '}
              <Link href="/signup" className="font-semibold text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
