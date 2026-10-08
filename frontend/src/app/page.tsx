import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/sections/Hero";
import BentoFeatures from "@/components/sections/BentoFeatures";
import VarietiesGallery from "@/components/sections/VarietiesGallery";
import EconomicImpact from "@/components/sections/EconomicImpact";
import HealthUses from "@/components/sections/HealthUses";
import AboutUs from "@/components/sections/AboutUs";
import AIClassifierDemo from "@/components/sections/AIClassifierDemo";
import DatasetVideo from "@/components/sections/DatasetVideo";
import MarketplaceDemoGate from "@/components/sections/MarketplaceDemoGate";
import TreeDigitization from "@/components/sections/TreeDigitization";
import Roadmap from "@/components/sections/Roadmap";
import Footer from "@/components/layout/Footer";
import LiveDemoLayout from "@/components/layout/LiveDemoLayout";
import LiveDemoPanel from "@/components/sections/LiveDemoPanel";
import RoboflowLiveDemo from "@/components/sections/RoboflowLiveDemo";

export default function Home() {
  return (
    <LiveDemoLayout rightPanel={<LiveDemoPanel />}>
      {/* Navigation Header */}
      <Navbar />

      {/* Main Page Layout */}
      <main className="flex-grow">
        {/* Hero Banner Area */}
        <Hero />

        {/* AI Classifier Scanner Demo */}
        <AIClassifierDemo />

        {/* Hosted Roboflow date detection demo */}
        <RoboflowLiveDemo />

        {/* Dataset Collection Video */}
        <DatasetVideo />

        {/* Core Pillars Bento Grid */}
        <BentoFeatures />

        {/* Global/Local Variety Database */}
        <VarietiesGallery />

        {/* Regional GDP Statistics (Dark section) */}
        <EconomicImpact />

        {/* Health, Nutritional & Industrial Benefits */}
        <HealthUses />

        {/* Orchard GIS Traceability Demonstration */}
        <TreeDigitization />

        {/* Farm-to-Buyer Marketplace Comparison Demo */}
        <MarketplaceDemoGate />

        {/* Project Creators & Team Bios */}
        <AboutUs />

        {/* Project Timeline Milestones */}
        <Roadmap />
      </main>

      {/* Footer Branding Area */}
      <Footer />
    </LiveDemoLayout>
  );
}
