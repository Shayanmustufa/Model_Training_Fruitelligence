"use client";

import { useTranslations } from "next-intl";
import React, { useState } from "react";
import { Filter, MapPin, Sparkles, DollarSign } from "lucide-react";
import SectionWrapper from "../layout/SectionWrapper";
import Container from "../layout/Container";
import { useLiveDemo } from "../layout/LiveDemoLayout";

interface DateVariety {
  name: string;
  type: "pakistani" | "iranian" | "saudi";
  origin: string;
  description: string;
  taste: string;
  texture: string;
  priceRange: string;
  avgPrice: string;
  marketSource: string;
  imagePlaceholder: string;
}

export default function VarietiesGallery() {
  const t = useTranslations("gallery");
  const { isLiveDemo } = useLiveDemo();
  const [filter, setFilter] = useState<"all" | "pakistani" | "iranian" | "saudi">("all");
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const varieties: DateVariety[] = [
    // Saudi Varieties
    {
      name: "Ajwa",
      type: "saudi",
      origin: "Saudi Arabia (Madinah)",
      description: "Dark, soft, dense flesh with a rich flavor; carries religious and cultural significance as the 'Prophet's date.'",
      taste: "Rich, prune-like",
      texture: "Dense & soft",
      priceRange: "PKR 900 – 4,000 / kg",
      avgPrice: "~3,300",
      marketSource: "Water Pump & Empress Market",
      imagePlaceholder: "/placeholder-ajwa.jpg",
    },
    {
      name: "Amber",
      type: "saudi",
      origin: "Saudi Arabia",
      description: "Large, soft, golden-brown dates with a mild flavor and fleshy pulp.",
      taste: "Mild & gentle",
      texture: "Soft & large",
      priceRange: "PKR 2,600 – 4,800 / kg",
      avgPrice: "~4,000",
      marketSource: "Water Pump & Empress Market",
      imagePlaceholder: "/placeholder-amber.jpg",
    },
    {
      name: "Kalmi",
      type: "saudi",
      origin: "Saudi Arabia",
      description: "Long, slender dates, semi-dry with a caramel-toned flesh.",
      taste: "Caramel-toned",
      texture: "Semi-dry & slender",
      priceRange: "PKR 2,600 – 3,200 / kg",
      avgPrice: "~2,970",
      marketSource: "Water Pump & Empress Market",
      imagePlaceholder: "/placeholder-kalmi.jpg",
    },
    {
      name: "Sugai",
      type: "saudi",
      origin: "Saudi Arabia",
      description: "Distinctive multi-toned dates with crunchy yellow tips and soft brown bodies; deliciously chewy.",
      taste: "Mildly sweet & nutty",
      texture: "Chewy & crisp tips",
      priceRange: "PKR 2,200 – 3,500 / kg",
      avgPrice: "~2,850",
      marketSource: "Water Pump Market",
      imagePlaceholder: "/placeholder-sugai.jpg",
    },
    {
      name: "Mabroom",
      type: "saudi",
      origin: "Saudi Arabia",
      description: "Firm, elongated, semi-dry with mild sweetness; a common everyday-premium choice.",
      taste: "Mild sweetness",
      texture: "Firm & elongated",
      priceRange: "PKR 900 – 4,000 / kg",
      avgPrice: "~3,390",
      marketSource: "Water Pump & Empress Market",
      imagePlaceholder: "/placeholder-mabroom.jpg",
    },

    {
      name: "Rabbi",
      type: "iranian",
      origin: "Irani",
      description: "Medium-soft texture with mild sweetness; a mid-range local favorite from Balochistan.",
      taste: "Mild sweetness",
      texture: "Medium-soft",
      priceRange: "PKR 650 – 1,200 / kg",
      avgPrice: "~780",
      marketSource: "Water Pump & Empress Market",
      imagePlaceholder: "/placeholder-rabbi.jpg",
    },
    // Iranian Varieties
    {
      name: "Zahidi",
      type: "iranian",
      origin: "Iran",
      description: "Semi-dry, light golden-brown, firm texture with a mildly astringent taste. Common everyday date.",
      taste: "Mildly astringent",
      texture: "Semi-dry & firm",
      priceRange: "PKR 400 – 800 / kg",
      avgPrice: "~625",
      marketSource: "Water Pump & Empress Market",
      imagePlaceholder: "/placeholder-zahidi.jpg",
    },
    {
      name: "Muzafati",
      type: "iranian",
      origin: "Iran (Bam)",
      description: "Soft and moist, dark brown to black, sweet with a slight tang. Popular soft variety.",
      taste: "Sweet with slight tang",
      texture: "Soft & moist",
      priceRange: "PKR 500 – 800 / kg",
      avgPrice: "~635",
      marketSource: "Water Pump & Empress Market",
      imagePlaceholder: "/placeholder-muzafati.jpg",
    },
  ];

  const filteredVarieties = varieties.filter(
    (item) => filter === "all" || item.type === filter
  );

  const filterTabs: { label: string; value: "all" | "pakistani" | "iranian" | "saudi" }[] = [
    { label: "All Varieties", value: "all" },
    { label: "Saudi Premium", value: "saudi" },
    { label: "Pakistani", value: "pakistani" },
    { label: "Iranian", value: "iranian" },
  ];

  const typeLabels: Record<string, { label: string; class: string }> = {
    pakistani: { label: "Pakistani", class: "badge-origin--local" },
    iranian: { label: "Iranian", class: "badge-origin--imported" },
    saudi: { label: "Saudi Premium", class: "badge-origin--imported" },
  };

  const handleImageError = (name: string) => {
    setFailedImages((prev) => ({ ...prev, [name]: true }));
  };

  return (
    <SectionWrapper id="varieties" className="py-24 bg-background-light relative">
      <Container>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="max-w-2xl">
            <p className="font-body text-xs font-bold text-accent uppercase tracking-widest">{t("title")}</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-primary mt-2">
              Featured Date Cultivars
            </h2>
            <p className="font-body text-sm md:text-base text-foreground-muted mt-3">
              {t("description")}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-background-alt/80 p-1.5 rounded-xl border border-border/10 self-start flex-wrap">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`font-body text-xs md:text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer ${filter === tab.value
                    ? "bg-primary text-white shadow-sm"
                    : "text-primary hover:bg-primary/5"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {isLiveDemo ? (
          /* Compact pill strip — image + name + origin only */
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {filteredVarieties.map((variety) => {
              const hasError = failedImages[variety.name];
              return (
                <div
                  key={variety.name}
                  className="flex flex-col items-center gap-1.5 bg-white border border-border/10 rounded-xl p-2 shadow-sm"
                >
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 to-accent/5">
                    {!hasError ? (
                      <img
                        src={variety.imagePlaceholder}
                        alt={variety.name}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(variety.name)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-accent" />
                      </div>
                    )}
                  </div>
                  <p className="font-display font-bold text-[11px] text-primary text-center leading-tight">
                    {variety.name}
                  </p>
                  <p className="font-body text-[9px] text-foreground-muted text-center leading-tight">
                    {variety.origin}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          /* Original full card grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredVarieties.map((variety) => {
              const hasError = failedImages[variety.name];

              return (
                <div
                  key={variety.name}
                  className="card-variety group flex flex-col h-full cursor-pointer hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden border border-border/10 bg-white"
                >
                  {/* Image Container / Placeholder */}
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 flex flex-col items-center justify-center border-b border-border/8 overflow-hidden">
                    {!hasError ? (
                      <img
                        src={variety.imagePlaceholder}
                        alt={variety.name}
                        className="w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-300"
                        onError={() => handleImageError(variety.name)}
                      />
                    ) : null}

                    {/* Fallback Visual Placeholder */}
                    {hasError && (
                      <div className="inset-0 absolute flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-primary/10 via-background-alt to-accent/10">
                        <div className="w-14 h-14 rounded-2xl bg-white/80 border border-primary/15 shadow-sm flex items-center justify-center mb-2">
                          <Sparkles className="h-6 w-6 text-accent" />
                        </div>
                        <span className="font-display font-bold text-sm text-primary">{variety.name} Date</span>
                        <span className="font-body text-[10px] text-foreground-muted mt-1 px-2 py-0.5 bg-white/60 rounded-full border border-border/10">
                          {t("dropImage").split(" ")[0]} <code className="font-mono text-[9px] text-primary">{variety.imagePlaceholder}</code> 
                        </span>
                      </div>
                    )}

                    {/* Origin tag */}
                    <div className="absolute top-3 left-3 z-10">
                      <span
                        className={`badge-origin ${typeLabels[variety.type]?.class || "badge-origin--imported"}`}
                      >
                        <MapPin className="h-3 w-3" />
                        <span>{typeLabels[variety.type]?.label || variety.type}</span>
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="card-content flex flex-col justify-between flex-grow p-5 bg-white">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display font-bold text-lg text-primary">{variety.name}</h3>
                        <span className="font-body text-xs font-semibold text-foreground-muted">{variety.origin}</span>
                      </div>
                      <p className="font-body text-xs text-foreground-muted line-clamp-3 leading-relaxed">
                        {variety.description}
                      </p>
                    </div>

                    {/* Specs / Price Footer */}
                    <div className="mt-5 pt-4 border-t border-border/8 flex flex-col gap-2 font-body text-xs">
                      <div className="flex justify-between">
                        <span className="text-foreground-muted">{t("profile")}</span>
                        <span className="font-semibold text-primary">{variety.taste}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground-muted">{t("texture")}</span>
                        <span className="font-medium text-primary">{variety.texture}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground-muted">{t("market")}</span>
                        <span className="font-medium text-primary text-right text-[10px]">{variety.marketSource}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-sm bg-accent/6 rounded-lg p-2 text-accent font-semibold">
                        <div className="flex items-center gap-0.5">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span>{t("priceRange")}</span>
                        </div>
                        <span>{variety.priceRange}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Container>
    </SectionWrapper>
  );
}

