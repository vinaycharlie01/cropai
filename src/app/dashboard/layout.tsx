'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Leaf, Menu, HeartPulse, LineChart, ScrollText, Languages, ChevronLeft, CloudSun } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';


const navItems = [
  { href: '/dashboard/diagnose', icon: HeartPulse, labelKey: 'diagnoseDisease' },
  { href: '/dashboard/weather', icon: CloudSun, labelKey: 'weatherForecast' },
  { href: '/dashboard/mandi-prices', icon: LineChart, labelKey: 'mandiPrices' },
  { href: '/dashboard/schemes', icon: ScrollText, labelKey: 'govtSchemes' },
] as const;

const languages = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'kn', name: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'മലയാളം' },
  { code: 'ta', name: 'தமிழ்' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t, setLanguage, isLanguageSelected } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isLanguageSelected) {
      router.replace('/');
    }
  }, [isLanguageSelected, router]);
  
  if (!isLanguageSelected) {
    return <div className="min-h-screen w-full bg-background" />;
  }
  
  const currentNavItem = navItems.find((item) => pathname.startsWith(item.href));

  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode);
  };
  
  const sidebarContent = (
    <nav className="flex flex-col gap-2 px-2 text-sm font-medium lg:px-4">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-all hover:text-primary hover:bg-muted",
              "group",
              isActive && "bg-muted text-primary font-semibold"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className={cn("truncate transition-opacity duration-300", !isSidebarOpen && "md:opacity-0 md:w-0")}>{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );

  const languageSelector = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
          <Languages className="h-5 w-5" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem key={lang.code} onClick={() => handleLanguageChange(lang.code)}>
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  
  return (
    <div className="grid min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden md:flex flex-col border-r bg-background transition-all duration-300 ease-in-out fixed top-0 left-0 h-full z-40",
        isSidebarOpen ? 'w-64' : 'w-20'
      )}>
        <div className="flex h-16 items-center border-b px-6 shrink-0 relative">
          <Link href="/" className="flex items-center gap-2 font-semibold font-headline text-primary">
            <Leaf className="h-6 w-6" />
            <span className={cn("transition-opacity", !isSidebarOpen && "opacity-0 w-0")}>Kisan Rakshak</span>
          </Link>
           <Button variant="ghost" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground h-8 w-8" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <ChevronLeft className={cn("h-4 w-4 transition-transform", !isSidebarOpen && "rotate-180")} />
          </Button>
        </div>
        <div className="flex-1 py-4">
          {sidebarContent}
        </div>
      </div>
      
      <div className={cn("flex flex-col transition-all duration-300 ease-in-out", isSidebarOpen ? 'md:ml-64' : 'md:ml-20')}>
        <header className="flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 lg:px-6 sticky top-0 z-30">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0 w-64 bg-background">
              <SheetHeader className="p-4 border-b">
                 <SheetTitle className="sr-only">Menu</SheetTitle>
              </SheetHeader>
              <div className="flex h-16 items-center border-b px-6">
                <Link href="/" className="flex items-center gap-2 font-semibold font-headline text-primary">
                  <Leaf className="h-6 w-6" />
                  <span>Kisan Rakshak</span>
                </Link>
              </div>
              <div className="flex-1 py-4">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-3 transition-all hover:text-primary ${
                        pathname.startsWith(item.href) ? 'bg-muted text-primary font-semibold' : 'text-muted-foreground'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {t(item.labelKey)}
                    </Link>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1 flex items-center justify-between">
            <h1 className="text-xl font-semibold font-headline">
              {currentNavItem ? t(currentNavItem.labelKey) : t('dashboard')}
            </h1>
            <div className="ml-auto">
              {languageSelector}
            </div>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-secondary/30">
          {children}
        </main>
      </div>
    </div>
  );
}
