
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Phone, MessageSquare, HelpCircle, FileText, ArrowRight } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { translations } from '@/lib/translations';

export default function HelpPage() {
    const { t, language } = useLanguage();
    const hotline = translations[language]?.hotlineNumber || translations['en'].hotlineNumber;

    const supportOptions = [
        {
            href: `tel:${hotline}`,
            icon: Phone,
            titleKey: "callHotline",
            descriptionKey: "callHotlineDesc",
            isExternal: true,
        },
        {
            href: "/dashboard/help/chat",
            icon: MessageSquare,
            titleKey: "chatWithSupport",
            descriptionKey: "chatWithSupportDesc",
            isExternal: false,
        },
        {
            href: "/dashboard/help/faq",
            icon: HelpCircle,
            titleKey: "viewFaqs",
            descriptionKey: "viewFaqsDesc",
            isExternal: false,
        },
        {
            href: "/dashboard/help/issue",
            icon: FileText,
            titleKey: "submitIssue",
            descriptionKey: "submitIssueDesc",
            isExternal: false,
        },
    ];

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
      },
    };

    return (
        <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">{t('helpSupport')}</CardTitle>
                    <CardDescription>{t('helpIntroMessage')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        {supportOptions.map((option, index) => (
                            <motion.div key={index} variants={itemVariants}>
                                <Link href={option.href} passHref legacyBehavior>
                                    <a target={option.isExternal ? "_blank" : "_self"} rel={option.isExternal ? "noopener noreferrer" : ""}>
                                        <div className="group h-full flex flex-col justify-between p-6 bg-background rounded-lg border hover:border-primary hover:shadow-lg transition-all">
                                            <div>
                                                <option.icon className="h-8 w-8 mb-4 text-primary" />
                                                <h3 className="text-xl font-headline font-semibold mb-2">{t(option.titleKey)}</h3>
                                                <p className="text-muted-foreground text-sm">{t(option.descriptionKey)}</p>
                                            </div>
                                            <div className="mt-4 flex items-center text-primary font-semibold">
                                                <span>{t(option.isExternal ? 'callNow' : 'getStarted')}</span>
                                                <ArrowRight className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-1" />
                                            </div>
                                        </div>
                                    </a>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
