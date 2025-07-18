
'use client'

import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowRight, BarChartBig, CloudSun, Droplets, HeartPulse, LineChart, PieChart, ScrollText, Activity } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const featureCards = [
  {
    href: "/dashboard/diagnose",
    icon: HeartPulse,
    titleKey: "diagnoseDisease",
    descriptionKey: "diagnoseDescription",
  },
  {
    href: "/dashboard/monitor",
    icon: Activity,
    titleKey: "growthMonitoring",
    descriptionKey: "growthMonitoringDescShort",
  },
  {
    href: "/dashboard/analytics",
    icon: PieChart,
    titleKey: "healthAnalytics",
    descriptionKey: "healthAnalyticsDesc",
  },
  {
    href: "/dashboard/selling-advice",
    icon: BarChartBig,
    titleKey: "aiSellingAdvice",
    descriptionKey: "aiSellingAdviceDesc",
  },
  {
    href: "/dashboard/weather",
    icon: CloudSun,
    titleKey: "weatherForecast",
    descriptionKey: "weatherInstruction",
  },
  {
    href: "/dashboard/irrigation",
    icon: Droplets,
    titleKey: "smartIrrigation",
    descriptionKey: "irrigationDescription",
  },
  {
    href: "/dashboard/mandi-prices",
    icon: LineChart,
    titleKey: "mandiPrices",
    descriptionKey: "mandiPricesDescription",
  },
  {
    href: "/dashboard/schemes",
    icon: ScrollText,
    titleKey: "govtSchemes",
    descriptionKey: "govtSchemesDescription",
  },
];


export default function DashboardPage() {
    const { t } = useLanguage();
    
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
            <motion.div variants={itemVariants} className="text-center">
                <h1 className="text-3xl font-bold font-headline">{t('welcomeBack')}</h1>
                <p className="text-muted-foreground">{t('getStarted')}</p>
            </motion.div>

            <motion.div 
                variants={containerVariants}
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
                {featureCards.map((feature, index) => (
                    <motion.div key={index} variants={itemVariants}>
                        <Link href={feature.href}>
                            <div className="group h-full flex flex-col justify-between p-6 bg-background rounded-lg border hover:border-primary hover:shadow-lg transition-all">
                                <div>
                                    <feature.icon className="h-8 w-8 mb-4 text-primary" />
                                    <h3 className="text-xl font-headline font-semibold mb-2">{t(feature.titleKey)}</h3>
                                    <p className="text-muted-foreground text-sm">{t(feature.descriptionKey)}</p>
                                </div>
                                <div className="mt-4 flex items-center text-primary font-semibold">
                                    <span>{t('getStarted')}</span>
                                    <ArrowRight className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-1" />
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </motion.div>
        </motion.div>
    );
}
