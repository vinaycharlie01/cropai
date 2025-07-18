
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Bot, HeartPulse, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { getCropHealthAnalytics, CropHealthAnalyticsOutput } from '@/ai/flows/crop-health-analytics';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

// Mock data - in a real app, this would come from a database (e.g., Firestore)
const mockDiagnosisHistory = [
  { date: "2024-07-01", cropType: "Tomato", disease: "Early blight", confidence: 0.92 },
  { date: "2024-07-03", cropType: "Potato", disease: "Healthy", confidence: 0.98 },
  { date: "2024-07-05", cropType: "Tomato", disease: "Healthy", confidence: 0.99 },
  { date: "2024-07-10", cropType: "Tomato", disease: "Late blight", confidence: 0.88 },
  { date: "2024-07-12", cropType: "Cotton", disease: "Healthy", confidence: 0.96 },
  { date: "2024-07-15", cropType: "Potato", disease: "Healthy", confidence: 0.97 },
  { date: "2024-07-18", cropType: "Tomato", disease: "Early blight", confidence: 0.95 },
];

export default function AnalyticsPage() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const [analyticsData, setAnalyticsData] = useState<CropHealthAnalyticsOutput | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const diseaseFrequency = mockDiagnosisHistory
        .filter(item => item.disease !== "Healthy")
        .reduce((acc, item) => {
            acc[item.disease] = (acc[item.disease] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

    const chartData = Object.entries(diseaseFrequency).map(([name, count]) => ({ name, count }));
    const chartConfig = { count: { label: t('diagnoseDisease'), color: "hsl(var(--primary))" }};

    const totalScans = mockDiagnosisHistory.length;
    const healthyScans = mockDiagnosisHistory.filter(d => d.disease === 'Healthy').length;
    const mostCommonIssue = chartData.length > 0 ? chartData.sort((a,b) => b.count - a.count)[0].name : "N/A";

    useEffect(() => {
        const fetchAnalytics = async () => {
            setIsLoading(true);
            try {
                const result = await getCropHealthAnalytics({
                    diagnosisHistory: mockDiagnosisHistory,
                    language: language,
                });
                setAnalyticsData(result);
            } catch (error) {
                console.error("Failed to fetch analytics", error);
                toast({
                    variant: 'destructive',
                    title: t('error'),
                    description: "Could not load AI analytics summary."
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchAnalytics();
    }, [language, toast, t]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.15 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
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
                    <CardTitle className="font-headline text-2xl">{t('healthAnalyticsTitle')}</CardTitle>
                    <CardDescription>{t('healthAnalyticsDescLong')}</CardDescription>
                </CardHeader>
            </Card>

            <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-3">
                <motion.div variants={itemVariants}>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('totalScans')}</CardTitle>
                            <HeartPulse className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalScans}</div>
                        </CardContent>
                    </Card>
                </motion.div>
                 <motion.div variants={itemVariants}>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('healthyScans')}</CardTitle>
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{healthyScans}</div>
                            <p className="text-xs text-muted-foreground">{((healthyScans / totalScans) * 100).toFixed(0)}% Healthy</p>
                        </CardContent>
                    </Card>
                </motion.div>
                <motion.div variants={itemVariants}>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('mostCommonIssue')}</CardTitle>
                            <ShieldAlert className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{mostCommonIssue}</div>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

             <motion.div variants={containerVariants} className="grid gap-6 md:grid-cols-2">
                <motion.div variants={itemVariants}>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('diseaseDistribution')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {chartData.length > 0 ? (
                                <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                                    <BarChart accessibilityLayer data={chartData}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} hide />
                                        <YAxis />
                                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                        <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                                    </BarChart>
                                </ChartContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[250px]">
                                    <p className="text-muted-foreground">{t('noDiseaseData')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                 <motion.div variants={itemVariants}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Bot /> {t('aiAnalysis')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isLoading ? (
                                <div className="flex justify-center items-center h-[200px]">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : analyticsData ? (
                                <>
                                    <div>
                                        <h3 className="font-semibold">{t('overallAssessment')}</h3>
                                        <p className="text-muted-foreground">{analyticsData.overallAssessment}</p>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{t('identifiedTrends')}</h3>
                                        <p className="text-muted-foreground">{analyticsData.trends}</p>
                                    </div>
                                     <div>
                                        <h3 className="font-semibold">{t('preventativeAdvice')}</h3>
                                        <p className="text-muted-foreground">{analyticsData.preventativeAdvice}</p>
                                    </div>
                                </>
                            ) : (
                                 <div className="flex items-center justify-center h-[200px]">
                                    <p className="text-destructive">{t('error')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                 </motion.div>
            </motion.div>

        </motion.div>
    );
}
