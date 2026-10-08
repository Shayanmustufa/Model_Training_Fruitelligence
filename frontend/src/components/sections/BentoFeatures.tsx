"use client";

import React from "react";
import { Scan, Cpu, ShoppingCart, TreePine, BarChart3, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import SectionWrapper from "../layout/SectionWrapper";
import Container from "../layout/Container";
import { BentoGrid, BentoGridItem } from "../layout/BentoGrid";
import { useLiveDemo } from "../layout/LiveDemoLayout";

export default function BentoFeatures() {
  const { isLiveDemo } = useLiveDemo();
  const t = useTranslations("bentoFeatures");
  return (
    <SectionWrapper id="features" className="py-24 bg-background-alt/50 relative overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-1/2 left-[-10%] w-[350px] h-[350px] bg-primary/4 rounded-full blur-[100px] pointer-events-none" />

      <Container>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="font-body text-xs font-bold text-accent uppercase tracking-widest">{t("coreLabel")}</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-primary mt-2">
            {t("title")}
          </h2>
          {!isLiveDemo && (
            <p className="font-body text-sm md:text-base text-foreground-muted mt-3">
              {t("subtitle")}
            </p>
          )}
        </div>

        {isLiveDemo ? (
          /* Live Demo: compact horizontal pill strip — icon + title only */
          <div className="flex flex-wrap gap-3">
            {[
              { icon: <Scan className="h-4 w-4 text-primary" />, label: t("liveAI") },
              { icon: <TreePine className="h-4 w-4 text-primary" />, label: t("liveOrchard") },
              { icon: <ShoppingCart className="h-4 w-4 text-primary" />, label: t("liveMarket") },
              { icon: <BarChart3 className="h-4 w-4 text-primary" />, label: t("livePrice") },
              { icon: <Globe className="h-4 w-4 text-primary" />, label: t("liveGlobal") },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/10 bg-white/70 backdrop-blur-md shadow-sm"
              >
                <div className="bg-primary/10 w-7 h-7 rounded-lg flex items-center justify-center border border-primary/15 shrink-0">
                  {icon}
                </div>
                <span className="font-display font-semibold text-sm text-primary whitespace-nowrap">{label}</span>
              </div>
            ))}
          </div>
        ) : (
          /* Normal mode: original bento grid */
          <BentoGrid>
            {/* Main Feature: AI Classifier - Spans 2 cols */}
            <BentoGridItem colSpan="lg:col-span-2" rowSpan="row-span-2" className="flex flex-col justify-between">
              <div>
                <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center border border-primary/20 mb-6">
                  <Scan className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-xl md:text-2xl text-primary">
                  {t("feat1Title")}
                </h3>
                <p className="font-body text-sm md:text-base text-foreground-muted mt-3 leading-relaxed">
                  {t("feat1Desc")}
                </p>
              </div>
              <div className="mt-8 border-t border-border/12 pt-4 flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent font-body text-[11px] font-semibold">
                  <Cpu className="h-3 w-3" />
                  <span>{t("feat1Badge")}</span>
                </span>
                <span className="text-xs text-foreground-muted">{t("feat1Note")}</span>
              </div>
            </BentoGridItem>

            {/* Feature: GIS Tagging - Spans 1 col */}
            <BentoGridItem colSpan="col-span-1" rowSpan="row-span-2" className="flex flex-col justify-between bg-primary/5 border-primary/10">
              <div>
                <div className="bg-primary/15 w-12 h-12 rounded-xl flex items-center justify-center border border-primary/25 mb-6">
                  <TreePine className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-xl text-primary">
                  {t("feat2Title")}
                </h3>
                <p className="font-body text-sm text-foreground-muted mt-2.5 leading-relaxed">
                  {t("feat2Desc")}
                </p>
              </div>
              <div className="mt-6 font-body text-xs font-semibold text-primary flex items-center gap-1 cursor-pointer hover:underline">
                <span>{t("feat2Link")}</span>
                <span className="rtl:scale-x-[-1]">→</span>
              </div>
            </BentoGridItem>

            {/* Feature: Marketplace - Spans 1 col */}
            <BentoGridItem colSpan="col-span-1" rowSpan="row-span-1" className="flex flex-col justify-between">
              <div className="flex gap-4">
                <div className="bg-primary/10 w-10 h-10 rounded-lg flex items-center justify-center border border-primary/15 shrink-0">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg text-primary">{t("feat3Title")}</h3>
                  <p className="font-body text-xs text-foreground-muted mt-1">
                    {t("feat3Desc")}
                  </p>
                </div>
              </div>
            </BentoGridItem>

            {/* Feature: Price Intelligence - Spans 1 col */}
            <BentoGridItem colSpan="col-span-1" rowSpan="row-span-1" className="flex flex-col justify-between">
              <div className="flex gap-4">
                <div className="bg-primary/10 w-10 h-10 rounded-lg flex items-center justify-center border border-primary/15 shrink-0">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg text-primary">{t("feat4Title")}</h3>
                  <p className="font-body text-xs text-foreground-muted mt-1">
                    {t("feat4Desc")}
                  </p>
                </div>
              </div>
            </BentoGridItem>

            {/* Feature: Variety Database - Spans 1 col */}
            <BentoGridItem colSpan="col-span-1" rowSpan="row-span-1" className="flex flex-col justify-between">
              <div className="flex gap-4">
                <div className="bg-primary/10 w-10 h-10 rounded-lg flex items-center justify-center border border-primary/15 shrink-0">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg text-primary">{t("feat5Title")}</h3>
                  <p className="font-body text-xs text-foreground-muted mt-1">
                    {t("feat5Desc")}
                  </p>
                </div>
              </div>
            </BentoGridItem>

          </BentoGrid>
        )}
      </Container>
    </SectionWrapper>
  );
}
