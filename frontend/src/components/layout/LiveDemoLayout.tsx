"use client";

import React, { useState, createContext, useContext, useEffect } from "react";

/** Classifier response plus the detector confidence for the captured crop. */
export interface LiveClassifyResult {
  variety: string;
  confidence: number;
  detection_confidence?: number;
  all_probabilities: Record<string, number>;
  is_date?: boolean;
  non_date_reason?: string | null;
  message?: string | null;
}

interface LiveDemoContextType {
  isLiveDemo: boolean;
  setIsLiveDemo: (val: boolean) => void;
  capturedImage: { blob: Blob; url: string } | null;
  setCapturedImage: (data: { blob: Blob; url: string } | null) => void;
  liveResult: LiveClassifyResult | null;
  setLiveResult: (r: LiveClassifyResult | null) => void;
}

export const LiveDemoContext = createContext<LiveDemoContextType>({
  isLiveDemo: false,
  setIsLiveDemo: () => {},
  capturedImage: null,
  setCapturedImage: () => {},
  liveResult: null,
  setLiveResult: () => {},
});

export function useLiveDemo() {
  return useContext(LiveDemoContext);
}

interface LiveDemoLayoutProps {
  children: React.ReactNode;
  rightPanel: React.ReactNode;
}

export default function LiveDemoLayout({ children, rightPanel }: LiveDemoLayoutProps) {
  const [isLiveDemo, setIsLiveDemo] = useState(false);
  const [capturedImage, setCapturedImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [liveResult, setLiveResult] = useState<LiveClassifyResult | null>(null);

  // Auto-exit if viewport drops below lg
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && isLiveDemo) {
        setIsLiveDemo(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isLiveDemo]);

  // Clean up captured image and live result when exiting live demo
  useEffect(() => {
    if (isLiveDemo) {
      return () => {
        setCapturedImage(null);
        setLiveResult(null);
      };
    }
  }, [isLiveDemo]);

  return (
    <LiveDemoContext.Provider value={{ isLiveDemo, setIsLiveDemo, capturedImage, setCapturedImage, liveResult, setLiveResult }}>
      <div className={isLiveDemo ? "lg:mr-[480px] xl:mr-[540px] lg:ml-20" : ""}>
        {children}
      </div>
      
      {isLiveDemo && (
        <div className="hidden lg:flex fixed top-0 right-0 h-screen w-[480px] xl:w-[540px] border-l border-border/10 bg-white shadow-2xl flex-col z-[60]">
          {rightPanel}
        </div>
      )}
    </LiveDemoContext.Provider>
  );
}
