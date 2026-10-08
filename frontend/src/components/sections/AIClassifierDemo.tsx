"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  Camera,
  Scan,
  Sparkles,
  CheckCircle2,
  Cpu,
  ImageIcon,
  X,
  AlertCircle,
  User,
  Heart,
  ThumbsDown,
  Monitor,
} from "lucide-react";
import SectionWrapper from "../layout/SectionWrapper";
import Container from "../layout/Container";
import HealthProfileModal from "./HealthProfileModal";
import CameraFeed from "./CameraFeed";
import { useTranslations } from "next-intl";
import { useLiveDemo } from "../layout/LiveDemoLayout";
import {
  getRecommendations,
  type UserProfile,
  type MultiRecommendationResult,
  type SingleConditionRecommendation,
} from "@/lib/healthRecommendations";
import { resizeImageForInference } from "@/lib/resizeForInference";

type InputMode = "upload" | "camera";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ClassifiedVariety {
  name: string;
  origin: string;
  description: string;
  priceRange: string;
  avgPrice: string;
  texture: string;
  marketSource: string;
}

interface ClassifyApiResponse {
  variety: string;
  confidence: number;
  all_probabilities: Record<string, number>;
  is_date?: boolean;
  non_date_reason?: string;
  error?: string;
  message?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Non-Date Detection / OOD Filter
// ─────────────────────────────────────────────────────────────────────────────

export const NON_DATE_CONFIDENCE_THRESHOLD = 45.0;

/** ±percentage applied to nutritional values to display as a range */
const NUTRITION_RANGE_PERCENT = 10;

export interface NonDateCheckResult {
  isNonDate: boolean;
  reason?: string;
  confidence?: number;
}

export function checkNonDateImage(
  confidence: number,
  allProbabilities?: Record<string, number> | null,
  apiResponse?: ClassifyApiResponse
): NonDateCheckResult {
  // MobileNetV4 Date Verification Gate check from backend
  if (apiResponse?.is_date === false || apiResponse?.error === "non_date") {
    return {
      isNonDate: true,
      reason:
        apiResponse.message ||
        apiResponse.non_date_reason ||
        "Please Enter a Correct Date Image.",
      confidence,
    };
  }

  return { isNonDate: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Variety database
// ─────────────────────────────────────────────────────────────────────────────

const SURVEY_VARIETIES: ClassifiedVariety[] = [
  {
    name: "Ajwa",
    origin: "Saudi Arabia",
    description:
      "Dark, soft, dense flesh with a rich flavor; carries religious and cultural significance as the 'Prophet's date.'",
    priceRange: "PKR 900 – 4,000 / kg",
    avgPrice: "PKR ~3,300 / kg",
    texture: "Dense & soft",
    marketSource: "Water Pump & Empress Market",
  },
  {
    name: "Amber",
    origin: "Saudi Arabia",
    description:
      "Large, soft, golden-brown dates with a mild flavor and fleshy pulp.",
    priceRange: "PKR 2,600 – 4,800 / kg",
    avgPrice: "PKR ~4,000 / kg",
    texture: "Soft & large",
    marketSource: "Water Pump & Empress Market",
  },
  {
    name: "Kalmi",
    origin: "Saudi Arabia",
    description:
      "Long, slender dates, semi-dry with a caramel-toned flesh.",
    priceRange: "PKR 2,600 – 3,200 / kg",
    avgPrice: "PKR ~2,970 / kg",
    texture: "Semi-dry & slender",
    marketSource: "Water Pump & Empress Market",
  },
  {
    name: "Sagai",
    origin: "Saudi Arabia",
    description:
      "Multi-toned dates with yellow crunchy tips and soft brown bodies; chewy & mild sweetness.",
    priceRange: "PKR 2,200 – 3,500 / kg",
    avgPrice: "PKR ~2,850 / kg",
    texture: "Chewy & crisp tips",
    marketSource: "Water Pump Market",
  },
  {
    name: "Rabbi",
    origin: "Balochistan, Pakistan",
    description:
      "Medium-soft texture with mild sweetness; a mid-range local favorite from Balochistan.",
    priceRange: "PKR 650 – 1,200 / kg",
    avgPrice: "PKR ~780 / kg",
    texture: "Medium-soft",
    marketSource: "Water Pump & Empress Market",
  },
  {
    name: "Zahedi",
    origin: "Iran",
    description:
      "Semi-dry, light golden-brown, firm texture with a mildly astringent taste. The most common everyday date.",
    priceRange: "PKR 400 – 800 / kg",
    avgPrice: "PKR ~625 / kg",
    texture: "Semi-dry & firm",
    marketSource: "Water Pump & Empress Market",
  },
  {
    name: "Mazafati",
    origin: "Iran",
    description:
      "Soft and moist, dark brown to black, sweet with a slight tang. Popular soft variety.",
    priceRange: "PKR 500 – 800 / kg",
    avgPrice: "PKR ~635 / kg",
    texture: "Soft & moist",
    marketSource: "Water Pump & Empress Market",
  },
  {
    name: "Mabroom",
    origin: "Saudi Arabia",
    description:
      "Firm, elongated, semi-dry with mild sweetness; a common everyday-premium choice.",
    priceRange: "PKR 900 – 4,000 / kg",
    avgPrice: "PKR ~3,390 / kg",
    texture: "Firm & elongated",
    marketSource: "Water Pump & Empress Market",
  },
];

const VARIETY_MAP = new Map(SURVEY_VARIETIES.map((v) => [v.name, v]));

// ─────────────────────────────────────────────────────────────────────────────
// Nutritional data (per 100 g dry weight, from Fruitelligence_Final_Nutritional_Table.xlsx)
// ─────────────────────────────────────────────────────────────────────────────

interface NutritionRow {
  label: string;
  unit: string;
  value: number | null;
}

type NutritionMap = Record<string, NutritionRow[]>;

const NUTRITION_DATA: NutritionMap = {
  Ajwa: [
    { label: "Energy",        unit: "kcal", value: 277  },
    { label: "Carbohydrates", unit: "g",    value: 75   },
    { label: "Total Sugars",  unit: "g",    value: 74.3 },
    { label: "Fiber",         unit: "g",    value: 8.26 },
    { label: "Protein",       unit: "g",    value: 2.91 },
    { label: "Fat",           unit: "g",    value: 0.47 },
    { label: "Moisture",      unit: "g",    value: 22.8 },
    { label: "Potassium",     unit: "mg",   value: 476  },
    { label: "Calcium",       unit: "mg",   value: 187  },
    { label: "Magnesium",     unit: "mg",   value: 150  },
    { label: "Iron",          unit: "mg",   value: 0.15 },
    { label: "Sodium",        unit: "mg",   value: 7.5  },
  ],
  Amber: [
    { label: "Energy",        unit: "kcal", value: 274  },
    { label: "Carbohydrates", unit: "g",    value: 75   },
    { label: "Total Sugars",  unit: "g",    value: 78.4 },
    { label: "Fiber",         unit: "g",    value: 8.05 },
    { label: "Protein",       unit: "g",    value: 3.49 },
    { label: "Fat",           unit: "g",    value: 0.51 },
    { label: "Moisture",      unit: "g",    value: 29.5 },
    { label: "Potassium",     unit: "mg",   value: 800  },
    { label: "Calcium",       unit: "mg",   value: 64   },
    { label: "Magnesium",     unit: "mg",   value: 54   },
    { label: "Iron",          unit: "mg",   value: 0.9  },
    { label: "Sodium",        unit: "mg",   value: 2    },
  ],
  Kalmi: [
    { label: "Energy",        unit: "kcal", value: 282  },
    { label: "Carbohydrates", unit: "g",    value: 75   },
    { label: "Total Sugars",  unit: "g",    value: 75.3 },
    { label: "Fiber",         unit: "g",    value: 6.61 },
    { label: "Protein",       unit: "g",    value: 2.48 },
    { label: "Fat",           unit: "g",    value: 0.12 },
    { label: "Moisture",      unit: "g",    value: 23.6 },
    { label: "Potassium",     unit: "mg",   value: 512  },
    { label: "Calcium",       unit: "mg",   value: 21.6 },
    { label: "Magnesium",     unit: "mg",   value: 56   },
    { label: "Iron",          unit: "mg",   value: 0.32 },
    { label: "Sodium",        unit: "mg",   value: 8.6  },
  ],
  Mabroom: [
    { label: "Energy",        unit: "kcal", value: 277  },
    { label: "Carbohydrates", unit: "g",    value: 74   },
    { label: "Total Sugars",  unit: "g",    value: 76.4 },
    { label: "Fiber",         unit: "g",    value: 8    },
    { label: "Protein",       unit: "g",    value: 1.72 },
    { label: "Fat",           unit: "g",    value: 0.27 },
    { label: "Moisture",      unit: "g",    value: 21.3 },
    { label: "Potassium",     unit: "mg",   value: 655  },
    { label: "Calcium",       unit: "mg",   value: 60   },
    { label: "Magnesium",     unit: "mg",   value: 54   },
    { label: "Iron",          unit: "mg",   value: 0.9  },
    { label: "Sodium",        unit: "mg",   value: 2    },
  ],
  Sagai: [
    { label: "Energy",        unit: "kcal", value: 277  },
    { label: "Carbohydrates", unit: "g",    value: 75   },
    { label: "Total Sugars",  unit: "g",    value: 79.7 },
    { label: "Fiber",         unit: "g",    value: 8.85 },
    { label: "Protein",       unit: "g",    value: 2.73 },
    { label: "Fat",           unit: "g",    value: 0.41 },
    { label: "Moisture",      unit: "g",    value: 14.5 },
    { label: "Potassium",     unit: "mg",   value: 656  },
    { label: "Calcium",       unit: "mg",   value: 64   },
    { label: "Magnesium",     unit: "mg",   value: 54   },
    { label: "Iron",          unit: "mg",   value: 1    },
    { label: "Sodium",        unit: "mg",   value: 1    },
  ],
  Mazafati: [
    { label: "Energy",        unit: "kcal", value: 277  },
    { label: "Carbohydrates", unit: "g",    value: 75   },
    { label: "Total Sugars",  unit: "g",    value: 69.4 },
    { label: "Fiber",         unit: "g",    value: 8    },
    { label: "Protein",       unit: "g",    value: 5.2  },
    { label: "Fat",           unit: "g",    value: 0.25 },
    { label: "Moisture",      unit: "g",    value: 23   },
    { label: "Potassium",     unit: "mg",   value: 943  },
    { label: "Calcium",       unit: "mg",   value: 150  },
    { label: "Magnesium",     unit: "mg",   value: 104  },
    { label: "Iron",          unit: "mg",   value: 1.05 },
    { label: "Sodium",        unit: "mg",   value: 129  },
  ],
  Zahedi: [
    { label: "Energy",        unit: "kcal", value: 323  },
    { label: "Carbohydrates", unit: "g",    value: 78   },
    { label: "Total Sugars",  unit: "g",    value: 54   },
    { label: "Fiber",         unit: "g",    value: 12   },
    { label: "Protein",       unit: "g",    value: 5.3  },
    { label: "Fat",           unit: "g",    value: 0.27 },
    { label: "Moisture",      unit: "g",    value: 13   },
    { label: "Potassium",     unit: "mg",   value: 966  },
    { label: "Calcium",       unit: "mg",   value: 120  },
    { label: "Magnesium",     unit: "mg",   value: 141  },
    { label: "Iron",          unit: "mg",   value: 3    },
    { label: "Sodium",        unit: "mg",   value: 135  },
  ],
  Rabbi: [
    { label: "Energy",        unit: "kcal", value: 314   },
    { label: "Carbohydrates", unit: "g",    value: 80.62 },
    { label: "Total Sugars",  unit: "g",    value: 80.62 },
    { label: "Fiber",         unit: "g",    value: 7.1   },
    { label: "Protein",       unit: "g",    value: 3.3   },
    { label: "Fat",           unit: "g",    value: 0.24  },
    { label: "Moisture",      unit: "g",    value: 14    },
    { label: "Potassium",     unit: "mg",   value: 379   },
    { label: "Calcium",       unit: "mg",   value: null  },
    { label: "Magnesium",     unit: "mg",   value: 45    },
    { label: "Iron",          unit: "mg",   value: 0.21  },
    { label: "Sodium",        unit: "mg",   value: 6.6   },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Nutrition Table Sub-component
// ─────────────────────────────────────────────────────────────────────────────

function formatNutritionRange(value: number | null, unit: string): string {
  if (value === null) return "—";
  const factor = NUTRITION_RANGE_PERCENT / 100;
  const lower = +(value * (1 - factor)).toFixed(1);
  const upper = +(value * (1 + factor)).toFixed(1);
  return `${lower} – ${upper} ${unit}`;
}

function NutritionTable({ variety }: { variety: string }) {
  const tClass = useTranslations("classifier");
  const tNutr = useTranslations("nutritionLabels");
  const rows = NUTRITION_DATA[variety];
  if (!rows) return null;

  // Split into macros (first 7) and minerals (last 5)
  const macros = rows.slice(0, 7);
  const minerals = rows.slice(7);

  return (
    <div className="bg-background-alt/40 border border-border/8 rounded-2xl p-4">
      <p className="font-body text-[10px] font-bold uppercase tracking-wider text-foreground-muted mb-3">
        {tClass("nutritionTitle")}
      </p>

      {/* Macros */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
        {macros.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-2">
            <span className="font-body text-[11px] text-foreground-muted truncate">{tNutr(row.label)}</span>
            <span className="font-body text-[11px] font-semibold text-primary whitespace-nowrap">
              {formatNutritionRange(row.value, row.unit)}
            </span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-border/10 my-2" />

      {/* Minerals */}
      <p className="font-body text-[9px] font-bold uppercase tracking-wider text-foreground-muted/70 mb-2">
        {tClass("minerals")}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {minerals.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-2">
            <span className="font-body text-[11px] text-foreground-muted truncate">{tNutr(row.label)}</span>
            <span className="font-body text-[11px] font-semibold text-primary whitespace-nowrap">
              {formatNutritionRange(row.value, row.unit)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Health Recommendation Banner & Multi-Disease Report
// ─────────────────────────────────────────────────────────────────────────────

function RecommendationBanner({ result }: { result: MultiRecommendationResult }) {
  const tClass = useTranslations("classifier");
  const tHealth = useTranslations("healthRules");

  const getReason = (item: SingleConditionRecommendation) => {
    if (item.status === 'not_recommended') {
       return `${tClass("lessFavorable")} — ${tHealth(`${item.key}.avoid_reason`)}.`;
    } else if (item.status === 'beneficial') {
       return `${tClass("recommended")} — ${tHealth(`${item.key}.beneficial_reason`)}.`;
    } else {
       return `${tClass("neutral")} — ${tHealth(`${item.key}.neutral_reason`)}.`;
    }
  };

  if (!result.hasProfile || result.items.length === 0) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-border/20 bg-background-alt/50 px-4 py-3 text-xs font-body text-foreground-muted animate-in fade-in duration-300">
        <User className="h-4 w-4 shrink-0 text-foreground-muted mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-primary">{tClass("healthProfilePrefix")}</span>
          <span>{tClass("addProfilePrompt")}</span>
        </div>
      </div>
    );
  }

  // If exactly 1 condition was active in the profile
  if (result.items.length === 1) {
    const item = result.items[0];
    const style = {
      beneficial: {
        container: "bg-success/8 border-success/25 text-success",
        icon: <Heart className="h-4 w-4 shrink-0 text-success" />,
        badge: tClass("recommendedBadge"),
      },
      not_recommended: {
        container: "bg-destructive/8 border-destructive/25 text-destructive",
        icon: <ThumbsDown className="h-4 w-4 shrink-0 text-destructive" />,
        badge: tClass("lessBeneficialBadge"),
      },
      neutral: {
        container: "bg-background-alt border-border/20 text-foreground-muted",
        icon: <User className="h-4 w-4 shrink-0 text-foreground-muted" />,
        badge: tClass("healthProfileBadge"),
      },
    }[item.status];

    return (
      <div
        className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs font-body ${style.container} animate-in fade-in duration-300`}
      >
        {style.icon}
        <div className="leading-relaxed">
          <span className="font-bold">{style.badge} ({item.label}) — </span>
          <span>{getReason(item)}</span>
        </div>
      </div>
    );
  }

  // Multiple conditions evaluated
  const summaryStyle = {
    beneficial: {
      badge: "bg-success/15 text-success border-success/30",
      text: tClass("favorableChoice"),
    },
    not_recommended: {
      badge: "bg-destructive/15 text-destructive border-destructive/30",
      text: tClass("consumeWithCaution"),
    },
    mixed: {
      badge: "bg-accent/15 text-accent border-accent/30",
      text: tClass("mixedSuitability"),
    },
    neutral: {
      badge: "bg-foreground-muted/15 text-foreground-muted border-foreground-muted/30",
      text: tClass("neutralSuitability"),
    },
  }[result.overallStatus];

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-primary/15 bg-background-alt/40 p-4 font-body animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/10">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-bold text-primary">
            {tClass("personalizedAssessment")}
          </span>
          <span className="text-[11px] text-foreground-muted">
            {tClass("conditionsEvaluated", { count: result.activeCount })}
          </span>
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${summaryStyle.badge}`}
        >
          {summaryStyle.text}
        </span>
      </div>

      {/* Individual Condition Cards */}
      <div className="flex flex-col gap-2 pt-1">
        {result.items.map((item) => {
          const itemConfig = {
            beneficial: {
              container: "bg-success/8 border-success/20",
              badge: "bg-success/15 text-success border-success/30",
              badgeText: tClass("recommended"),
              icon: <Heart className="h-3.5 w-3.5 shrink-0 text-success" />,
              textColor: "text-foreground",
            },
            not_recommended: {
              container: "bg-destructive/8 border-destructive/20",
              badge: "bg-destructive/15 text-destructive border-destructive/30",
              badgeText: tClass("lessFavorable"),
              icon: <ThumbsDown className="h-3.5 w-3.5 shrink-0 text-destructive" />,
              textColor: "text-foreground",
            },
            neutral: {
              container: "bg-background-alt/80 border-border/15",
              badge: "bg-foreground-muted/15 text-foreground-muted border-foreground-muted/30",
              badgeText: tClass("neutral"),
              icon: <User className="h-3.5 w-3.5 shrink-0 text-foreground-muted" />,
              textColor: "text-foreground-muted",
            },
          }[item.status];

          return (
            <div
              key={item.key}
              className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-xs ${itemConfig.container}`}
            >
              <div className="mt-0.5 shrink-0">{itemConfig.icon}</div>
              <div className="flex-1 leading-relaxed">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-semibold text-primary">{tHealth(`${item.key}.label`)}</span>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${itemConfig.badge}`}
                  >
                    {itemConfig.badgeText}
                  </span>
                </div>
                <p className={`text-[11px] leading-normal ${itemConfig.textColor}`}>
                  {getReason(item)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Backend warm-up status & retry (Render free tier sleeps when idle)
// ─────────────────────────────────────────────────────────────────────────────

type BackendStatus = "checking" | "waking" | "ready";

const STATUS_POLL_MS = 5000;
const STATUS_MAX_POLLS = 30; // ~2.5 minutes, then stop polling quietly

/** Polls /api/keepalive until the inference backend reports its model is loaded. */
function useBackendStatus(): [BackendStatus, () => void] {
  const [status, setStatus] = useState<BackendStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let polls = 0;

    const check = async () => {
      polls += 1;
      let ready = false;
      try {
        const res = await fetch("/api/keepalive", { cache: "no-store" });
        const data = await res.json();
        ready = data?.backend === "alive" && data?.detail?.date_model_loaded !== false;
      } catch {
        // Treat any failure as "still waking"
      }
      if (cancelled) return;
      setStatus(ready ? "ready" : "waking");
      if (!ready && polls < STATUS_MAX_POLLS) {
        timer = setTimeout(check, STATUS_POLL_MS);
      }
    };

    check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const markReady = useCallback(() => setStatus("ready"), []);
  return [status, markReady];
}

const CLASSIFY_MAX_ATTEMPTS = 4;
const CLASSIFY_RETRY_DELAY_MS = 4000;
// Gateway / unavailable statuses mean the backend is cold-starting — worth retrying
const RETRYABLE_STATUSES = new Set([502, 503, 504]);

const WAKING_ERROR_MESSAGE =
  "The AI model server is still waking up. Please wait a few seconds and try again.";

/**
 * POSTs to /api/classify, retrying network failures and 502/503/504 responses.
 * Returns the final Response (which may still be non-OK), or throws if every
 * attempt failed at the network level.
 */
async function classifyWithRetry(
  form: FormData,
  onRetry: (attempt: number) => void
): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const isLast = attempt >= CLASSIFY_MAX_ATTEMPTS;
    try {
      const res = await fetch("/api/classify", { method: "POST", body: form });
      if (res.ok || isLast || !RETRYABLE_STATUSES.has(res.status)) return res;
    } catch (err) {
      if (isLast) throw err;
    }
    onRetry(attempt + 1);
    await new Promise((resolve) => setTimeout(resolve, CLASSIFY_RETRY_DELAY_MS));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AIClassifierDemo() {
  const tClass = useTranslations("classifier");
  const tVar = useTranslations("varieties");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<string>("");
  const [scanCompleted, setScanCompleted] = useState<boolean>(false);
  const [classifiedResult, setClassifiedResult] = useState<ClassifiedVariety | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [inputMode, setInputMode] = useState<InputMode>("upload");
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isNonDate, setIsNonDate] = useState<boolean>(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showProfileWarning, setShowProfileWarning] = useState(false);
  const [recommendation, setRecommendation] = useState<MultiRecommendationResult | null>(null);
  const [backendStatus, markBackendReady] = useBackendStatus();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { isLiveDemo, setIsLiveDemo, capturedImage, setCapturedImage, liveResult } = useLiveDemo();

  // ── Profile on mount (persistence commented out as requested) ───────────
  // const LS_KEY = "fruitelligence_health_profile";

  useEffect(() => {
    // Persistent profile loading commented out as requested
    /*
    const loadProfile = async () => {
      // 1. Check localStorage immediately (no network delay)
      try {
        const stored = localStorage.getItem(LS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as UserProfile;
          setUserProfile({ ...parsed, exists: true });
          return; // localStorage hit — no backend call needed
        }
      } catch {
        // corrupted localStorage entry — ignore and fall through
      }

      // 2. Fallback: fetch from backend (first visit or cleared storage)
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        const data = await res.json();
        if (data.exists) {
          setUserProfile(data as UserProfile);
          // Populate localStorage so future visits skip the network call
          localStorage.setItem(LS_KEY, JSON.stringify(data));
        }
      } catch {
        // no-op — user proceeds without a profile
      }
    };
    loadProfile();
    */
  }, []);

  // ── File handling ────────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setValidationError("Please select a valid image file (JPG, PNG, or WebP).");
      return;
    }
    setRawFile(file);
    setFileName(file.name);
    setScanCompleted(false);
    setClassifiedResult(null);
    setConfidence(null);
    setError(null);
    setValidationError(null);
    setIsNonDate(false);
    setRecommendation(null);
    const reader = new FileReader();
    reader.onload = (e) => { setUploadedImage(e.target?.result as string); };
    reader.readAsDataURL(file);
  }, []);

  const handleCapture = useCallback((blob: Blob, url: string) => {
    setUploadedImage(url);
    const file = new File([blob], "live-capture.jpg", { type: "image/jpeg" });
    setRawFile(file);
    setFileName("Live Capture");
    setScanCompleted(false);
    setClassifiedResult(null);
    setConfidence(null);
    setError(null);
    setValidationError(null);
    setIsNonDate(false);
    setRecommendation(null);
  }, []);

  useEffect(() => {
    if (capturedImage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleCapture(capturedImage.blob, capturedImage.url);
      setCapturedImage(null);
    }
  }, [capturedImage, handleCapture, setCapturedImage]);

  useEffect(() => {
    if (isLiveDemo && inputMode === "camera") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInputMode("upload");
    }
  }, [isLiveDemo, inputMode]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setRawFile(null);
    setFileName("");
    setScanCompleted(false);
    setClassifiedResult(null);
    setConfidence(null);
    setError(null);
    setValidationError(null);
    setIsNonDate(false);
    setRecommendation(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Classification ───────────────────────────────────────────────────────

  const handleClassify = async () => {
    // Health Profile Gate: show popup and prevent classification until profile is completed and saved
    if (!userProfile?.exists) {
      setShowProfileWarning(true);
      setProfileModalOpen(true);
      return;
    }

    if (!uploadedImage || !rawFile) {
      setValidationError("Please upload an image of a date fruit first before classifying.");
      setIsNonDate(false);
      return;
    }

    setValidationError(null);
    setIsNonDate(false);
    setScanning(true);
    setScanCompleted(false);
    setClassifiedResult(null);
    setConfidence(null);
    setError(null);
    setRecommendation(null);

    const steps = [
      { text: "Initializing image pre-processing pipeline...", delay: 200 },
      { text: "Running MobileNetV4 Date Verification Gate...", delay: 600 },
      { text: tClass("runningClassifier"), delay: 1400 },
      { text: "Computing softmax probabilities across classes...", delay: 2000 },
      { text: "Compiling classification report & price index...", delay: 2600 },
    ];

    const timers: ReturnType<typeof setTimeout>[] = [];
    steps.forEach((step) => {
      timers.push(setTimeout(() => setScanStep(step.text), step.delay));
    });

    let inferenceBlob: Blob = rawFile;
    let inferenceName = rawFile.name;
    try {
      inferenceBlob = await resizeImageForInference(rawFile);
      inferenceName = "inference.jpg";
    } catch (resizeErr) {
      console.warn("[classify] Client-side 224×224 resize failed; sending original file", resizeErr);
    }

    const form = new FormData();
    form.append("image", inferenceBlob, inferenceName);

    try {
      let res: Response;
      try {
        res = await classifyWithRetry(form, (attempt) => {
          // Stop the scripted steps so they don't overwrite the retry message
          timers.forEach(clearTimeout);
          setScanStep(
            `Model server is waking up — retrying (${attempt}/${CLASSIFY_MAX_ATTEMPTS})...`
          );
        });
      } catch {
        throw new Error(WAKING_ERROR_MESSAGE);
      }

      if (!res.ok) {
        if (RETRYABLE_STATUSES.has(res.status)) {
          throw new Error(WAKING_ERROR_MESSAGE);
        }
        let errorMsg = "Something went wrong while classifying this image. Please try another image.";
        try {
          const errData = await res.json();
          if (typeof errData?.error === "string" && errData.error) errorMsg = errData.error;
        } catch {
          // Non-JSON body — keep the friendly default
        }
        throw new Error(errorMsg);
      }

      const data: ClassifyApiResponse = await res.json();
      markBackendReady();
      if (data.error) {
        throw new Error(data.error);
      }

      const nonDateCheck = checkNonDateImage(data.confidence, data.all_probabilities, data);
      if (nonDateCheck.isNonDate) {
        setIsNonDate(true);
        setValidationError(
          nonDateCheck.reason ||
            "The uploaded image does not appear to be a recognized date fruit."
        );
        setScanCompleted(false);
        return;
      }

      const variety = VARIETY_MAP.get(data.variety) ?? null;
      setClassifiedResult(variety);
      setConfidence(data.confidence);
      setScanCompleted(true);

      // Compute health recommendation
      const rec = getRecommendations(data.variety, userProfile);
      setRecommendation(rec);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected error occurred.";
      setError(msg);
    } finally {
      timers.forEach(clearTimeout);
      setScanning(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SectionWrapper
      id="demos"
      className="py-24 bg-background-alt/50 relative overflow-hidden"
    >
      {/* Decorative Blur */}
      <div className="absolute bottom-[-10%] right-[-10%] w-[350px] h-[350px] bg-accent/4 rounded-full blur-[100px] pointer-events-none" />

      {/* Health Profile Modal */}
      <HealthProfileModal
        isOpen={profileModalOpen && !scanning}
        onClose={() => setProfileModalOpen(false)}
        onSaved={(profile) => {
          setUserProfile(profile);
          setShowProfileWarning(false);
          if (classifiedResult) {
            const rec = getRecommendations(classifiedResult.name, profile);
            setRecommendation(rec);
          }
        }}
      />

      <Container>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="font-body text-xs font-bold text-accent uppercase tracking-widest">
            Interactive Demonstration
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-2">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-primary">
              AI Date Variety Classifier
            </h2>
            <button
              type="button"
              onClick={() => setIsLiveDemo(!isLiveDemo)}
              className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/20 bg-primary/5 text-primary font-body text-sm font-semibold hover:bg-primary/10 transition-all cursor-pointer"
            >
              <Monitor className="h-4 w-4" />
              {isLiveDemo ? tClass("exitLive") : tClass("viewLive")}
            </button>
          </div>
          <p className="font-body text-sm md:text-base text-foreground-muted mt-3">
            {tClass("descriptionPart1", { accuracy: "94.44%" })}
            {tClass("descriptionPart2")}
          </p>
        </div>

        <div className={isLiveDemo
          ? "flex flex-col gap-6 max-w-5xl mx-auto"
          : "grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch max-w-5xl mx-auto"
        }>
          {/* ── Left Column: Image Upload ─────────────────────────────── */}
          <div className={`${isLiveDemo ? "" : "lg:col-span-5 "}bg-white border border-border/10 rounded-3xl p-5 sm:p-6 md:p-8 flex flex-col justify-between shadow-sm`}>
            <div className="flex flex-col gap-5 sm:gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="font-display font-semibold text-lg sm:text-xl text-primary">
                  {isLiveDemo ? tClass("capturedTitle") : tClass("uploadTitle")}
                </h3>

                {/* Input Mode Toggle */}
                {!uploadedImage && !isLiveDemo && (
                  <div className="flex bg-background-alt/50 p-1 rounded-xl border border-border/10">
                    <button
                      type="button"
                      onClick={() => setInputMode("upload")}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        inputMode === "upload"
                          ? "bg-white text-primary shadow-sm"
                          : "text-foreground-muted hover:text-primary"
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" /> File
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode("camera")}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        inputMode === "camera"
                          ? "bg-white text-primary shadow-sm"
                          : "text-foreground-muted hover:text-primary"
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" /> Camera
                    </button>
                  </div>
                )}
              </div>

              {!uploadedImage ? (
                isLiveDemo ? (
                  <div className="relative flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-2xl p-8 sm:p-10 border-border/20 bg-background-alt/30 h-52 sm:h-56">
                    <Monitor className="h-8 w-8 text-foreground-muted" />
                    <p className="font-body text-sm text-foreground-muted text-center">{tClass("waitingLive")}</p>
                  </div>
                ) : inputMode === "camera" ? (
                  /* Camera Feed */
                  <div className="h-64 sm:h-72 w-full mt-2">
                    <CameraFeed onCapture={handleCapture} disabled={scanning} />
                  </div>
                ) : (
                  /* Drop Zone */
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-2xl p-8 sm:p-10 cursor-pointer transition-all duration-300 ${
                      isDragOver
                        ? "border-accent bg-accent/5 scale-[1.02]"
                        : "border-border/20 bg-background-alt/30 hover:border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/15">
                      <Upload
                        className={`h-6 w-6 sm:h-7 sm:w-7 transition-colors ${
                          isDragOver ? "text-accent" : "text-primary"
                        }`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="font-body text-sm font-semibold text-primary">
                        {isDragOver ? tClass("dropHere") : tClass("dragDrop")}
                      </p>
                      <p className="font-body text-xs text-foreground-muted mt-1">
                        or click to browse — JPG, PNG, WebP
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </div>
                )
              ) : (
                /* Image Preview */
                <div className="relative rounded-2xl overflow-hidden border border-border/10 bg-background-alt/30">
                  <img
                    src={uploadedImage}
                    alt="Uploaded date sample"
                    className="w-full h-52 sm:h-56 object-cover"
                  />
                  <button
                    onClick={handleRemoveImage}
                    disabled={scanning}
                    className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm border border-border/20 rounded-full p-1.5 text-foreground-muted hover:text-destructive hover:border-destructive/30 transition-colors cursor-pointer disabled:opacity-50"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="p-3 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-body text-xs text-foreground-muted truncate">
                      {fileName}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Validation Error */}
            {validationError && (
              <div
                role="alert"
                className="mt-4 p-3 sm:p-3.5 rounded-2xl bg-destructive/8 border border-destructive/20 text-destructive flex items-start gap-2.5 sm:gap-3 text-xs transition-all animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                <div className="flex-1 text-left">
                  <p className="font-semibold text-xs text-destructive">
                    {isNonDate ? tClass("nonDateDetected") : tClass("imageRequired")}
                  </p>
                  <p className="text-[11px] sm:text-xs text-foreground-muted mt-0.5 leading-relaxed">
                    {validationError}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setValidationError(null); setIsNonDate(false); }}
                  className="p-1 text-foreground-muted hover:text-destructive rounded-lg transition-colors cursor-pointer shrink-0"
                  aria-label="Dismiss error notification"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-3">
              {showProfileWarning && !userProfile?.exists && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/50 flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-xs text-amber-800">{tClass("healthMissing")}</p>
                    <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                      {tClass("healthMissingDesc")}
                    </p>
                    <button
                      type="button"
                      onClick={() => setProfileModalOpen(true)}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 underline hover:text-amber-950 cursor-pointer"
                    >
                      Complete Health Profile Now &rarr;
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProfileWarning(false)}
                    className="p-1 text-amber-500 hover:text-amber-700 rounded-lg transition-colors cursor-pointer shrink-0"
                    aria-label="Dismiss warning"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleClassify}
                disabled={scanning}
                className={`w-full group btn-primary flex items-center justify-center gap-2.5 py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base transition-all duration-200 cursor-pointer focus-ring-custom shadow-sm hover:shadow-md active:scale-[0.98] ${
                  scanning ? "opacity-75 cursor-wait" : "hover:brightness-105"
                }`}
              >
                {scanning ? (
                  <>
                    <Cpu className="h-5 w-5 animate-spin text-white shrink-0" />
                    <span>{tClass("classifying")}</span>
                  </>
                ) : (
                  <>
                    <Scan className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                    <span>{tClass("classifyAction")}</span>
                  </>
                )}
              </button>

              {/* Health Profile Button (Blocked during prediction) */}
              <button
                type="button"
                onClick={() => {
                  if (scanning) return;
                  setProfileModalOpen(true);
                }}
                disabled={scanning}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-body text-sm font-semibold transition-all duration-200 ${
                  scanning
                    ? "opacity-50 cursor-not-allowed border-border/10 bg-background-alt/20 text-foreground-muted pointer-events-none"
                    : "border-border/20 bg-background-alt/40 text-primary hover:bg-primary/6 hover:border-primary/25 cursor-pointer"
                }`}
                title={
                  scanning
                    ? "Inference in progress — health menu is locked during classification"
                    : "Manage your health profile"
                }
              >
                <User className="h-4 w-4 shrink-0" />
                {userProfile?.exists
                  ? tClass("updateProfile")
                  : tClass("setProfile")}
              </button>

              <div
                role="status"
                className="flex items-center justify-center gap-1.5 font-body text-[10px] text-foreground-muted"
              >
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    backendStatus === "ready" ? "bg-green-500" : "bg-amber-500 animate-pulse"
                  }`}
                />
                {backendStatus === "ready"
                  ? tClass("modelOnline")
                  : backendStatus === "waking"
                    ? tClass("modelWarming")
                    : tClass("modelConnecting")}
              </div>

              <p className="font-body text-[10px] text-foreground-muted/60 text-center">
                {tClass("modelSpecs")}
              </p>
            </div>
          </div>

          {/* ── Right Column: Classification Results ──────────────────── */}
          <div className={`${isLiveDemo ? "" : "lg:col-span-7 "}bg-white border border-border/10 rounded-3xl p-5 sm:p-6 md:p-8 flex flex-col justify-center shadow-sm relative min-h-[350px]`}>

            {/* ── Live Demo: result from the verified capture ─────────── */}
            {isLiveDemo && liveResult && (
              <div className="text-center py-4 flex flex-col items-center justify-start gap-1 animate-in fade-in duration-300">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-body text-xs font-semibold text-green-700 uppercase tracking-wider">{tClass("liveResult")}</span>
                </div>
              </div>
            )}

            {/* ── Live Demo: waiting for first result ─────────────────── */}
            {isLiveDemo && !liveResult && (
              <div className="text-center py-12 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-background-alt flex items-center justify-center border border-border/10">
                  <Scan className="h-8 w-8 text-accent animate-pulse" />
                </div>
                <h3 className="font-display font-semibold text-lg text-primary">{tClass("scanning")}</h3>
                <p className="font-body text-xs sm:text-sm text-foreground-muted max-w-[280px] leading-relaxed">
                  {tClass("placeFruit")}
                </p>
              </div>
            )}

            {/* Initial State (non-live) */}
            {!isLiveDemo && !scanning && !scanCompleted && !error && !isNonDate && (
              <div className="text-center py-12 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-background-alt flex items-center justify-center border border-border/10">
                  <Scan className="h-8 w-8 text-accent animate-pulse" />
                </div>
                <h3 className="font-display font-semibold text-lg text-primary">
                  Ready to Classify
                </h3>
                <p className="font-body text-xs sm:text-sm text-foreground-muted max-w-[300px] leading-relaxed">
                  {tClass("readyDesc")}
                </p>
              </div>
            )}

            {/* Non-Date Detected State */}
            {!scanning && isNonDate && (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-4 animate-in fade-in">
                <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20">
                  <AlertCircle className="h-7 w-7 text-destructive" />
                </div>
                <div className="max-w-md">
                  <h3 className="font-display font-semibold text-base sm:text-lg text-primary">
                    Non-Date Image Detected
                  </h3>
                  <p className="font-body text-xs sm:text-sm text-foreground-muted mt-1.5 leading-relaxed">
                    {validationError ||
                      "The uploaded image does not appear to be one of the recognized date varieties."}
                  </p>
                </div>
                <div className="bg-background-alt/50 border border-border/10 rounded-2xl p-4 max-w-md w-full text-[11px] text-foreground-muted text-left">
                  <p className="font-semibold text-primary mb-1">{tClass("supportedVarieties")}</p>
                  <p className="leading-relaxed">{tClass("supportedList")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-xs font-semibold text-primary hover:text-accent underline underline-offset-4 cursor-pointer transition-colors"
                >
                  Upload a different date image
                </button>
              </div>
            )}

            {/* Error State */}
            {!scanning && error && (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20">
                  <AlertCircle className="h-7 w-7 text-destructive" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-base text-primary">
                    Classification Failed
                  </h3>
                  <p className="font-body text-xs text-foreground-muted mt-1 max-w-[300px] leading-relaxed">
                    {error}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClassify}
                  className="text-xs font-semibold text-primary hover:text-accent underline underline-offset-4 cursor-pointer transition-colors"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Scanning State */}
            {scanning && (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-6">
                <div className="relative w-32 h-32 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center overflow-hidden border border-border/10">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-accent animate-scan-laser shadow-glow-accent" />
                  {uploadedImage ? (
                    <img
                      src={uploadedImage}
                      alt="Scanning"
                      className="w-full h-full object-cover opacity-60"
                    />
                  ) : (
                    <Sparkles className="h-10 w-10 text-primary animate-pulse" />
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-center gap-2 font-display text-primary font-bold text-lg">
                    <Cpu className="h-5 w-5 text-accent animate-spin" />
                    <span>{tClass("analyzing")}</span>
                  </div>
                  <p className="font-body text-xs text-foreground-muted mt-2 max-w-[280px]">
                    {scanStep}
                  </p>
                </div>
              </div>
            )}

            {/* ── Live Demo: stable result full display ──────────────── */}
            {isLiveDemo && liveResult && (() => {
              const liveVariety = VARIETY_MAP.get(liveResult.variety) ?? null;
              const liveRec = liveVariety
                ? getRecommendations(liveResult.variety, userProfile)
                : null;
              return liveVariety ? (
                <div className="flex flex-col gap-5 animate-in fade-in duration-300">
                  {/* Header */}
                  <div className="flex items-center gap-3 border-b border-border/10 pb-4">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                    <div>
                      <h3 className="font-display font-bold text-lg text-primary">{tClass("liveResult")}</h3>
                      <p className="font-body text-[11px] text-foreground-muted mt-0.5">
                        {tClass("liveModelDescription")}
                      </p>
                    </div>
                  </div>

                  {/* Variety + confidence */}
                  <div className="bg-gradient-to-r from-primary/8 to-accent/5 border border-primary/15 rounded-2xl p-5">
                    <p className="font-body text-[10px] text-accent font-bold uppercase tracking-wider">{tClass("identified")}</p>
                    <h4 className="font-display font-bold text-2xl text-primary mt-1">{liveVariety.name}</h4>
                    <p className="font-body text-xs text-foreground-muted mt-1">
                      {tClass("origin")}: {tVar(`${liveVariety.name}.origin`)}
                    </p>
                    {typeof liveResult.detection_confidence === "number" && (
                      <p className="font-body text-xs text-foreground-muted mt-1">
                        {tClass("detectionConfidence")}: {tClass("detectedDate")} · {Math.round(liveResult.detection_confidence)}%
                      </p>
                    )}
                    <p className="font-body text-xs text-foreground-muted mt-1">
                      {tClass("classificationConfidence")}: {Math.round(liveResult.confidence)}%
                    </p>
                  </div>

                  {/* Nutrition table */}
                  <NutritionTable variety={liveVariety.name} />

                  {/* Specs grid */}
                  <div className="grid grid-cols-2 gap-3 font-body text-xs">
                    <div className="bg-background-alt/50 p-4 rounded-xl border border-border/6">
                      <p className="text-foreground-muted">{tClass("priceRange")}</p>
                      <p className="text-sm font-bold text-accent mt-1">{liveVariety.priceRange}</p>
                      <p className="text-[10px] text-foreground-muted mt-0.5">{tClass("avg")}: {liveVariety.avgPrice}</p>
                    </div>
                    <div className="bg-background-alt/50 p-4 rounded-xl border border-border/6">
                      <p className="text-foreground-muted">{tClass("textureProfile")}</p>
                      <p className="text-sm font-bold text-primary mt-1">{tVar(`${liveVariety.name}.texture`)}</p>
                      <p className="text-[10px] text-foreground-muted mt-0.5">{tClass("physicalClass")}</p>
                    </div>
                    <div className="col-span-2 bg-background-alt/50 p-4 rounded-xl border border-border/6">
                      <p className="text-foreground-muted">{tClass("descLabel")}</p>
                      <p className="text-sm font-medium text-primary mt-1 leading-relaxed">{tVar(`${liveVariety.name}.description`)}</p>
                    </div>
                  </div>

                  {/* Health rec */}
                  {liveRec && <RecommendationBanner result={liveRec} />}

                  {/* Market source */}
                  <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 text-[11px] font-body text-primary leading-relaxed">
                    <span className="font-bold">{tClass("marketSourceLabel")}</span>{" "}
                    {tVar(`${liveVariety.name}.marketSource`)}. Pricing data from Karachi Dates Market Survey.
                  </div>
                </div>
              ) : null;
            })()}

            {/* Scan Completed State */}
            {!isLiveDemo && !scanning && scanCompleted && classifiedResult && (
              <div className="flex flex-col gap-5">
                {/* Result Header */}
                <div className="flex items-center gap-3 border-b border-border/10 pb-4">
                  <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
                  <div>
                    <h3 className="font-display font-bold text-lg text-primary">
                      Classification Report
                    </h3>
                    <p className="font-body text-[11px] text-foreground-muted mt-0.5">
                      {tClass("modelSpecs")}
                    </p>
                  </div>
                </div>

                {/* Identified Variety + Confidence */}
                <div className="bg-gradient-to-r from-primary/8 to-accent/5 border border-primary/15 rounded-2xl p-5">
                  <p className="font-body text-[10px] text-accent font-bold uppercase tracking-wider">
                    Identified Variety
                  </p>
                  <div className="mt-1">
                    <h4 className="font-display font-bold text-2xl text-primary">
                      {tVar(`${classifiedResult.name}.name`)}
                    </h4>
                  </div>
                  <p className="font-body text-xs text-foreground-muted mt-1">
                    {tClass("origin")}: {tVar(`${classifiedResult.name}.origin`)}
                  </p>
                  {typeof confidence === "number" && (
                    <p className="font-body text-xs text-foreground-muted mt-1">
                      {tClass("classificationConfidence")}: {Math.round(confidence)}%
                    </p>
                  )}
                </div>

                {/* Nutritional Table */}
                <NutritionTable variety={classifiedResult.name} />

                {/* Specs Grid */}
                <div className="grid grid-cols-2 gap-3 font-body text-xs">
                  <div className="bg-background-alt/50 p-4 rounded-xl border border-border/6">
                    <p className="text-foreground-muted">{tClass("priceRange")}</p>
                    <p className="text-sm font-bold text-accent mt-1">
                      {classifiedResult.priceRange}
                    </p>
                    <p className="text-[10px] text-foreground-muted mt-0.5">
                      {tClass("avg")}: {classifiedResult.avgPrice}
                    </p>
                  </div>

                  <div className="bg-background-alt/50 p-4 rounded-xl border border-border/6">
                    <p className="text-foreground-muted">{tClass("textureProfile")}</p>
                    <p className="text-sm font-bold text-primary mt-1">
                      {tVar(`${classifiedResult.name}.texture`)}
                    </p>
                    <p className="text-[10px] text-foreground-muted mt-0.5">
                      Physical classification
                    </p>
                  </div>

                  <div className="col-span-2 bg-background-alt/50 p-4 rounded-xl border border-border/6">
                    <p className="text-foreground-muted">{tClass("descLabel")}</p>
                    <p className="text-sm font-medium text-primary mt-1 leading-relaxed">
                      {tVar(`${classifiedResult.name}.description`)}
                    </p>
                  </div>
                </div>

                {/* Health Recommendation Banner */}
                {recommendation && <RecommendationBanner result={recommendation} />}

                {/* Market Source */}
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 text-[11px] font-body text-primary leading-relaxed">
                  <span className="font-bold">{tClass("marketSourceLabel")}</span>{" "}
                  {tVar(`${classifiedResult.name}.marketSource`)}. Pricing data from Karachi
                  Dates Market Survey (Water Pump Dry Fruit Market & Empress
                  Market).
                </div>
              </div>
            )}

            {/* Completed but unknown variety */}
            {!scanning && scanCompleted && !classifiedResult && !error && (
              <div className="text-center py-10 flex flex-col items-center gap-3">
                <AlertCircle className="h-8 w-8 text-accent" />
                <p className="font-body text-sm text-foreground-muted">
                  {tClass("varietyNotFound")}
                </p>
              </div>
            )}
          </div>
        </div>
      </Container>
    </SectionWrapper>
  );
}
