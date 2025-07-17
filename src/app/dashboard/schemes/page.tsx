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


const schemes = [
  {
    id: "pm-kisan",
    title: "PM-KISAN Scheme",
    description: "A government scheme with the objective to supplement the financial needs of all landholding farmers' families in procuring various inputs to ensure proper crop health and appropriate yields, commensurate with the anticipated farm income.",
    eligibility: "All landholding farmer families, who have cultivable landholding in their names are eligible to get benefit under the scheme.",
  },
  {
    id: "fasal-bima",
    title: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
    description: "The scheme provides comprehensive insurance coverage against failure of the crop thus helping in stabilising the income of the farmers.",
    eligibility: "All farmers including sharecroppers and tenant farmers growing notified crops in the notified areas are eligible for coverage.",
  },
  {
    id: "krishi-sinchai",
    title: "Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)",
    description: "Launched with the motto of 'Har Khet Ko Pani', the scheme is being implemented to expand cultivated area with assured irrigation, reduce wastage of water and improve water use efficiency.",
    eligibility: "Varies by component, but generally open to all farmers and farmer groups.",
  },
]

export default function SchemesPage() {
    const { t } = useLanguage()

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="bg-background">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">{t('governmentSchemeNavigator')}</CardTitle>
          <CardDescription>{t('schemeInfo')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {schemes.map((scheme) => (
              <AccordionItem value={scheme.id} key={scheme.id}>
                <AccordionTrigger className="font-semibold text-lg hover:no-underline">{scheme.title}</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <p className="text-muted-foreground">{scheme.description}</p>
                  <div>
                    <h4 className="font-medium text-primary">Eligibility:</h4>
                    <p className="text-muted-foreground">{scheme.eligibility}</p>
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
