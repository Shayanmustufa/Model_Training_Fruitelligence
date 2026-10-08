"use client";

import React, { useState, useEffect } from "react";
import { Menu, X, Leaf, Home, LayoutGrid, TrendingUp, HeartPulse, MonitorPlay, Trees, Info, ScanSearch } from "lucide-react";
import { useTranslations } from "next-intl";
import Container from "./Container";
import { useLiveDemo } from "./LiveDemoLayout";
import LanguageSwitcher from "./LanguageSwitcher";

interface NavbarProps {
  navLinks?: { name: string; href: string; icon?: React.ElementType }[];
}

export default function Navbar({ navLinks }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const { isLiveDemo } = useLiveDemo();

  const t = useTranslations("navbar");

  const defaultLinks = [
    { name: t("home"), href: "#hero", icon: Home },
    { name: t("varieties"), href: "#varieties", icon: LayoutGrid },
    { name: t("economicFootprint"), href: "#economic-footprint", icon: TrendingUp },
    { name: t("healthUses"), href: "#health-uses", icon: HeartPulse },
    { name: t("demos"), href: "#demos", icon: MonitorPlay },
    { name: t("liveDemo"), href: "#live-demo", icon: ScanSearch },
    { name: t("treeTracking"), href: "#tree-digitization", icon: Trees },
    { name: t("aboutUs"), href: "#about-us", icon: Info },
  ];

  const links = navLinks || defaultLinks;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      // Track active section on scroll
      const scrollPosition = window.scrollY + 100;
      for (const link of links) {
        const targetId = link.href.substring(1);
        const element = document.getElementById(targetId);
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(link.href);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Call immediately on mount

    return () => window.removeEventListener("scroll", handleScroll);
  }, [links]);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsOpen(false);
    const targetId = href.substring(1);
    const element = document.getElementById(targetId);
    if (element) {
      const offset = 80; // height of sticky header
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      setActiveSection(href);
    }
  };

  if (isLiveDemo) {
    return (
      <nav className="hidden lg:flex fixed top-0 start-0 h-screen w-20 bg-white border-e border-border/10 shadow-sm z-50 flex-col items-center py-6 gap-8">
        {/* Logo */}
        <a
          href="#hero"
          onClick={(e) => handleLinkClick(e, "#hero")}
          className="bg-primary/10 p-2.5 rounded-xl text-primary hover:bg-primary/20 transition-colors cursor-pointer"
          title="Fruitelligence"
        >
          <Leaf className="h-6 w-6" />
        </a>
        
        {/* Links */}
        <div className="flex flex-col gap-4 w-full px-3">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = activeSection === link.href;
            return (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href)}
                title={link.name}
                className={`flex justify-center p-3 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? "bg-accent/15 text-accent"
                    : "text-foreground-muted hover:bg-primary/5 hover:text-primary"
                }`}
              >
                {Icon ? <Icon className="w-5 h-5" /> : <span className="text-xs">{link.name.substring(0,2)}</span>}
              </a>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav
      className={`fixed top-0 start-0 z-50 transition-all duration-300 ${
        isLiveDemo ? "w-full lg:w-[calc(100%-480px)] xl:w-[calc(100%-540px)]" : "w-full"
      } ${
        scrolled
          ? "bg-background-light/85 backdrop-blur-md border-b border-border/12 shadow-sm py-4"
          : "bg-transparent py-6"
      }`}
    >
      <Container>
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a
            href="#hero"
            onClick={(e) => handleLinkClick(e, "#hero")}
            className="flex items-center gap-2 text-primary font-display font-bold text-xl md:text-2xl cursor-pointer group"
          >
            <div className="bg-primary/10 p-1.5 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Leaf className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <span>Fruitelligence</span>
          </a>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1">
            {links.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href)}
                className={`font-body font-medium text-sm md:text-[15px] px-3.5 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
                  activeSection === link.href
                    ? "text-accent font-semibold"
                    : "text-primary hover:bg-primary/6 hover:text-primary-hover"
                }`}
              >
                {link.name}
              </a>
            ))}
            <LanguageSwitcher />
          </div>

          {/* Hamburger Menu Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-primary focus:outline-none cursor-pointer focus-ring-custom rounded-lg p-1.5 hover:bg-primary/6"
            aria-label={isOpen ? t("closeMenu") : t("openMenu")}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {isOpen && (
          <div className="lg:hidden absolute top-full start-0 w-full bg-background-light/95 backdrop-blur-lg border-b border-border/12 shadow-md py-6 px-4 flex flex-col gap-3">
            <div className="flex justify-end mb-2">
              <LanguageSwitcher />
            </div>
            {links.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href)}
                className={`font-body font-medium text-base py-2.5 px-4 rounded-xl transition-all duration-200 cursor-pointer ${
                  activeSection === link.href
                    ? "bg-accent/10 text-accent font-semibold"
                    : "text-primary hover:bg-primary/6"
                }`}
              >
                {link.name}
              </a>
            ))}
          </div>
        )}
      </Container>
    </nav>
  );
}
