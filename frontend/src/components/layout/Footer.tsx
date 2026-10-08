"use client";

import React, { useState } from "react";
import { Leaf, ArrowRight, Github } from "lucide-react";
import { useTranslations } from "next-intl";
import Container from "./Container";
import { useLiveDemo } from "./LiveDemoLayout";

export default function Footer() {
  const { isLiveDemo } = useLiveDemo();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const t = useTranslations("footer");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSubscribed(true);
        setEmail("");
      } else {
        setErrorMessage(data.error || t("errorFailed"));
      }
    } catch {
      setErrorMessage(t("errorNetwork"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const targetId = href.substring(1);
    const element = document.getElementById(targetId);
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
    <footer className="bg-background-dark text-foreground-dark border-t border-border-dark py-16">
      <Container>
        <div className={isLiveDemo
          ? "flex flex-row flex-wrap gap-8"
          : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12"
        }>
          {/* Brand Info — hidden in Live Demo */}
          {!isLiveDemo && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-foreground-dark font-display font-bold text-2xl">
                <div className="bg-primary-dark/20 p-1.5 rounded-lg border border-primary-dark/30">
                  <Leaf className="h-6 w-6 text-secondary-dark" />
                </div>
                <span>Fruitelligence</span>
              </div>
              <p className="font-body text-[15px] text-foreground-dark-muted leading-relaxed">
                {t("brandDescription")}
              </p>
            </div>
          )}

          {/* Quick Links */}
          <div className="flex flex-col gap-4">
            <h4 className="font-display font-semibold text-lg text-secondary-dark">{t("navigationHeading")}</h4>
            <div className="flex flex-col gap-2.5">
              {[
                { name: t("orchardVarieties"), href: "#varieties" },
                { name: t("economicFootprint"), href: "#economic-footprint" },
                { name: t("healthBenefits"), href: "#health-uses" },
                { name: t("aiClassifier"), href: "#demos" },
                { name: t("aboutTeam"), href: "#about-us" },
              ].map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => handleLinkClick(e, link.href)}
                  className="font-body text-sm text-foreground-dark-muted hover:text-secondary-dark transition-colors cursor-pointer"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>

          {/* Contact / Info */}
          <div className="flex flex-col gap-4">
            <h4 className="font-display font-semibold text-lg text-secondary-dark">{t("visionHeading")}</h4>
            <div className="flex flex-col gap-2.5 font-body text-sm text-foreground-dark-muted leading-relaxed">
              <p>
                {t("visionText")}
              </p>
              <p className="mt-2 text-xs italic text-secondary-dark/80">
                {t("universityNote")}
              </p>
            </div>
          </div>

          {/* Newsletter Signup */}
          <div className="flex flex-col gap-4">
            <h4 className="font-display font-semibold text-lg text-secondary-dark">{t("stayConnectedHeading")}</h4>
            <p className="font-body text-sm text-foreground-dark-muted leading-relaxed">
              {t("subscribeText")}
            </p>
            
            {subscribed ? (
              <div className="bg-primary-dark/20 border border-primary-dark/40 rounded-xl p-3.5 text-center text-sm text-secondary-dark">
                {t("subscribedMessage")}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <form onSubmit={handleSubscribe} className="relative flex items-center">
                  <input
                    type="email"
                    required
                    disabled={isLoading}
                    placeholder={t("emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background-dark-alt border border-border-dark rounded-xl py-3 ps-4 pe-12 text-sm text-foreground-dark placeholder-foreground-dark-muted/50 focus:border-secondary-dark focus:outline-none focus:ring-1 focus:ring-secondary-dark disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="absolute end-2 p-2 bg-secondary-dark hover:bg-secondary-dark/95 text-background-dark rounded-lg cursor-pointer transition-colors disabled:opacity-60"
                    aria-label={t("subscribeAriaLabel")}
                  >
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </button>
                </form>
                {errorMessage && (
                  <p className="text-xs text-red-400 font-body">{errorMessage}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <hr className="border-border-dark my-10" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-body text-xs text-foreground-dark-muted">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-secondary-dark transition-colors">{t("privacyPolicy")}</a>
            <a href="#" className="hover:text-secondary-dark transition-colors">{t("termsOfService")}</a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-secondary-dark transition-colors"
            >
              <Github className="h-4 w-4" />
              <span>{t("githubLabel")}</span>
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
