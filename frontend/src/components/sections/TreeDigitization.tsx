"use client";

import React from "react";
import { QrCode, HeartPulse, ShieldCheck, MapPin, Cpu, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import SectionWrapper from "../layout/SectionWrapper";
import Container from "../layout/Container";
import { useLiveDemo } from "../layout/LiveDemoLayout";

interface DigitizationStep {
  number: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  highlightBadge: string;
}

export default function TreeDigitization() {
  const { isLiveDemo } = useLiveDemo();
  const t = useTranslations("treeDigitization");

  const steps: DigitizationStep[] = [
    {
      number: "01",
      icon: <QrCode className="h-6 w-6 text-primary" />,
      title: t("step1Title"),
      subtitle: t("step1Sub"),
      description: t("step1Desc"),
      highlightBadge: t("step1Badge"),
    },
    {
      number: "02",
      icon: <HeartPulse className="h-6 w-6 text-primary" />,
      title: t("step2Title"),
      subtitle: t("step2Sub"),
      description: t("step2Desc"),
      highlightBadge: t("step2Badge"),
    },
    {
      number: "03",
      icon: <ShieldCheck className="h-6 w-6 text-primary" />,
      title: t("step3Title"),
      subtitle: t("step3Sub"),
      description: t("step3Desc"),
      highlightBadge: t("step3Badge"),
    },
  ];

  return (
    <SectionWrapper id="tree-digitization" className="py-24 bg-background-alt relative overflow-hidden">
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

        {/* Horizontal Stepper Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-5xl mx-auto relative z-10">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="bg-white border border-border/10 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative"
            >
              {/* Connection Indicator Line (not for last item) */}
              {index < 2 && (
                <div className="hidden md:block absolute top-[15%] end-[-20%] w-[35%] h-[2px] border-t border-dashed border-accent/30 z-0 pointer-events-none" />
              )}

              <div className="relative z-10">
                {/* Header Row */}
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center border border-primary/20">
                    {step.icon}
                  </div>
                  <span className="font-display font-bold text-3xl text-accent/20 select-none">
                    {step.number}
                  </span>
                </div>

                {/* Subtitle / Title */}
                <div>
                  <span className="font-body text-[10px] font-bold text-accent uppercase tracking-wider">
                    {step.highlightBadge}
                  </span>
                  <h3 className="font-display font-bold text-xl text-primary mt-1">
                    {step.title}
                  </h3>
                  <p className="font-body text-xs font-semibold text-foreground-muted mt-0.5">
                    {step.subtitle}
                  </p>
                </div>

                {/* Description */}
                {!isLiveDemo && (
                  <p className="font-body text-xs text-foreground-muted mt-4 leading-relaxed">
                    {step.description}
                  </p>
                )}
              </div>

              {/* Step Footer Mock */}
              {!isLiveDemo && (
                <div className="mt-8 border-t border-border/8 pt-4 flex items-center gap-1.5 text-[11px] font-body text-primary font-semibold cursor-pointer hover:text-accent transition-colors">
                  <span>{t("exploreSpecs")}</span>
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Infographic Stats/Callout — hidden in Live Demo */}
        {!isLiveDemo && (
          <div className="mt-16 bg-primary/5 border border-primary/10 rounded-3xl p-8 max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20 shrink-0 mt-1">
                <Cpu className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg text-primary">{t("calloutTitle")}</h3>
                <p className="font-body text-xs text-foreground-muted mt-1 leading-relaxed max-w-xl">
                  {t("calloutDesc")}
                </p>
              </div>
            </div>
            <span className="font-body text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-4 py-2.5 rounded-xl uppercase tracking-wider shrink-0 cursor-pointer hover:bg-primary/15 transition-colors">
              {t("readWhitepaper")}
            </span>
          </div>
        )}
      </Container>
    </SectionWrapper>
  );
}
