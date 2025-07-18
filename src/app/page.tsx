'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoIcon } from '@/components/icons/logo';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'kn', name: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'മലയാളം' },
  { code: 'ta', name: 'தமிழ்' },
];

export default function LanguageSelectionPage() {
  const { setLanguage, isLanguageSelected, setIsLanguageSelected } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (isLanguageSelected) {
      router.replace('/dashboard');
    }
  }, [isLanguageSelected, router]);

  const handleLanguageSelect = (langCode: string) => {
    setLanguage(langCode);
    setIsLanguageSelected(true);
    router.push('/dashboard');
  };

  if (isLanguageSelected) {
    // To prevent flash of content while redirecting
    return <div className="min-h-screen w-full bg-background" />;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
      },
    },
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://placehold.co/1920x1080.png')] bg-cover bg-center opacity-10" data-ai-hint="farm landscape" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background to-background" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="z-10"
      >
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border/50 shadow-2xl animate-fade-in-up">
          <CardHeader className="text-center">
            <motion.div variants={itemVariants} className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
              <LogoIcon className="h-10 w-10" />
            </motion.div>
            <motion.h1 variants={itemVariants} className="text-4xl font-bold font-headline text-foreground">
              Kisan Rakshak
            </motion.h1>
            <motion.p variants={itemVariants} className="text-muted-foreground">
              {translations.en.welcomeMessage}
            </motion.p>
          </CardHeader>
          <CardContent>
            <motion.p variants={itemVariants} className="text-center text-muted-foreground mb-6 font-semibold">
              {translations.en.selectLanguage}
            </motion.p>
            <motion.div variants={containerVariants} className="grid grid-cols-2 gap-4">
              {languages.map((lang) => (
                <motion.div variants={itemVariants} key={lang.code}>
                  <Button
                    variant="outline"
                    className="w-full p-6 text-lg justify-between group transition-all duration-300 hover:bg-primary/90 hover:text-primary-foreground hover:shadow-lg"
                    onClick={() => handleLanguageSelect(lang.code)}
                  >
                    {lang.name}
                    <ArrowRight className="h-5 w-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
