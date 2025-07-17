'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Leaf, Menu, HeartPulse, LineChart, ScrollText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useEffect } from 'react';

const navItems = [
  { href: '/dashboard/diagnose', icon: HeartPulse, labelKey: 'diagnoseDisease' },
  { href: '/dashboard/mandi-prices', icon: LineChart, labelKey: 'mandiPrices' },
  { href: '/dashboard/schemes', icon: ScrollText, labelKey: 'govtSchemes' },
] as const;


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t, isLanguageSelected } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLanguageSelected) {
      router.replace('/');
    }
  }, [isLanguageSelected, router]);

  if (!isLanguageSelected) {
    return null; // or a loading spinner
  }
  
  const currentNavItem = navItems.find((item) => pathname.startsWith(item.href));


  const sidebarContent = (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
    {navItems.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
          pathname.startsWith(item.href) ? 'bg-muted text-primary' : 'text-muted-foreground'
        }`}
      >
        <item.icon className="h-4 w-4" />
        {t(item.labelKey)}
      </Link>
    ))}
  </nav>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold font-headline">
              <Leaf className="h-6 w-6 text-primary" />
              <span className="">Kisan Rakshak</span>
            </Link>
          </div>
          <div className="flex-1">
            {sidebarContent}
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
                <SheetDescription>Main navigation links for the application.</SheetDescription>
              </SheetHeader>
              <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <Link href="/" className="flex items-center gap-2 font-semibold font-headline">
                  <Leaf className="h-6 w-6 text-primary" />
                  <span className="">Kisan Rakshak</span>
                </Link>
              </div>
              <div className="p-2">
                {sidebarContent}
              </div>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            <h1 className="text-xl font-semibold font-headline">
              {currentNavItem ? t(currentNavItem.labelKey) : t('dashboard')}
            </h1>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
