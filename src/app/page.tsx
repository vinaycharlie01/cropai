'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Leaf } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'kn', name: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'മലയാളം' },
  { code: 'ta', name: 'தமிழ்' },
];

export default function LanguageSelectionPage() {
  const { language, setLanguage, isLanguageSelected, setIsLanguageSelected } = useLanguage();
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
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
            <Leaf size={40} />
          </div>
          <CardTitle className="text-3xl font-bold font-headline">Kisan Rakshak</CardTitle>
          <CardDescription>{translations.en.welcomeMessage}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground mb-6 font-semibold">{translations.en.selectLanguage}</p>
          <div className="grid grid-cols-2 gap-4">
            {languages.map((lang) => (
              <Button
                key={lang.code}
                variant="outline"
                className="p-6 text-lg"
                onClick={() => handleLanguageSelect(lang.code)}
              >
                {lang.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
