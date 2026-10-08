/**
 * healthRecommendations.ts
 *
 * Lookup table and utility functions for generating personalized health
 * recommendations after a date variety is classified.
 *
 * Mappings and nutritional justifications are derived directly from:
 *   Dates info/FYP-Work.docx (Final Health Problem → Date Mapping & Master Mapping)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UserProfile {
  exists: boolean;
  country?: string;
  diabetes?: boolean;
  hypertension?: boolean;
  anemia?: boolean;
  constipation?: boolean;
  weight_management?: boolean;
}

export type RecommendationStatus = "beneficial" | "not_recommended" | "neutral";

export interface SingleConditionRecommendation {
  key: keyof Omit<UserProfile, "exists" | "country">;
  label: string;
  status: RecommendationStatus;
  reason: string;
}

export interface MultiRecommendationResult {
  hasProfile: boolean;
  activeCount: number;
  overallStatus: RecommendationStatus | "mixed";
  items: SingleConditionRecommendation[];
  fallbackMessage?: string;
}

export interface RecommendationResult {
  status: RecommendationStatus;
  reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Condition Rules (FYP-Work.docx Master Mapping)
// ─────────────────────────────────────────────────────────────────────────────

interface ConditionRule {
  label: string;              // Human-readable condition name
  beneficial: string[];       // Varieties classified as Favorable (🟢)
  not_recommended: string[];  // Varieties classified as Less Favorable (🔴)
  neutral: string[];          // Varieties classified as Neutral (⚪)
  beneficial_reason: string;  // Nutritional justification for favorable
  avoid_reason: string;       // Nutritional justification for less favorable
  neutral_reason?: string;    // Nutritional justification for neutral
}

export const HEALTH_RULES: Record<
  keyof Omit<UserProfile, "exists" | "country">,
  ConditionRule
> = {
  diabetes: {
    label: "Diabetes / Blood-Glucose Management",
    beneficial: ["Zahedi"],
    not_recommended: ["Ajwa", "Amber", "Kalmi", "Mabroom", "Mazafati", "Rabbi", "Sagai"],
    neutral: [],
    beneficial_reason:
      "lower total sugar and carbohydrate profile, making it the most suitable choice for blood-glucose regulation",
    avoid_reason:
      "high in total sugars and carbohydrates — consume with portion control to prevent glucose spikes",
  },
  hypertension: {
    label: "High Blood Pressure (Hypertension)",
    beneficial: ["Sagai", "Amber"],
    not_recommended: ["Ajwa", "Kalmi"],
    neutral: ["Mabroom", "Mazafati", "Zahedi", "Rabbi"],
    beneficial_reason:
      "rich in potassium and low in sodium, supporting healthy blood pressure regulation",
    avoid_reason:
      "higher sodium concentration or less optimal potassium-to-sodium ratio for blood pressure",
    neutral_reason:
      "moderate electrolyte balance with no specific blood pressure concern",
  },
  anemia: {
    label: "Iron-Deficiency Anemia",
    beneficial: ["Sagai", "Zahedi", "Amber", "Kalmi", "Mabroom", "Mazafati"],
    not_recommended: ["Ajwa", "Rabbi"],
    neutral: [],
    beneficial_reason:
      "good dietary iron content to support hemoglobin and red blood cell production",
    avoid_reason:
      "lower iron content relative to other date varieties",
  },
  constipation: {
    label: "Digestive Issues / Inadequate Fiber",
    beneficial: ["Sagai", "Zahedi", "Ajwa", "Amber", "Mabroom", "Mazafati"],
    not_recommended: ["Kalmi", "Rabbi"],
    neutral: [],
    beneficial_reason:
      "high dietary fiber content promotes healthy digestion and regular bowel movements",
    avoid_reason:
      "lower dietary fiber content compared to other varieties",
  },
  weight_management: {
    label: "Weight Management",
    beneficial: ["Mazafati"],
    not_recommended: ["Ajwa", "Amber", "Kalmi", "Sagai", "Zahedi", "Rabbi"],
    neutral: ["Mabroom"],
    beneficial_reason:
      "lowest caloric and carbohydrate density on a fresh-weight basis, optimal for calorie control",
    avoid_reason:
      "higher calorie and carbohydrate density — consume in smaller portions when managing weight",
    neutral_reason:
      "moderate calorie and sugar profile for weight management",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Condition Recommendation Engine
// ─────────────────────────────────────────────────────────────────────────────

export const CONDITION_KEYS: Array<keyof typeof HEALTH_RULES> = [
  "diabetes",
  "hypertension",
  "anemia",
  "constipation",
  "weight_management",
];

/**
 * Evaluates all active health conditions in the user profile against the classified variety,
 * returning comprehensive recommendations for each selected disease/condition.
 */
export function getRecommendations(
  variety: string,
  profile: UserProfile | null
): MultiRecommendationResult {
  if (!profile || !profile.exists) {
    return {
      hasProfile: false,
      activeCount: 0,
      overallStatus: "neutral",
      items: [],
      fallbackMessage: "Add your health profile for personalized feedback on this date variety.",
    };
  }

  const activeKeys = CONDITION_KEYS.filter((k) => Boolean(profile[k]));

  if (activeKeys.length === 0) {
    return {
      hasProfile: true,
      activeCount: 0,
      overallStatus: "neutral",
      items: [],
      fallbackMessage: "No specific health concerns selected in your profile. This variety is suitable for general consumption.",
    };
  }

  const items: SingleConditionRecommendation[] = activeKeys.map((key) => {
    const rule = HEALTH_RULES[key];

    if (rule.not_recommended.includes(variety)) {
      return {
        key,
        label: rule.label,
        status: "not_recommended",
        reason: `Less favorable for ${rule.label.toLowerCase()} — ${rule.avoid_reason}.`,
      };
    }

    if (rule.beneficial.includes(variety)) {
      return {
        key,
        label: rule.label,
        status: "beneficial",
        reason: `Recommended for ${rule.label.toLowerCase()} — ${rule.beneficial_reason}.`,
      };
    }

    if (rule.neutral.includes(variety) && rule.neutral_reason) {
      return {
        key,
        label: rule.label,
        status: "neutral",
        reason: `Neutral for ${rule.label.toLowerCase()} — ${rule.neutral_reason}.`,
      };
    }

    return {
      key,
      label: rule.label,
      status: "neutral",
      reason: `Neutral impact for ${rule.label.toLowerCase()}.`,
    };
  });

  // Calculate overall summary status
  const statuses = items.map((item) => item.status);
  const allBeneficial = statuses.every((s) => s === "beneficial");
  const allAvoid = statuses.every((s) => s === "not_recommended");
  const allNeutral = statuses.every((s) => s === "neutral");

  let overallStatus: RecommendationStatus | "mixed" = "mixed";
  if (allBeneficial) overallStatus = "beneficial";
  else if (allAvoid) overallStatus = "not_recommended";
  else if (allNeutral) overallStatus = "neutral";

  return {
    hasProfile: true,
    activeCount: items.length,
    overallStatus,
    items,
  };
}

/**
 * Backwards compatibility wrapper that returns a single RecommendationResult.
 */
export function getRecommendation(
  variety: string,
  profile: UserProfile | null
): RecommendationResult {
  const multi = getRecommendations(variety, profile);
  if (!multi.hasProfile || multi.items.length === 0) {
    return {
      status: "neutral",
      reason: multi.fallbackMessage ?? "Add your health profile for personalized feedback on this date variety.",
    };
  }

  // Prioritize avoid, then beneficial, then neutral
  const avoid = multi.items.find((i) => i.status === "not_recommended");
  if (avoid) return { status: avoid.status, reason: avoid.reason };

  const beneficial = multi.items.find((i) => i.status === "beneficial");
  if (beneficial) return { status: beneficial.status, reason: beneficial.reason };

  return { status: multi.items[0].status, reason: multi.items[0].reason };
}
