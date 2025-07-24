
'use client'

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowRight, BarChartBig, Droplets, HeartPulse, LineChart, PieChart, ScrollText, Activity, Shield, Landmark, CloudSun } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";

const featureCards = [
  {
    href: "/dashboard/diagnose",
    icon: HeartPulse,
    titleKey: "diagnoseDisease",
    descriptionKey: "diagnoseDescription",
  },
  {
    href: "/dashboard/mandi-prices",
    icon: LineChart,
    titleKey: "mandiPrices",
    descriptionKey: "mandiPricesDescription",
  },
  {
    href: "/dashboard/weather",
    icon: CloudSun,
    titleKey: "weatherForecast",
    descriptionKey: "weatherInstruction",
  },
  {
    href: "/dashboard/schemes",
    icon: ScrollText,
    titleKey: "govtSchemes",
    descriptionKey: "govtSchemesDescription",
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
    href: "/dashboard/insurance",
    icon: Shield,
    titleKey: "cropInsurance",
    descriptionKey: "cropInsuranceDesc",
  },
  {
    href: "/dashboard/capital",
    icon: Landmark,
    titleKey: "smartCapitalAccess",
    descriptionKey: "smartCapitalAccessDesc",
  },
  {
    href: "/dashboard/selling-advice",
    icon: BarChartBig,
    titleKey: "aiSellingAdvice",
    descriptionKey: "aiSellingAdviceDesc",
  },
  {
    href: "/dashboard/irrigation",
    icon: Droplets,
    titleKey: "smartIrrigation",
    descriptionKey: "irrigationDescription",
  },
];

const carouselSlides = [
    {
        titleKey: "diagnoseDisease",
        descriptionKey: "diagnoseDescription",
        buttonKey: "diagnose",
        href: "/dashboard/diagnose",
        imgSrc: "https://iili.io/FjhJ7cB.jpg",
        imgHint: "farmer inspecting crop"
    },
    {
        titleKey: "cropInsurance",
        descriptionKey: "cropInsuranceDesc",
        buttonKey: "registerInsurance",
        href: "/dashboard/insurance",
        imgSrc: "https://iili.io/FjhJ7cB.jpg",
        imgHint: "farm landscape sunset"
    },
    {
        titleKey: "aiSellingAdvice",
        descriptionKey: "aiSellingAdviceDesc",
        buttonKey: "getAdvice",
        href: "/dashboard/selling-advice",
        imgSrc: "https://iili.io/FjhJ7cB.jpg",
        imgHint: "market stall vegetables"
    },
    
    
];

export default function DashboardPage() {
    const { t } = useLanguage();
    const [api, setApi] = useState<CarouselApi>()
    const [current, setCurrent] = useState(0)

    useEffect(() => {
        if (!api) return;

        setCurrent(api.selectedScrollSnap() + 1);

        const onSelect = () => {
            setCurrent(api.selectedScrollSnap() + 1);
        };
        
        api.on("select", onSelect);

        const interval = setInterval(() => {
            if (api.canScrollNext()) {
                api.scrollNext();
            } else {
                api.scrollTo(0);
            }
        }, 5000); // Auto slide every 5 seconds

        return () => {
            clearInterval(interval);
            api.off("select", onSelect);
        };
    }, [api]);
    
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
            <motion.div variants={itemVariants}>
                 <Carousel setApi={setApi} className="w-full">
                    <CarouselContent>
                    {carouselSlides.map((slide, index) => (
                        <CarouselItem key={index}>
                        <Card className="overflow-hidden">
                            <CardContent className="p-0 relative aspect-[16/7]">
                            <Image
                                src={slide.imgSrc}
                                alt={t(slide.titleKey)}
                                layout="fill"
                                objectFit="cover"
                                className="brightness-50"
                                data-ai-hint={slide.imgHint}
                            />
                            <div className="absolute inset-0 flex flex-col items-start justify-center p-6 md:p-12 text-white bg-gradient-to-r from-black/60 to-transparent">
                                <motion.div
                                    key={current} // Re-trigger animation on slide change
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className="max-w-md space-y-4"
                                >
                                <h2 className="text-3xl md:text-4xl font-bold font-headline">
                                    {t(slide.titleKey)}
                                </h2>
                                <p className="text-sm md:text-base text-white/90">
                                    {t(slide.descriptionKey)}
                                </p>
                                <Button asChild size="lg">
                                    <Link href={slide.href}>
                                    {t(slide.buttonKey)}
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                    </Link>
                                </Button>
                                </motion.div>
                            </div>
                            </CardContent>
                        </Card>
                        </CarouselItem>
                    ))}
                    </CarouselContent>
                    <CarouselPrevious className="hidden sm:flex" />
                    <CarouselNext className="hidden sm:flex" />
                </Carousel>
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
