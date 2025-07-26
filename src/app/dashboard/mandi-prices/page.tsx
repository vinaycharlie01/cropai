
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranslationKeys } from '@/lib/translations';

type Trend = 'up' | 'down' | 'stable';

interface PriceData {
    cropKey: TranslationKeys;
    price: number;
    regionKey: TranslationKeys;
    trend: Trend;
}

const priceData: PriceData[] = [
    { cropKey: 'tomato', price: 2500, regionKey: 'maharashtra', trend: 'up' },
    { cropKey: 'onion', price: 1800, regionKey: 'karnataka', trend: 'down' },
    { cropKey: 'potato', price: 1500, regionKey: 'uttarPradesh', trend: 'stable' },
    { cropKey: 'wheat', price: 2200, regionKey: 'punjab', trend: 'up' },
    { cropKey: 'riceBasmati', price: 9500, regionKey: 'haryana', trend: 'down' },
    { cropKey: 'cotton', price: 7500, regionKey: 'gujarat', trend: 'stable' },
];

const TrendIcon = ({ trend }: { trend: Trend }) => {
    switch (trend) {
        case 'up':
            return <TrendingUp className="h-5 w-5 text-green-500" />;
        case 'down':
            return <TrendingDown className="h-5 w-5 text-red-500" />;
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
            transition: { staggerChildren: 0.05 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
        >
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">{t('mandiPriceAdvisor')}</CardTitle>
                    <CardDescription>{t('mandiPriceInfo')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Header */}
                        <motion.div 
                            className="hidden md:grid grid-cols-3 gap-4 px-4 font-semibold text-muted-foreground"
                            initial="hidden"
                            animate="visible"
                            variants={containerVariants}
                        >
                            <motion.div variants={itemVariants}>{t('crop')}</motion.div>
                            <motion.div variants={itemVariants}>{t('price')}</motion.div>
                            <motion.div variants={itemVariants}>{t('region')}</motion.div>
                        </motion.div>
                        
                        {/* Data Rows */}
                        <motion.div 
                            className="space-y-2"
                            initial="hidden"
                            animate="visible"
                            variants={containerVariants}
                        >
                            {priceData.map((item) => (
                                <motion.div
                                    key={item.cropKey}
                                    variants={itemVariants}
                                    className="grid grid-cols-3 gap-4 items-center p-4 rounded-lg bg-background hover:bg-muted/50 transition-colors"
                                >
                                    <div className="font-medium">{t(item.cropKey)}</div>
                                    <div className="flex items-center gap-2 font-semibold">
                                        <TrendIcon trend={item.trend} />
                                        <span>₹{item.price.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="text-muted-foreground">{t(item.regionKey)}</div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
