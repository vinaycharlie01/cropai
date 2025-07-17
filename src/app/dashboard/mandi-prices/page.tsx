'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useLanguage } from "@/contexts/LanguageContext"
import { motion } from "framer-motion";
import type { TranslationKeys } from "@/lib/translations";

const prices: {
    cropKey: TranslationKeys;
    price: string;
    regionKey: TranslationKeys;
    trend: string;
}[] = [
  { cropKey: "tomato", price: "₹2,500", regionKey: "maharashtra", trend: "up" },
  { cropKey: "onion", price: "₹1,800", regionKey: "karnataka", trend: "down" },
  { cropKey: "potato", price: "₹1,200", regionKey: "uttarPradesh", trend: "stable" },
  { cropKey: "wheat", price: "₹2,100", regionKey: "punjab", trend: "up" },
  { cropKey: "riceBasmati", price: "₹3,500", regionKey: "haryana", trend: "stable" },
  { cropKey: "cotton", price: "₹6,000", regionKey: "gujarat", trend: "down" },
]

export default function MandiPricesPage() {
  const { t } = useLanguage()

  const TrendArrow = ({ trend }: { trend: string }) => {
    if (trend === 'up') return <span className="text-green-500">▲</span>
    if (trend === 'down') return <span className="text-red-500">▼</span>
    return <span className="text-gray-500">▬</span>
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-background">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">{t('mandiPriceAdvisor')}</CardTitle>
          <CardDescription>{t('mandiPriceInfo')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">{t('crop')}</TableHead>
                <TableHead className="font-semibold">{t('price')}</TableHead>
                <TableHead className="font-semibold text-right">{t('region')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prices.map((item) => (
                <TableRow key={item.cropKey} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{t(item.cropKey)}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    <TrendArrow trend={item.trend} />
                    {item.price}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{t(item.regionKey)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  )
}
