
'use client';

import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Minus, LineChart } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type MandiData = {
  cropKey: 'tomato' | 'onion' | 'potato' | 'wheat' | 'riceBasmati' | 'cotton';
  price: number;
  regionKey: 'maharashtra' | 'karnataka' | 'uttarPradesh' | 'punjab' | 'haryana' | 'gujarat';
  trend: 'up' | 'down' | 'stable';
};

const mandiData: MandiData[] = [
  { cropKey: 'tomato', price: 2500, regionKey: 'maharashtra', trend: 'up' },
  { cropKey: 'onion', price: 1800, regionKey: 'karnataka', trend: 'down' },
  { cropKey: 'potato', price: 1500, regionKey: 'uttarPradesh', trend: 'stable' },
  { cropKey: 'wheat', price: 2200, regionKey: 'punjab', trend: 'up' },
  { cropKey: 'riceBasmati', price: 9500, regionKey: 'haryana', trend: 'down' },
  { cropKey: 'cotton', price: 7500, regionKey: 'gujarat', trend: 'stable' },
];

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  switch (trend) {
    case 'up':
      return <ArrowUpRight className="h-5 w-5 text-green-500" />;
    case 'down':
      return <ArrowDownRight className="h-5 w-5 text-red-500" />;
    case 'stable':
      return <Minus className="h-5 w-5 text-gray-500" />;
  }
};

export default function MandiPricesPage() {
  const { t } = useLanguage();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <LineChart /> {t('mandiPriceAdvisor')}
          </CardTitle>
          <CardDescription>{t('mandiPriceInfo')}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Header Row */}
          <motion.div
            variants={itemVariants}
            className="flex justify-between px-4 py-2 text-muted-foreground font-semibold"
          >
            <div className="w-1/3">{t('crop')}</div>
            <div className="w-1/3 text-center">{t('price')}</div>
            <div className="w-1/3 text-right">{t('region')}</div>
          </motion.div>
          
          {/* Data Rows */}
          <div className="space-y-2">
            {mandiData.map((item, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="flex items-center justify-between px-4 py-3 bg-background hover:bg-muted/50 rounded-lg transition-colors"
              >
                <div className="w-1/3 font-medium">{t(item.cropKey)}</div>
                <div className="w-1/3 text-center flex items-center justify-center gap-2">
                  <TrendIcon trend={item.trend} />
                  <span className={cn(
                    "font-semibold",
                    item.trend === 'up' && 'text-green-500',
                    item.trend === 'down' && 'text-red-500'
                  )}>
                    ₹{item.price.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-1/3 text-right text-muted-foreground">{t(item.regionKey)}</div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
