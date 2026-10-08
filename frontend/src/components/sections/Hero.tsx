"use client";

import React from "react";
import { ArrowRight, Play, Sprout } from "lucide-react";
import { useTranslations } from "next-intl";
import Container from "../layout/Container";

export default function Hero() {
  const t = useTranslations("hero");
  const handleScrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <section
      id="hero"
      className="relative min-h-[90vh] md:min-h-[95vh] flex items-center pt-24 pb-16 overflow-hidden bg-gradient-to-br from-background-light via-background-light to-background-alt"
    >
      {/* Decorative Organic Blurs */}
      <div className="absolute top-20 left-[-10%] w-[500px] h-[500px] bg-primary/6 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-[-10%] w-[600px] h-[600px] bg-secondary/8 rounded-full blur-[130px] pointer-events-none" />

      {/* Decorative Grid Pattern Overlay */}
      <div className="absolute inset-0 organic-pattern opacity-40 pointer-events-none" />

      <Container className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Hero Content */}
          <div className="lg:col-span-7 flex flex-col items-start text-left gap-6">
            {/* Tag / Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/8 border border-primary/10 text-primary font-body font-semibold text-xs md:text-sm tracking-wide">
              <Sprout className="h-4 w-4 text-primary animate-pulse" />
              <span>{t("tag")}</span>
            </div>

            {/* Headline */}
            <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl text-primary leading-[1.1] tracking-tight">
              {t("headlineLine1")}<br />
              <span className="text-accent">{t("headlineLine2")}</span> <br />
              <span className="text-primary-hover">{t("headlineLine3")}</span>
            </h1>

            {/* Sub-headline */}
            <p className="font-body text-base md:text-lg text-foreground-muted max-w-xl leading-relaxed">
              {t("description")}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto mt-4">
              <button
                onClick={() => handleScrollTo("varieties")}
                className="btn-primary flex items-center justify-center gap-2 cursor-pointer focus-ring-custom"
              >
                <span>{t("exploreBtn")}</span>
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </button>

              <button
                onClick={() => handleScrollTo("demos")}
                className="btn-secondary flex items-center justify-center gap-2 cursor-pointer focus-ring-custom"
              >
                <Play className="h-4 w-4 fill-primary rtl:rotate-180" />
                <span>{t("tryDemoBtn")}</span>
              </button>
            </div>

            {/* Visual Stats Row */}
            <div className="grid grid-cols-3 gap-6 md:gap-10 border-t border-border/12 pt-8 mt-6 w-full max-w-lg">
              <div>
                <h4 className="font-display font-bold text-2xl md:text-3xl text-primary">{t("statYield")}</h4>
                <p className="font-body text-[11px] md:text-xs text-foreground-muted tracking-wide uppercase mt-1">{t("statYieldLabel")}</p>
              </div>
              <div>
                <h4 className="font-display font-bold text-2xl md:text-3xl text-primary">{t("statTrace")}</h4>
                <p className="font-body text-[11px] md:text-xs text-foreground-muted tracking-wide uppercase mt-1">{t("statTraceLabel")}</p>
              </div>
              <div>
                <h4 className="font-display font-bold text-2xl md:text-3xl text-primary">{t("statMiddlemen")}</h4>
                <p className="font-body text-[11px] md:text-xs text-foreground-muted tracking-wide uppercase mt-1">{t("statMiddlemenLabel")}</p>
              </div>
            </div>
          </div>

          {/* Hero Visual Mockup */}
          <div className="lg:col-span-5 relative w-full flex justify-center items-center">
            {/* Visual Frame */}
            <div className="relative w-full max-w-[420px] aspect-[4/5] rounded-[32px] overflow-hidden shadow-xl border border-border/15 bg-white/40 p-4 backdrop-blur-sm">
              {/* IMAGE PLACEHOLDER FOR USER */}
              <div className="w-full h-full rounded-[24px] overflow-hidden bg-gradient-to-br from-primary/10 via-background-alt/50 to-primary/20 relative group">
                <img
                  src="/placeholder-hero-orchard.jpeg"
                  alt="Date Palm Orchard"
                  className="w-full h-full object-cover z-0 transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    // Hide if image missing
                    (e.target as HTMLElement).style.opacity = '0';
                  }}
                />

                {/* Overlaid Floating Glass Badge */}
                <div className="absolute bottom-6 start-6 end-6 glass-card rounded-2xl p-4 text-start shadow-lg border border-white/20 z-20">
                  <p className="font-body text-[11px] text-accent font-bold uppercase tracking-wider">{t("badgeTitle")}</p>
                  <p className="font-display text-primary font-semibold text-sm mt-1">
                    {t("badgeText")}
                  </p>
                </div>
              </div>
            </div>

            {/* Circular Badge Ring */}
            <div className="absolute top-[-20px] end-[-20px] bg-white border border-border/10 rounded-full p-4 shadow-md w-24 h-24 flex items-center justify-center text-center animate-spin-slow">
              <span className="font-body text-[10px] font-bold text-accent uppercase leading-none tracking-wider">
                {t("circleBadge")}
              </span>
            </div>
          </div>
        </div>
      </Container>

      {/* Wave Section Divider */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none rotate-180">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="relative block w-full h-[30px] text-background-alt fill-current"
        >
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C26.9,8.75,57.05,18.3,88.43,26.85,152.05,44.15,223,67.73,321.39,56.44Z" />
        </svg>
      </div>
    </section>
  );
}
