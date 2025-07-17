'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useLanguage } from "@/contexts/LanguageContext"
import { motion } from "framer-motion";
import type { TranslationKeys } from "@/lib/translations";


const schemes: {
    id: string;
    titleKey: TranslationKeys;
    descriptionKey: TranslationKeys;
    eligibilityKey: TranslationKeys;
}[] = [
  {
    id: "pm-kisan",
    titleKey: "schemePmKisanTitle",
    descriptionKey: "schemePmKisanDesc",
    eligibilityKey: "schemePmKisanElig",
  },
  {
    id: "fasal-bima",
    titleKey: "schemePmfbyTitle",
    descriptionKey: "schemePmfbyDesc",
    eligibilityKey: "schemePmfbyElig",
  },
  {
    id: "krishi-sinchai",
    titleKey: "schemePmksyTitle",
    descriptionKey: "schemePmksyDesc",
    eligibilityKey: "schemePmksyElig",
  },
]

export default function SchemesPage() {
    const { t } = useLanguage()

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-background">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">{t('schemesTitle')}</CardTitle>
          <CardDescription>{t('schemesDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {schemes.map((scheme) => (
              <AccordionItem value={scheme.id} key={scheme.id}>
                <AccordionTrigger className="font-semibold text-lg hover:no-underline text-left">{t(scheme.titleKey)}</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <p className="text-muted-foreground">{t(scheme.descriptionKey)}</p>
                  <div>
                    <h4 className="font-medium text-primary">{t('schemeEligibility')}:</h4>
                    <p className="text-muted-foreground">{t(scheme.eligibilityKey)}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </motion.div>
  )
}
