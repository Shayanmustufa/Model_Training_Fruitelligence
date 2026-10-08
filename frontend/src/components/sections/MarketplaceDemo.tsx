"use client";

import { useTranslations } from "next-intl";
import React from "react";
import { ShoppingCart, Percent, MapPin, Check } from "lucide-react";
import SectionWrapper from "../layout/SectionWrapper";
import Container from "../layout/Container";

interface FarmListing {
  id: string;
  farmName: string;
  location: string;
  variety: string;
  grade: string;
  quantityAvailable: string;
  directPrice: string;
  middlemanPrice: string;
  savings: string;
  badge: string;
}

export default function MarketplaceDemo() {
  const t = useTranslations("marketplace");
  const listings: FarmListing[] = [
    {
      id: "listing-1",
      farmName: "Balochistan Rabbi Cooperative",
      location: "Panjgur, Balochistan",
      variety: "Rabbi Dates (Medium-Soft)",
      grade: "Grade A (Local Favorite)",
      quantityAvailable: "10,000 kg",
      directPrice: "PKR 650 – 1,200 / kg",
      middlemanPrice: "PKR 1,600 / kg",
      savings: "35%",
      badge: "Regional Gem",
    },
    {
      farmName: "Madinah Date Orchards",
      id: "listing-2",
      location: "Madinah, Saudi Arabia",
      variety: "Ajwa Dates (Premium Soft)",
      grade: "Grade A (Prophet's Date)",
      quantityAvailable: "8,500 kg",
      directPrice: "PKR 900 – 4,000 / kg",
      middlemanPrice: "PKR 5,200 / kg",
      savings: "38%",
      badge: "Best Seller",
    },
    {
      id: "listing-3",
      farmName: "Al-Qassim Date Groves",
      location: "Qassim, Saudi Arabia",
      variety: "Kalmi Dates (Semi-Dry)",
      grade: "Grade A (Caramel Flavor)",
      quantityAvailable: "6,000 kg",
      directPrice: "PKR 2,600 – 3,200 / kg",
      middlemanPrice: "PKR 4,100 / kg",
      savings: "36%",
      badge: "Premium Choice",
    },
    {
      id: "listing-4",
      farmName: "Riyadh Palm Growers Union",
      location: "Riyadh, Saudi Arabia",
      variety: "Mabroom Dates (Firm Elongated)",
      grade: "Grade A (Organic Export)",
      quantityAvailable: "9,000 kg",
      directPrice: "PKR 900 – 4,000 / kg",
      middlemanPrice: "PKR 4,800 / kg",
      savings: "37%",
      badge: "Organic",
    },
  ];

  return (
    <SectionWrapper id="marketplace" className="py-24 bg-background-light relative">
      <Container>
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="font-body text-xs font-bold text-accent uppercase tracking-widest">{t("disintermediation")}</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-primary mt-2">
            Direct Farm-to-Buyer Marketplace
          </h2>
          <p className="font-body text-sm md:text-base text-foreground-muted mt-3">
            {t("description")}
          </p>
        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {listings.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-border/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              {/* Card Header */}
              <div className="p-6 border-b border-border/6 flex flex-col gap-4 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                  <span className="font-body text-[10px] font-bold text-accent bg-accent/15 border border-accent/25 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {item.badge}
                  </span>
                  <div className="flex items-center gap-1 font-body text-xs text-foreground-muted">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{item.location}</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-primary">{item.farmName}</h3>
                  <p className="font-body text-xs text-foreground-muted mt-1">{t("verifiedCoop")}</p>
                </div>
              </div>

              {/* Card Specs */}
              <div className="p-6 flex flex-col gap-4 font-body text-xs text-foreground-muted">
                <div className="flex justify-between">
                  <span>{t("varietyOffered")}</span>
                  <span className="font-bold text-primary">{item.variety}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("qualityGrade")}</span>
                  <span className="font-semibold text-primary">{item.grade}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("minOrder")}</span>
                  <span className="font-semibold text-primary">500 kg</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("bulkStock")}</span>
                  <span className="font-semibold text-primary">{item.quantityAvailable}</span>
                </div>

                {/* Price Matrix */}
                <div className="mt-4 bg-background-alt/50 border border-border/8 rounded-xl p-4 flex flex-col gap-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span>{t("arhtiPrice")}</span>
                    <span className="line-through text-destructive">{item.middlemanPrice}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-semibold text-primary">
                    <div className="flex items-center gap-1">
                      <ShoppingCart className="h-4 w-4" />
                      <span>{t("directPrice")}</span>
                    </div>
                    <span className="font-bold text-accent">{item.directPrice}</span>
                  </div>
                  <div className="flex justify-between items-center bg-accent/10 border border-accent/25 px-2.5 py-1.5 rounded-lg text-accent font-bold text-xs">
                    <div className="flex items-center gap-1">
                      <Percent className="h-3.5 w-3.5" />
                      <span>{t("netSavings")}</span>
                    </div>
                    <span>{item.savings} Saved</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Button Mock */}
              <div className="p-6 bg-background-alt/20 border-t border-border/6 flex items-center gap-3">
                <button
                  disabled
                  className="w-full font-body text-xs font-bold text-center bg-primary/10 border border-primary/20 text-primary py-3 rounded-xl cursor-not-allowed hover:bg-primary/15 transition-colors"
                >
                  Request Sample Batch
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Transaction protection highlights */}
        <div className="mt-12 max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-6 text-xs font-body text-foreground-muted">
          <div className="flex items-center gap-1.5">
            <Check className="h-4 w-4 text-success" />
            <span>{t("escrow")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="h-4 w-4 text-success" />
            <span>{t("logistics")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="h-4 w-4 text-success" />
            <span>{t("payouts")}</span>
          </div>
        </div>
      </Container>
    </SectionWrapper>
  );
}
