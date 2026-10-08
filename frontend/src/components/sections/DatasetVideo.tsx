"use client";

import React from "react";
import { Play } from "lucide-react";
import { useTranslations } from "next-intl";
import SectionWrapper from "../layout/SectionWrapper";
import Container from "../layout/Container";

export default function DatasetVideo() {
  const t = useTranslations("datasetVideo");
  return (
    <SectionWrapper id="dataset-video" className="py-24 bg-background-light relative overflow-hidden">
      <Container>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="font-body text-xs font-bold text-accent uppercase tracking-widest">
            {t("behindScenes")}
          </p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-primary mt-2">
            {t("title")}
          </h2>
          <p className="font-body text-sm md:text-base text-foreground-muted mt-3">
            {t("description")}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-border/10 bg-gradient-to-br from-primary/5 to-accent/5 shadow-sm aspect-video">
            {/* Placeholder video element */}
            <video
              className="w-full h-full object-cover"
              controls
              preload="metadata"
              poster="/placeholder-hero-orchard.jpeg"
            >
              Your browser does not support the video tag.
            </video>

            {/* Overlay when no video source */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-foreground/5 backdrop-blur-[2px] pointer-events-none">
              <div className="w-20 h-20 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20">
                <Play className="h-8 w-8 text-primary ml-1" />
              </div>
              <p className="font-body text-sm font-semibold text-primary mt-4">
                {t("comingSoon")}
              </p>
              <p className="font-body text-xs text-foreground-muted mt-1">
                {t("comingSoonDesc")}
              </p>
            </div>
          </div>
        </div>
      </Container>
    </SectionWrapper>
  );
}
