'use client';

import React, { useState } from 'react';
import { MandiPriceRecord } from '@/types/mandi-prices';
import { getMandiPrices } from '@/ai/flows/get-mandi-prices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2 } from 'lucide-react';

function MandiTable({ records }: { records: MandiPriceRecord[] }) {
  const { t } = useLanguage();
  return (
    <div className="border rounded-md mt-6">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t('market')}</TableHead>
                    <TableHead>{t('variety')}</TableHead>
                    <TableHead>{t('grade')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead className="text-right">{t('min_price')}</TableHead>
                    <TableHead className="text-right">{t('max_price')}</TableHead>
                    <TableHead className="text-right font-bold text-primary">{t('modal_price')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {records.map((rec, i) => (
                    <TableRow key={i}>
                        <TableCell className="font-medium">{rec.market}</TableCell>
                        <TableCell>{rec.variety}</TableCell>
                        <TableCell>{rec.grade}</TableCell>
                        <TableCell>{rec.arrival_date}</TableCell>
                        <TableCell className="text-right">{rec.min_price}</TableCell>
                        <TableCell className="text-right">{rec.max_price}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{rec.modal_price}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
  );
}


export default function MandiPricesPage() {
  const { t } = useLanguage();
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [commodity, setCommodity] = useState('');
  const [data, setData] = useState<MandiPriceRecord[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchPrices = async () => {
    setIsLoading(true);
    setError('');
    setData([]);
    try {
      const records = await getMandiPrices({ state, district, commodity });
      setData(records);
      if (records.length === 0) {
        setError('No data found for the selected filters. Please try a different combination.');
      }
    } catch (err) {
      console.error(err);
      setError((err as Error).message || 'An unexpected error occurred.');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle className="font-headline text-2xl">{t('mandiPrices')}</CardTitle>
            <CardDescription>{t('mandiPricesDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Input
                  type="text"
                  placeholder={t('egAndhraPradesh')}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
                <Input
                  type="text"
                  placeholder={t('egChittor')}
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />
                <Input
                  type="text"
                  placeholder={t('egTomato')}
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                />
            </div>

            <Button
                onClick={fetchPrices}
                disabled={isLoading}
            >
                {isLoading ? <Loader2 className="mr-2 animate-spin" /> : null}
                {isLoading ? t('loading') : t('getPrices')}
            </Button>

            {error && <p className="text-destructive mt-4">{error}</p>}
            
            {data.length > 0 && <MandiTable records={data} />}
        </CardContent>
    </Card>
  );
}