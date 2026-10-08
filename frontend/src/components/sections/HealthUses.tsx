"use client";

import React, { useState } from "react";
import { Heart, Activity, ShieldAlert, Sparkles, Coffee, Droplet, Layers, HelpCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import SectionWrapper from "../layout/SectionWrapper";
import Container from "../layout/Container";
import { useLiveDemo } from "../layout/LiveDemoLayout";

interface TabItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function HealthUses() {
  const { isLiveDemo } = useLiveDemo();
  const [activeTab, setActiveTab] = useState<"medicinal" | "industrial" | "niche">("medicinal");
  const t = useTranslations("healthUses");

  const medicinalItems: TabItem[] = [
    {
      icon: <Heart className="h-6 w-6 text-accent" />,
      title: t("med1Title"),
      description: t("med1Desc"),
    },
    {
      icon: <Activity className="h-6 w-6 text-accent" />,
      title: t("med2Title"),
      description: t("med2Desc"),
    },
    {
      icon: <ShieldAlert className="h-6 w-6 text-accent" />,
      title: t("med3Title"),
      description: t("med3Desc"),
    },
  ];

  const industrialItems: TabItem[] = [
    {
      icon: <Coffee className="h-6 w-6 text-accent" />,
      title: t("ind1Title"),
      description: t("ind1Desc"),
    },
    {
      icon: <Droplet className="h-6 w-6 text-accent" />,
      title: t("ind2Title"),
      description: t("ind2Desc"),
    },
    {
      icon: <Layers className="h-6 w-6 text-accent" />,
      title: t("ind3Title"),
      description: t("ind3Desc"),
    },
  ];

  const nicheItems: TabItem[] = [
    {
      icon: <Sparkles className="h-6 w-6 text-accent" />,
      title: t("niche1Title"),
      description: t("niche1Desc"),
    },
    {
      icon: <HelpCircle className="h-6 w-6 text-accent" />,
      title: t("niche2Title"),
      description: t("niche2Desc"),
    },
  ];

  return (
    <SectionWrapper id="health-uses" className="py-24 bg-background-alt relative">
      {/* Decorative Wave SVG Top Divider */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="relative block w-full h-[30px] text-background-light fill-current"
        >
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C26.9,8.75,57.05,18.3,88.43,26.85,152.05,44.15,223,67.73,321.39,56.44Z" />
        </svg>
      </div>

      <Container className="pt-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="font-body text-xs font-bold text-accent uppercase tracking-widest">{t("label")}</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-primary mt-2">
            {t("title")}
          </h2>
          {!isLiveDemo && (
            <p className="font-body text-sm md:text-base text-foreground-muted mt-3">
              {t("subtitle")}
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {(
            [
              { id: "medicinal", label: t("tabMedicinal") },
              { id: "industrial", label: t("tabIndustrial") },
              { id: "niche", label: t("tabNiche") },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`font-body text-xs sm:text-sm font-semibold px-5 py-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-primary border-primary text-white shadow-md"
                  : "bg-white border-border/10 text-primary hover:bg-primary/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="max-w-4xl mx-auto">
          {activeTab === "medicinal" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {medicinalItems.map((item, i) => (
                <div key={i} className="bg-white border border-border/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-accent/10 w-12 h-12 rounded-xl flex items-center justify-center border border-accent/20 mb-5">
                    {item.icon}
                  </div>
                  <h3 className="font-display font-semibold text-lg text-primary">{item.title}</h3>
                  {!isLiveDemo && (
                    <p className="font-body text-xs text-foreground-muted mt-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === "industrial" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {industrialItems.map((item, i) => (
                <div key={i} className="bg-white border border-border/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-accent/10 w-12 h-12 rounded-xl flex items-center justify-center border border-accent/20 mb-5">
                    {item.icon}
                  </div>
                  <h3 className="font-display font-semibold text-lg text-primary">{item.title}</h3>
                  <p className="font-body text-xs text-foreground-muted mt-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "niche" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
              {nicheItems.map((item, i) => (
                <div key={i} className="bg-white border border-border/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-accent/10 w-12 h-12 rounded-xl flex items-center justify-center border border-accent/20 mb-5">
                    {item.icon}
                  </div>
                  <h3 className="font-display font-semibold text-lg text-primary">{item.title}</h3>
                  <p className="font-body text-xs text-foreground-muted mt-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Container>
    </SectionWrapper>
  );
}
