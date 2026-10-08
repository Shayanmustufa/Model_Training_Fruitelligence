"use client";

import React, { useState, useEffect } from "react";
import { X, Globe, CheckCircle2, HeartPulse } from "lucide-react";
import { useTranslations } from "next-intl";
import type { UserProfile } from "@/lib/healthRecommendations";

// ─────────────────────────────────────────────────────────────────────────────
// Country list (common countries)
// ─────────────────────────────────────────────────────────────────────────────
const COUNTRIES = [
  "Afghanistan", "Australia", "Bahrain", "Bangladesh", "Canada",
  "China", "Egypt", "France", "Germany", "India",
  "Indonesia", "Iran", "Iraq", "Jordan", "Kuwait",
  "Malaysia", "Morocco", "Netherlands", "Nigeria", "Oman",
  "Pakistan", "Philippines", "Qatar", "Saudi Arabia", "Singapore",
  "South Africa", "Turkey", "United Arab Emirates", "United Kingdom",
  "United States of America", "Yemen", "Other",
];

// ─────────────────────────────────────────────────────────────────────────────
// Health Questions (Derived directly from FYP-Work.docx)
// ─────────────────────────────────────────────────────────────────────────────
interface HealthQuestion {
  key: keyof Omit<UserProfile, "exists" | "country">;
  titleKey: string;
  textKey: string;
  hintKey: string;
}

const QUESTIONS: HealthQuestion[] = [
  {
    key: "diabetes",
    titleKey: "q1Title",
    textKey: "q1Text",
    hintKey: "q1Hint",
  },
  {
    key: "hypertension",
    titleKey: "q2Title",
    textKey: "q2Text",
    hintKey: "q2Hint",
  },
  {
    key: "anemia",
    titleKey: "q3Title",
    textKey: "q3Text",
    hintKey: "q3Hint",
  },
  {
    key: "constipation",
    titleKey: "q4Title",
    textKey: "q4Text",
    hintKey: "q4Hint",
  },
  {
    key: "weight_management",
    titleKey: "q5Title",
    textKey: "q5Text",
    hintKey: "q5Hint",
  },
];

type AnswerChoice = "yes" | "no" | "not_sure";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface HealthProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (profile: UserProfile) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function HealthProfileModal({
  isOpen,
  onClose,
  onSaved,
}: HealthProfileModalProps) {
  const t = useTranslations("healthProfile");
  const [country, setCountry] = useState("");
  const [answers, setAnswers] = useState<Record<string, AnswerChoice>>({
    diabetes: "no",
    hypertension: "no",
    anemia: "no",
    constipation: "no",
    weight_management: "no",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Load existing profile on open ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const loadProfile = async () => {
      setSaved(false);
      setLoading(true);
      try {
        // Form starts blank by default
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isOpen]);

  // ── Set specific answer choice ────────────────────────────────────────────
  const setAnswer = (key: string, choice: AnswerChoice) => {
    setAnswers((prev) => ({ ...prev, [key]: choice }));
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Both "no" and "not_sure" resolve to boolean false internally
      const conditions = {
        diabetes:          answers.diabetes === "yes",
        hypertension:      answers.hypertension === "yes",
        anemia:            answers.anemia === "yes",
        constipation:      answers.constipation === "yes",
        weight_management: answers.weight_management === "yes",
      };

      /*
      const payload = {
        country,
        ...conditions,
        raw_answers: answers,
      };

      // 1. Save to localStorage immediately (instant, works offline)
      localStorage.setItem(LS_KEY, JSON.stringify(payload));

      // 2. Sync to backend in background (best-effort, non-blocking)
      fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => { });
      */

      setSaved(true);
      onSaved({ exists: true, country, ...conditions } as UserProfile);
      setTimeout(() => {
        onClose();
        setSaved(false);
      }, 1200);
    } catch {
      // Handle any submission error gracefully
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal panel */}
      <div className="relative w-full max-w-lg bg-surface rounded-3xl shadow-xl border border-border/10 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <HeartPulse className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-primary">{t("title")}</h2>
              <p className="font-body text-xs text-foreground-muted">{t("subtitle")}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-foreground-muted hover:text-foreground hover:bg-background-alt/60 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-foreground-muted font-body text-sm">
            {t("loading")}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-6 overflow-y-auto">

            {/* Health questions (FYP-Work.docx) */}
            <div className="flex flex-col gap-2">
              <p className="font-body text-xs font-bold uppercase tracking-widest text-accent">
                {t("assessment")}
              </p>
              <p className="font-body text-xs text-foreground-muted -mt-1">
                {t("instructions")}
              </p>

              <div className="flex flex-col gap-3 mt-1">
                {QUESTIONS.map(({ key, titleKey, textKey, hintKey }) => {
                  const currentAnswer = answers[key] ?? "no";
                  const isYes = currentAnswer === "yes";

                  return (
                    <div
                      key={key}
                      className={`p-4 rounded-2xl border transition-all duration-150 ${
                        isYes
                          ? "border-primary/30 bg-primary/6"
                          : "border-border/15 bg-background-alt/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <span className="font-body text-[11px] font-bold uppercase tracking-wider text-accent">
                            {t(titleKey)}
                          </span>
                          <p className="font-body text-sm font-semibold text-primary mt-0.5 leading-snug">
                            {t(textKey)}
                          </p>
                          <p className="font-body text-[11px] text-foreground-muted mt-1">
                            {t(hintKey)}
                          </p>
                        </div>
                      </div>

                      {/* 3 Explicit Options: No, Not sure, Yes */}
                      <div className="flex items-center justify-end gap-1.5 mt-3 pt-2.5 border-t border-border/10">
                        <button
                          type="button"
                          onClick={() => setAnswer(key, "no")}
                          className={`px-3 py-1.5 rounded-xl font-body text-xs font-semibold transition-all cursor-pointer ${
                            currentAnswer === "no"
                              ? "bg-foreground-muted/20 text-foreground font-bold border border-border/30 shadow-xs"
                              : "bg-transparent text-foreground-muted hover:bg-background-alt/60 hover:text-foreground"
                          }`}
                        >
                          {t("btnNo")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnswer(key, "not_sure")}
                          className={`px-3 py-1.5 rounded-xl font-body text-xs font-semibold transition-all cursor-pointer ${
                            currentAnswer === "not_sure"
                              ? "bg-foreground-muted/20 text-foreground font-bold border border-border/30 shadow-xs"
                              : "bg-transparent text-foreground-muted hover:bg-background-alt/60 hover:text-foreground"
                          }`}
                        >
                          {t("btnNotSure")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnswer(key, "yes")}
                          className={`px-3.5 py-1.5 rounded-xl font-body text-xs font-semibold transition-all cursor-pointer ${
                            currentAnswer === "yes"
                              ? "bg-primary text-on-primary font-bold shadow-xs"
                              : "bg-transparent text-foreground-muted hover:bg-background-alt/60 hover:text-foreground"
                          }`}
                        >
                          {t("btnYes")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Q6 - Country Dropdown */}
            <div className="flex flex-col gap-2 pt-2 border-t border-border/10">
              <label className="font-body text-xs font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> {t("countryLabel")}
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="font-body text-sm text-foreground bg-background-alt/50 border border-border/20 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                <option value="">{t("countryPlaceholder")}</option>
                {COUNTRIES.map((c) => {
                  const translated = t(`countries.${c}`) || c;
                  return <option key={c} value={c}>{translated}</option>;
                })}
              </select>
            </div>

            {/* Footer actions */}
            <div className="flex gap-3 pt-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn-secondary py-3 rounded-xl font-body text-sm cursor-pointer"
              >
                {t("btnCancel")}
              </button>
              <button
                type="submit"
                disabled={saving || saved}
                className={`flex-1 btn-primary py-3 rounded-xl font-body text-sm flex items-center justify-center gap-2 cursor-pointer ${
                  saved ? "opacity-80" : ""
                }`}
              >
                {saved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {t("btnSaved")}
                  </>
                ) : saving ? (
                  t("btnSaving")
                ) : (
                  t("btnSave")
                )}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}
