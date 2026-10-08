"use client";

import React from "react";
import { BarChart3, TrendingUp, Award, DollarSign, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import SectionWrapper from "../layout/SectionWrapper";
import Container from "../layout/Container";
import AnimatedCounter from "../motion/AnimatedCounter";
import { useLiveDemo } from "../layout/LiveDemoLayout";

interface RegionInfo {
  name: string;
  share: string;
  notes: string;
  color: string;
}

export default function EconomicImpact() {
  const { isLiveDemo } = useLiveDemo();
  const t = useTranslations("economicImpact");

  const regions: RegionInfo[] = [
    {
      name: t("region1Name"),
      share: t("region1Share"),
      notes: t("region1Notes"),
      color: "bg-emerald-500",
    },
    {
      name: t("region2Name"),
      share: t("region2Share"),
      notes: t("region2Notes"),
      color: "bg-amber-500",
    },
    {
      name: t("region3Name"),
      share: t("region3Share"),
      notes: t("region3Notes"),
      color: "bg-orange-500",
    },
    {
      name: t("region4Name"),
      share: t("region4Share"),
      notes: t("region4Notes"),
      color: "bg-lime-500",
    },
  ];

  return (
    <SectionWrapper
      id="economic-footprint"
      className="py-24 bg-background-dark text-foreground-dark relative overflow-hidden"
    >
      {/* Decorative SVG Pattern Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none organic-pattern" />
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary-light/5 rounded-full blur-[120px] pointer-events-none" />

      <Container>
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="font-body text-xs font-bold text-secondary-dark uppercase tracking-widest">
            {t("label")}
          </p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground-dark mt-2">
            {t("title")}
          </h2>
          <p className="font-body text-sm md:text-base text-foreground-dark-muted mt-3">
            {t("subtitle")}
          </p>
        </div>

        {/* Stats Grid */}
        <div className={isLiveDemo
          ? "flex flex-col gap-3 mb-8"
          : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-16"
        }>
          {[
            {
              icon: <Award className="h-6 w-6 text-secondary-dark" />,
              value: 8,
              prefix: "#",
              suffix: "",
              title: t("stat1Title"),
              description: t("stat1Desc"),
            },
            {
              icon: <TrendingUp className="h-6 w-6 text-secondary-dark" />,
              value: 535000,
              prefix: "",
              suffix: "+ Tons",
              title: t("stat2Title"),
              description: t("stat2Desc"),
            },
            {
              icon: <DollarSign className="h-6 w-6 text-secondary-dark" />,
              value: 120,
              prefix: "$",
              suffix: "M+",
              title: t("stat3Title"),
              description: t("stat3Desc"),
            },
            {
              icon: <BarChart3 className="h-6 w-6 text-secondary-dark" />,
              value: 45,
              prefix: "",
              suffix: "%+",
              title: t("stat4Title"),
              description: t("stat4Desc"),
            },
          ].map((stat, i) =>
            isLiveDemo ? (
              /* Compact horizontal row */
              <div
                key={i}
                className="flex items-center gap-4 bg-background-dark-alt border border-border-dark/60 rounded-xl px-4 py-3"
              >
                <div className="bg-primary/20 w-10 h-10 rounded-lg flex items-center justify-center border border-border-dark shrink-0">
                  {stat.icon}
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="font-display font-bold text-2xl text-foreground-dark">
                    <AnimatedCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                  </span>
                  <span className="font-body font-semibold text-sm text-secondary-dark">{stat.title}</span>
                </div>
              </div>
            ) : (
              /* Original vertical card */
              <div
                key={i}
                className="bg-background-dark-alt border border-border-dark/60 rounded-2xl p-6 flex flex-col justify-between"
              >
                <div className="bg-primary/20 w-12 h-12 rounded-xl flex items-center justify-center border border-border-dark mb-4">
                  {stat.icon}
                </div>
                <div>
                  <h3 className="font-display font-bold text-3xl md:text-4xl text-foreground-dark">
                    <AnimatedCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                  </h3>
                  <h4 className="font-body font-semibold text-sm text-secondary-dark mt-1">
                    {stat.title}
                  </h4>
                  <p className="font-body text-xs text-foreground-dark-muted mt-2 leading-relaxed">
                    {stat.description}
                  </p>
                </div>
              </div>
            )
          )}
        </div>

        {/* Regional Breakdown Layout — hidden in Live Demo */}
        {!isLiveDemo && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Map Placement Indicator */}
            <div className="lg:col-span-5 bg-background-dark-alt border border-border-dark/60 rounded-3xl p-6 h-full flex flex-col justify-between min-h-[300px] relative overflow-hidden">
              {/* Background Graphic Placeholder */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/5 opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <div className="relative z-10">
                  <MapPin className="h-10 w-10 text-secondary-dark mx-auto mb-3" />
                  <h3 className="font-display font-semibold text-lg text-foreground-dark">{t("mapPlaceholderTitle")}</h3>
                  <p className="font-body text-xs text-foreground-dark-muted mt-2 max-w-[280px]">
                    {t("mapPlaceholderDesc")}
                  </p>
                </div>
              </div>
              
              <div className="relative z-10 mt-auto bg-primary-dark/20 border border-primary-dark/30 rounded-xl p-3 text-xs text-secondary-dark">
                {t("mapNote")}
              </div>
            </div>

            {/* Region Details List */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              {regions.map((region) => (
                <div
                  key={region.name}
                  className="bg-background-dark-alt border border-border-dark/40 rounded-2xl p-5 hover:border-secondary-dark/40 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex gap-4 items-start">
                    {/* Color dot */}
                    <span className={`w-3.5 h-3.5 rounded-full shrink-0 mt-1 ${region.color}`} />
                    <div>
                      <h3 className="font-display font-semibold text-lg text-foreground-dark">
                        {region.name}
                      </h3>
                      <p className="font-body text-xs text-foreground-dark-muted mt-1 leading-relaxed">
                        {region.notes}
                      </p>
                    </div>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <span className="font-body text-xs font-bold text-secondary-dark bg-secondary-dark/10 border border-secondary-dark/25 px-3 py-1 rounded-full uppercase tracking-wider">
                      {region.share}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Container>
    </SectionWrapper>
  );
}
