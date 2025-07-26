
'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, HeartPulse, LineChart, ScrollText, Languages, ChevronLeft, BarChartBig, LayoutDashboard, Droplets, LifeBuoy, PieChart, Activity, Search, Moon, Sun, Shield, Landmark, Cloud, MessageSquareHeart } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTheme } from "next-themes";
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
import { LogoIcon } from '@/components/icons/logo';
import { SearchCommand } from '@/components/SearchCommand';

const navItems = [
  { href: '/dashboard/diagnose', icon: HeartPulse, labelKey: 'diagnoseDisease' },
  { href: '/dashboard/mandi-prices', icon: LineChart, labelKey: 'mandiPrices' },
  { href: '/dashboard/weather', icon: Cloud, labelKey: 'weatherForecast' },
  { href: '/dashboard/schemes', icon: ScrollText, labelKey: 'govtSchemes' },
  { href: '/dashboard/monitor', icon: Activity, labelKey: 'growthMonitoring' },
  { href: '/dashboard/analytics', icon: PieChart, labelKey: 'healthAnalytics' },
  { href: '/dashboard/insurance', icon: Shield, labelKey: 'cropInsurance' },
  { href: '/dashboard/capital', icon: Landmark, labelKey: 'smartCapitalAccess' },
  { href: '/dashboard/selling-advice', icon: BarChartBig, labelKey: 'aiSellingAdvice' },
  { href: '/dashboard/irrigation', icon: Droplets, labelKey: 'smartIrrigation' },
  { href: '/dashboard/community', icon: MessageSquareHeart, labelKey: 'community' },
  { href: '/dashboard/help', icon: LifeBuoy, labelKey: 'helpSupport' },
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
  const { t, setLanguage } = useLanguage();
  const { setTheme, theme } = useTheme();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openSearch, setOpenSearch] = useState(false);
  
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpenSearch((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, []);
  
  const currentNavItem = navItems.find((item) => pathname.startsWith(item.href));

  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode);
  };
  
  const sidebarContent = (
    <nav className="flex flex-col gap-2 px-2 text-sm font-medium lg:px-4">
      <Link
        href="/dashboard"
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-all hover:text-primary hover:bg-muted",
          "group",
          pathname === "/dashboard" && "bg-muted text-primary font-semibold"
        )}
      >
        <LayoutDashboard className="h-5 w-5" />
        <span className={cn("truncate transition-opacity duration-300", !isSidebarOpen && "md:opacity-0 md:w-0")}>{t('dashboard')}</span>
      </Link>
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

  const themeToggle = (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-primary"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
  
  return (
    <div className="grid min-h-screen w-full bg-background">
      <SearchCommand open={openSearch} setOpen={setOpenSearch} />
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden md:flex flex-col border-r bg-background transition-all duration-300 ease-in-out fixed top-0 left-0 h-full z-40",
        isSidebarOpen ? 'w-64' : 'w-20'
      )}>
        <div className="flex h-16 items-center border-b px-6 shrink-0 relative">
          <Link href="/" className="flex items-center gap-2 font-semibold font-headline text-primary">
            <LogoIcon className="h-7 w-7" />
            <span className={cn("transition-opacity", !isSidebarOpen && "opacity-0 w-0")}>Kisan Rakshak</span>
          </Link>
           <Button variant="ghost" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground h-8 w-8" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <ChevronLeft className={cn("h-4 w-4 transition-transform", !isSidebarOpen && "rotate-180")} />
          </Button>
        </div>
        <div className="flex-1 py-4 overflow-y-auto">
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
                  <LogoIcon className="h-7 w-7" />
                  <span>Kisan Rakshak</span>
                </Link>
              </div>
              <div className="flex-1 py-4">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                  <Link
                      href="/dashboard"
                      className={`flex items-center gap-3 rounded-lg px-3 py-3 transition-all hover:text-primary ${
                        pathname === '/dashboard' ? 'bg-muted text-primary font-semibold' : 'text-muted-foreground'
                      }`}
                    >
                      <LayoutDashboard className="h-5 w-5" />
                      {t('dashboard')}
                  </Link>
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
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => setOpenSearch(true)}>
                <Search className="h-5 w-5" />
                <span className="sr-only">Search</span>
              </Button>
              {themeToggle}
              {languageSelector}
            </div>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/50">
          {children}
        </main>
      </div>
    </div>
  );
}
