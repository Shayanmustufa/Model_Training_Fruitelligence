import React from "react";

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export function BentoGrid({ children, className = "" }: BentoGridProps) {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 auto-rows-[240px] md:auto-rows-[200px] lg:auto-rows-[180px] ${className}`}
    >
      {children}
    </div>
  );
}

interface BentoGridItemProps {
  children: React.ReactNode;
  className?: string;
  colSpan?: "col-span-1" | "col-span-2" | "col-span-3" | "md:col-span-2" | "lg:col-span-2" | "lg:col-span-3";
  rowSpan?: "row-span-1" | "row-span-2" | "row-span-3";
}

export function BentoGridItem({
  children,
  className = "",
  colSpan = "col-span-1",
  rowSpan = "row-span-1",
}: BentoGridItemProps) {
  // Translate spans into grid classes dynamically
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/10 bg-white/70 backdrop-blur-md p-6 lg:p-8 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ${colSpan} ${rowSpan} ${className}`}
    >
      {children}
    </div>
  );
}
