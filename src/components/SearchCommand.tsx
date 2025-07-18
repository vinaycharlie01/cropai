
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  BarChartBig,
  CloudSun,
  Droplets,
  HeartPulse,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  PieChart,
  ScrollText,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
    { href: '/dashboard/diagnose', icon: HeartPulse, labelKey: 'diagnoseDisease' },
    { href: '/dashboard/monitor', icon: Activity, labelKey: 'growthMonitoring' },
    { href: '/dashboard/analytics', icon: PieChart, labelKey: 'healthAnalytics' },
    { href: '/dashboard/selling-advice', icon: BarChartBig, labelKey: 'aiSellingAdvice' },
    { href: '/dashboard/weather', icon: CloudSun, labelKey: 'weatherForecast' },
    { href: '/dashboard/irrigation', icon: Droplets, labelKey: 'smartIrrigation' },
    { href: '/dashboard/mandi-prices', icon: LineChart, labelKey: 'mandiPrices' },
    { href: '/dashboard/schemes', icon: ScrollText, labelKey: 'govtSchemes' },
    { href: '/dashboard/help', icon: LifeBuoy, labelKey: 'helpSupport' },
] as const;

interface SearchCommandProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

export function SearchCommand({ open, setOpen }: SearchCommandProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, [setOpen]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search for a page or action..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {navItems.map((item) => (
            <CommandItem
              key={item.href}
              value={t(item.labelKey)}
              onSelect={() => {
                runCommand(() => router.push(item.href as string));
              }}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{t(item.labelKey)}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
