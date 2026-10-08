"use client";

import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useRef, useEffect } from "react";

export default function LanguageSwitcher() {
  const router = useRouter();
  const t = useTranslations("navbar");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const switchLanguage = (locale: string) => {
    document.cookie = `locale=${locale}; path=/; max-age=31536000`;
    router.refresh();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 font-body font-medium text-sm md:text-[15px] px-3.5 py-2 rounded-lg text-primary hover:bg-primary/6 hover:text-primary-hover transition-all duration-200 cursor-pointer focus-ring-custom"
        aria-label={t("langSwitcherLabel")}
      >
        <Globe className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute end-0 mt-2 w-36 bg-surface border border-border/10 rounded-xl shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={() => switchLanguage("en")}
            className="w-full text-start px-4 py-2 text-sm text-foreground hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer"
          >
            {t("langEnglish")}
          </button>
          <button
            onClick={() => switchLanguage("ur")}
            className="w-full text-start px-4 py-2 text-sm text-foreground hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer font-urdu"
          >
            {t("langUrdu")}
          </button>
          <button
            onClick={() => switchLanguage("ar")}
            className="w-full text-start px-4 py-2 text-sm text-foreground hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer font-arabic"
          >
            {t("langArabic")}
          </button>
        </div>
      )}
    </div>
  );
}
