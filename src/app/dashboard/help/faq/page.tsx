
'use client';

import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import type { TranslationKeys } from "@/lib/translations";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";


const faqs: {
    id: string;
    titleKey: TranslationKeys;
    answerKey: TranslationKeys;
}[] = [
    {
        id: "faq-1",
        titleKey: "faq1Title",
        answerKey: "faq1Answer",
    },
    {
        id: "faq-2",
        titleKey: "faq2Title",
        answerKey: "faq2Answer",
    },
    {
        id: "faq-3",
        titleKey: "faq3Title",
        answerKey: "faq3Answer",
    },
    {
        id: "faq-4",
        titleKey: "faq4Title",
        answerKey: "faq4Answer",
    },
];

export default function FaqPage() {
    const { t } = useLanguage();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className="bg-background">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">{t('faqTitle')}</CardTitle>
                    <CardDescription>{t('faqDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {faqs.map((faq) => (
                            <AccordionItem value={faq.id} key={faq.id}>
                                <AccordionTrigger className="font-semibold text-lg hover:no-underline text-left">
                                    {t(faq.titleKey)}
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2">
                                    <p className="text-muted-foreground">{t(faq.answerKey)}</p>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>
        </motion.div>
    );
}
