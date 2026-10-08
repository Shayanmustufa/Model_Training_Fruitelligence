"use client";

import React from "react";
import { CheckCircle2, RefreshCw, Calendar, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import SectionWrapper from "../layout/SectionWrapper";
import Container from "../layout/Container";

interface RoadmapPhase {
  phase: string;
  title: string;
  status: "completed" | "current" | "future";
  statusLabel: string;
  icon: React.ReactNode;
  timeline: string;
  milestones: string[];
}

export default function Roadmap() {
  const t = useTranslations("roadmap");

  const phases: RoadmapPhase[] = [
    {
      phase: "Phase 1",
      title: t("phase1Title"),
      status: "completed",
      statusLabel: t("statusCompleted"),
      icon: <CheckCircle2 className="h-5 w-5 text-success" />,
      timeline: t("phase1Timeline"),
      milestones: [
        t("phase1M1"),
        t("phase1M2"),
        t("phase1M3"),
      ],
    },
    {
      phase: "Phase 2",
      title: t("phase2Title"),
      status: "current",
      statusLabel: t("statusCurrent"),
      icon: <RefreshCw className="h-5 w-5 text-accent animate-spin-slow" />,
      timeline: t("phase2Timeline"),
      milestones: [
        t("phase2M1"),
        t("phase2M2"),
        t("phase2M3"),
      ],
    },
    {
      phase: "Phase 3",
      title: t("phase3Title"),
      status: "future",
      statusLabel: t("statusFuture"),
      icon: <Calendar className="h-5 w-5 text-primary-light" />,
      timeline: t("phase3Timeline"),
      milestones: [
        t("phase3M1"),
        t("phase3M2"),
        t("phase3M3"),
      ],
    },
  ];

  return (
    <SectionWrapper id="roadmap" className="py-24 bg-background-light relative">
      <Container>
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="font-body text-xs font-bold text-accent uppercase tracking-widest">{t("label")}</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-primary mt-2">
            {t("title")}
          </h2>
          <p className="font-body text-sm md:text-base text-foreground-muted mt-3">
            {t("subtitle")}
          </p>
        </div>

        {/* Timeline Stack */}
        <div className="max-w-4xl mx-auto relative before:absolute before:top-0 before:bottom-0 before:start-4 md:before:start-1/2 before:-translate-x-[1px] before:w-[2px] before:bg-border/20">
          {phases.map((item, index) => {
            const isEven = index % 2 === 0;
            return (
              <div
                key={item.phase}
                className={`relative flex flex-col md:flex-row md:items-start mb-16 last:mb-0 ${isEven ? "md:flex-row-reverse" : ""
                  }`}
              >
                {/* Timeline center node */}
                <div className="absolute start-4 md:start-1/2 rtl:translate-x-[17px] ltr:-translate-x-[17px] z-10 w-9 h-9 rounded-full bg-white border-2 border-primary flex items-center justify-center shadow-sm">
                  {item.icon}
                </div>

                {/* Content Panel (Left or Right side on desktop) */}
                <div className="w-full md:w-1/2 ps-12 md:ps-0 md:px-8">
                  <div className="bg-white border border-border/10 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/6 pb-4 mb-4">
                      <div>
                        <span className="font-body text-[10px] font-bold text-accent uppercase tracking-wider bg-accent/10 px-2.5 py-1 rounded-full">
                          {item.phase}
                        </span>
                        <h3 className="font-display font-semibold text-lg text-primary mt-1.5 leading-snug">
                          {item.title}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-body text-foreground-muted mb-4 bg-background-alt/40 px-3 py-1.5 rounded-lg w-fit">
                      <Calendar className="h-3.5 w-3.5 text-primary-light" />
                      <span className="font-semibold">{item.timeline}</span>
                      <span className="text-border">•</span>
                      <span
                        className={`font-semibold ${item.status === "completed"
                          ? "text-success"
                          : item.status === "current"
                            ? "text-accent"
                            : "text-primary-light"
                          }`}
                      >
                        {item.statusLabel}
                      </span>
                    </div>

                    {/* Milestones list */}
                    <ul className="flex flex-col gap-2.5 font-body text-xs text-foreground-muted">
                      {item.milestones.map((milestone, mIdx) => (
                        <li key={mIdx} className="flex gap-2.5 items-start leading-relaxed">
                          <span className="text-accent shrink-0 mt-1.5">•</span>
                          <span>{milestone}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Empty Spacer column for desktop symmetry */}
                <div className="hidden md:block w-1/2" />
              </div>
            );
          })}
        </div>
      </Container>
    </SectionWrapper>
  );
}
