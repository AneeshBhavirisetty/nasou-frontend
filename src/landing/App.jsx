import { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import Features from "./components/Features";
import ChatbotWidget from "./components/ChatbotWidget";

const Hero3DScene = lazy(() => import("./components/Hero3DScene"));
const SupplyChainAnimation = lazy(() => import("./components/SupplyChainAnimation"));
const Dashboard = lazy(() => import("./components/Dashboard"));
const CTA = lazy(() => import("./components/CTA"));

function SceneFallback({ compact = false }) {
  return (
    <div
      className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${
        compact ? "py-14" : "py-10"
      }`}
    >
      <div
        className={`section-shell overflow-hidden rounded-[32px] border border-[#E5D8C7]/80 bg-[#EFEAE1] ${
          compact ? "h-[380px]" : "h-[620px]"
        }`}
      >
        <div className="h-full w-full animate-pulse bg-[linear-gradient(180deg,#EFEAE1_0%,#E6ECEA_52%,#EFE7DA_100%)]" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[linear-gradient(180deg,#EFEAE1_0%,#EFE7DA_58%,#E6ECEA_100%)]" />

      <header className="relative z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="glass-panel flex items-center gap-3 rounded-full px-4 py-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#1F5C4A] shadow-[0_0_20px_rgba(31,92,74,0.32)]" />
            <span className="font-display text-sm uppercase tracking-[0.38em] text-[#1F5C4A]">
              Nasou Hive
            </span>
          </div>
          <nav className="glass-panel hidden items-center gap-6 rounded-full px-5 py-2.5 text-sm text-[#255849] md:flex">
            <a href="#story" className="transition hover:text-[#1F5C4A]">
              Workflow
            </a>
            <a href="#features" className="transition hover:text-[#1F5C4A]">
              Platform
            </a>
            <a href="#dashboard" className="transition hover:text-[#1F5C4A]">
              Visibility
            </a>
            <Link
              to="/app/auth"
              className="rounded-full border border-[#FFFFFF] bg-[#E5D8C7] px-4 py-1.5 font-semibold !text-[#1F5C4A] transition hover:bg-[#FFFFFF]"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative pb-12">
        <Suspense fallback={<SceneFallback />}>
          <Hero3DScene />
        </Suspense>

        <Suspense fallback={<SceneFallback />}>
          <SupplyChainAnimation />
        </Suspense>

        <Features />

        <Suspense fallback={<SceneFallback compact />}>
          <Dashboard />
        </Suspense>

        <Suspense fallback={<SceneFallback compact />}>
          <CTA />
        </Suspense>
      </main>
      <ChatbotWidget />
    </div>
  );
}

