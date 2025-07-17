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

const prices = [
  { crop: "Tomato", price: "₹2,500", region: "Maharashtra" },
  { crop: "Onion", price: "₹1,800", region: "Karnataka" },
  { crop: "Potato", price: "₹1,200", region: "Uttar Pradesh" },
  { crop: "Wheat", price: "₹2,100", region: "Punjab" },
  { crop: "Rice (Basmati)", price: "₹3,500", region: "Haryana" },
  { crop: "Cotton", price: "₹6,000", region: "Gujarat" },
]

export default function MandiPricesPage() {
  const { t } = useLanguage()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">{t('mandiPriceAdvisor')}</CardTitle>
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
              <TableRow key={item.crop}>
                <TableCell>{item.crop}</TableCell>
                <TableCell>{item.price}</TableCell>
                <TableCell className="text-right">{item.region}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
