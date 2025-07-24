
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

const mockMandiData = [
    {
        cropKey: 'tomato',
        price: 2500,
        regionKey: 'maharashtra',
        trend: 'up',
    },
    {
        cropKey: 'onion',
        price: 1800,
        regionKey: 'karnataka',
        trend: 'down',
    },
    {
        cropKey: 'potato',
        price: 1500,
        regionKey: 'uttarPradesh',
        trend: 'stable',
    },
    {
        cropKey: 'wheat',
        price: 2200,
        regionKey: 'punjab',
        trend: 'up',
    },
    {
        cropKey: 'riceBasmati',
        price: 9500,
        regionKey: 'haryana',
        trend: 'down',
    },
    {
        cropKey: 'cotton',
        price: 7500,
        regionKey: 'gujarat',
        trend: 'stable',
    },
];

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    switch (trend) {
        case 'up':
            return <ArrowUp className="h-5 w-5 text-green-500" />;
        case 'down':
            return <ArrowDown className="h-5 w-5 text-red-500" />;
        case 'stable':
            return <Minus className="h-5 w-5 text-gray-500" />;
        default:
            return null;
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
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">{t('mandiPriceAdvisor')}</CardTitle>
                    <CardDescription>{t('mandiPriceInfo')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {/* Table Header */}
                        <div className="grid grid-cols-3 gap-4 px-4 py-2 font-semibold text-muted-foreground">
                            <div className="col-span-1">{t('crop')}</div>
                            <div className="col-span-1">{t('price')}</div>
                            <div className="col-span-1">{t('region')}</div>
                        </div>

                        {/* Table Body */}
                        <motion.div variants={containerVariants}>
                            {mockMandiData.map((item, index) => (
                                <motion.div
                                    key={index}
                                    variants={itemVariants}
                                    className="grid grid-cols-3 gap-4 px-4 py-4 items-center border-t last:border-b last:rounded-b-lg first:border-t"
                                >
                                    <div className="col-span-1 font-medium">{t(item.cropKey as any)}</div>
                                    <div className="col-span-1 flex items-center gap-2">
                                        <TrendIcon trend={item.trend as any} />
                                        <span className="font-semibold">
                                            ₹{item.price.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div className="col-span-1 text-muted-foreground">{t(item.regionKey as any)}</div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
