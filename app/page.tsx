// Landing page — a SERVER component. Interactive bits are small client islands:
// LandingNavActions (auth buttons + mobile menu), WatchDemoButton, CookieSettingsButton,
// Reveal (IntersectionObserver scroll-reveal) and PricingSection.
import Link from "next/link";
import {
  TrendingDown,
  PackageMinus,
  Clock,
  Activity,
  BrainCircuit,
  RefreshCw,
  ClipboardList,
  Truck,
  Zap,
  ArrowRight,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Boxes,
} from "lucide-react";
import { Button, Badge } from "@/components/landing/client-ui";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { PricingSection } from "@/components/pricing-section";
import { LandingNavActions } from "@/components/landing/nav-actions";
import { WatchDemoButton, CookieSettingsButton } from "@/components/landing/demo-dialog";
import { Reveal } from "@/components/landing/reveal";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden transition-colors duration-300 no-scrollbar relative">
      {/* Dynamic Animated Background Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Animated Radial Dot Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1.2px,transparent_1.2px)] [background-size:36px_36px] opacity-[0.15] dark:opacity-[0.25]" />
        
        {/* Soft glows: static radial gradients (no filter: blur, no infinite animation) */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_35%_at_25%_20%,rgba(79,70,229,0.12),transparent_70%),radial-gradient(ellipse_45%_40%_at_80%_50%,rgba(147,51,234,0.10),transparent_70%),radial-gradient(ellipse_40%_35%_at_30%_85%,rgba(124,58,237,0.10),transparent_70%)] dark:bg-[radial-gradient(ellipse_40%_35%_at_25%_20%,rgba(79,70,229,0.18),transparent_70%),radial-gradient(ellipse_45%_40%_at_80%_50%,rgba(147,51,234,0.15),transparent_70%),radial-gradient(ellipse_40%_35%_at_30%_85%,rgba(124,58,237,0.14),transparent_70%)]" />
        
        {/* Ambient Subtle Grid Line Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* 1. NAVBAR */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 backdrop-blur-md bg-white/85 dark:bg-slate-950/85 border-b border-slate-200/80 dark:border-slate-800/80 transition-all">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 h-20 sm:h-22 flex items-center justify-between relative">
          {/* Logo */}
          <Logo href="/" size="md" layout="horizontal" />

          {/* Desktop Nav Links (Centered) */}
          <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-8 text-sm font-medium text-slate-700 dark:text-slate-300">
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              How it Works
            </a>
            <a href="#pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Pricing
            </a>
            <a href="#about" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              About
            </a>
            {/* <a href="/docs" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Docs
            </a> */}
          </nav>

          <LandingNavActions />
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-28 pb-24 lg:pt-36 lg:pb-32 overflow-hidden">
        {/* Animated Background Gradients & Glows */}
        <div className="absolute inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_50%_40%_at_50%_25%,rgba(79,70,229,0.16),transparent_70%),radial-gradient(ellipse_35%_30%_at_35%_40%,rgba(124,58,237,0.12),transparent_70%)]" />

        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center sm:max-w-3xl w-[95vw] sm:w-full mx-auto space-y-6">
            {/* Top Centered Logo Icon */}
            <div className="flex justify-center pb-2">
              <Logo size="lg" href="/" />
            </div>

            <div>
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 animate-spin-slow" />
                <span>Next-Gen Supermarket AI Platform</span>
              </Badge>
            </div>

            <h1
              className="font-heading text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]"
            >
              Smart Inventory.{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 dark:from-indigo-400 dark:via-purple-300 dark:to-violet-400 bg-clip-text text-transparent">
                AI Driven Decisions.
              </span>
            </h1>

            <p
              className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-normal"
            >
              RetailMind AI helps supermarkets predict demand, automate reorders and optimise pricing using artificial intelligence.
            </p>

            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Button asChild size="lg" className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-lg shadow-indigo-600/30 px-8 h-12 text-base rounded-xl group">
                <Link href="/create-workspace">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>

              <WatchDemoButton />
            </div>
          </div>

          {/* Dashboard mockup: CSS-only entrance (compositor-friendly, does not gate LCP) */}
          <div className="mt-14 relative max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-both motion-reduce:animate-none">
            {/* Glowing Backdrop Border */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600 rounded-xl blur-xl opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

            <div className="relative rounded-lg bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-100">
              {/* Dashboard Header Bar */}
              <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/80 block" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80 block" />
                    <span className="w-3 h-3 rounded-full bg-green-500/80 block" />
                  </div>
                  <span className="text-xs font-medium text-slate-400 ml-2">
                    app.retailmind.ai/dashboard
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs px-2.5 py-0.5 gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    AI Engine Live
                  </Badge>
                  <span className="text-xs text-slate-400 hidden sm:inline">FreshCart Supermarket #04</span>
                </div>
              </div>

              {/* Dashboard Content Mockup */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <p className="text-xs text-slate-400">30-Day Demand Forecast</p>
                    <p className="text-xl sm:text-2xl font-bold text-white mt-1">+24.8%</p>
                    <div className="flex items-center text-xs text-emerald-400 mt-1 gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> High confidence
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <p className="text-xs text-slate-400">Low Stock Alerts</p>
                    <p className="text-xl sm:text-2xl font-bold text-amber-400 mt-1">3 SKUs</p>
                    <p className="text-xs text-slate-400 mt-1">Auto-reorder ready</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <p className="text-xs text-slate-400">Reorder Efficiency</p>
                    <p className="text-xl sm:text-2xl font-bold text-indigo-400 mt-1">99.2%</p>
                    <p className="text-xs text-emerald-400 mt-1">+4.2% vs last mo</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <p className="text-xs text-slate-400">Wastage Reduction</p>
                    <p className="text-xl sm:text-2xl font-bold text-violet-400 mt-1">LKR 420K</p>
                    <p className="text-xs text-slate-400 mt-1">Saved this quarter</p>
                  </div>
                </div>

                {/* Graph & AI Recommendation Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Forecast Graph Preview */}
                  <div className="lg:col-span-2 p-5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-semibold text-white">Demand Prediction Horizon</h4>
                        <p className="text-xs text-slate-400">Actual sales vs AI neural forecast curve</p>
                      </div>
                      <Badge variant="secondary" className="bg-slate-800 text-slate-300 text-xs">
                        Next 14 Days
                      </Badge>
                    </div>

                    {/* SVG Chart Wave */}
                    <div className="h-44 w-full relative flex items-end">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 0,80 Q 50,40 100,65 T 200,30 T 300,55 T 400,20 L 400,120 L 0,120 Z"
                          fill="url(#chartGradient)"
                        />
                        <path
                          d="M 0,80 Q 50,40 100,65 T 200,30 T 300,55 T 400,20"
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="3"
                        />
                        <path
                          d="M 200,30 Q 250,15 300,50 T 400,15"
                          fill="none"
                          stroke="#a855f7"
                          strokeWidth="2.5"
                          strokeDasharray="4 4"
                        />
                      </svg>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/60 mt-2">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Historical Sales</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" /> AI Forecasted Demand</span>
                    </div>
                  </div>

                  {/* AI Reorder Card */}
                  <div className="p-5 rounded-xl bg-gradient-to-b from-slate-900 to-indigo-950/40 border border-indigo-500/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-sm font-semibold text-white">Smart Auto-Reorder</h4>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-950/80 border border-indigo-500/20 mb-3 space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-200">Fresh Milk 1L</span>
                          <span className="text-amber-400 font-bold">14 left</span>
                        </div>
                        <p className="text-[11px] text-slate-400">Predicted depletion: Tomorrow 2 PM</p>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-200">Suggested PO:</span>
                          <span className="text-indigo-400 font-bold">150 Units</span>
                        </div>
                        <p className="text-[11px] text-slate-400">Supplier: Anchor Lanka Dairy</p>
                      </div>
                    </div>

                    <Button size="sm" className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2">
                      Approve & Send Purchase Order
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROBLEM SECTION */}
      <section className="py-20 bg-slate-100/70 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800/80 relative transition-colors">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center sm:max-w-2xl w-[95vw] sm:w-full mx-auto mb-16 space-y-3">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              The Problem With Manual Inventory
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base">
              Traditional spreadsheet-based stock management creates costly friction for modern supermarkets.
            </p>
          </div>

          <Reveal className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div>
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 hover:border-red-500/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-13 h-13 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 dark:text-red-400 group-hover:scale-110 transition-transform">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                    Stockouts cost sales
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
                    Out-of-stock shelves lead to lost revenue, frustrated customers, and lost market share to competing supermarket stores.
                  </p>
                </div>
              </Card>
            </div>

            {/* Card 2 */}
            <div>
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 hover:border-amber-500/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-13 h-13 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                    <PackageMinus className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                    Overstocking wastes money
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
                    Excess inventory ties up working capital and causes costly product expiration, perishability losses, and storage wastage.
                  </p>
                </div>
              </Card>
            </div>

            {/* Card 3 */}
            <div>
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 hover:border-indigo-500/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-13 h-13 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                    Manual reordering takes too long
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
                    Supermarket store managers spend 15+ hours weekly creating spreadsheet orders based on guesswork instead of data.
                  </p>
                </div>
              </Card>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 4. FEATURES SECTION */}
      <section id="features" className="py-24 relative">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center sm:max-w-4xl w-[95vw] sm:w-full mx-auto mb-20 space-y-4 pt-4">
            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 px-3.5 py-1 text-xs">
              Powerful Capabilities
            </Badge>
            <h2 className="font-heading text-3xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight">
              Everything You Need In One Platform
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base">
              Automate supermarket inventory operations with AI intelligence designed for modern retail growth.
            </p>
          </div>

          <Reveal className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div>
              <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-8 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-900 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-13 h-13 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <Activity className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                    Real Time Stock Monitoring
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
                    Track stock levels instantly across aisles, backrooms, and multiple store branches with real-time stock discrepancy alerts.
                  </p>
                </div>
              </Card>
            </div>

            {/* Feature 2 */}
            <div>
              <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-8 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-900 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-13 h-13 rounded-lg bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
                    <BrainCircuit className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                    AI Demand Forecasting
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
                    Predict product demand down to the SKU level using machine learning models trained on historical sales, weather, and holidays.
                  </p>
                </div>
              </Card>
            </div>

            {/* Feature 3 */}
            <div>
              <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-8 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-900 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-13 h-13 rounded-lg bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:bg-violet-600 group-hover:text-white transition-all">
                    <RefreshCw className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                    Automated Reorder Suggestions
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
                    Never run out of fast-selling items. AI automatically calculates optimal reorder points and quantities before stock runs low.
                  </p>
                </div>
              </Card>
            </div>

            {/* Feature 4 */}
            <div>
              <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-8 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-900 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-13 h-13 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                    Purchase Order Management
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
                    Generate, review, approve, and send electronic purchase orders to suppliers in seconds with full status audit trails.
                  </p>
                </div>
              </Card>
            </div>

            {/* Feature 5 */}
            <div>
              <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-8 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-900 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-13 h-13 rounded-lg bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Truck className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                    Supplier Management
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
                    Maintain detailed supplier profiles, track lead times, rate delivery fulfillment reliability, and streamline vendor relations.
                  </p>
                </div>
              </Card>
            </div>

            {/* Feature 6 */}
            <div>
              <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-8 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-900 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-13 h-13 rounded-lg bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-all">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                    Dynamic Pricing Engine
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
                    Optimize store margins with intelligent pricing recommendations that automatically adjust near-expiry items to prevent losses.
                  </p>
                </div>
              </Card>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 5. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-24 bg-slate-100/70 dark:bg-slate-900/40 border-y border-slate-200 dark:border-slate-800/80 transition-colors">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center sm:max-w-2xl w-[95vw] sm:w-full mx-auto mb-20 space-y-3">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              How RetailMind AI Works
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base">
              Get up and running in 4 straightforward steps for total inventory control.
            </p>
          </div>

          <Reveal className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Step 1 */}
            <div className="relative space-y-4 p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <span className="font-heading text-4xl font-extrabold text-indigo-500/60 dark:text-indigo-500/40">01</span>
              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">Connect your inventory</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
                Seamlessly sync your existing POS catalog or upload product CSV datasets in just a few clicks.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative space-y-4 p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <span className="font-heading text-4xl font-extrabold text-purple-500/60 dark:text-purple-500/40">02</span>
              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">AI analyses your data</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
                Neural networks identify sales patterns, consumer trends, seasonal peaks, and stock velocity.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative space-y-4 p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <span className="font-heading text-4xl font-extrabold text-violet-500/60 dark:text-violet-500/40">03</span>
              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">Get smart suggestions</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
                Receive proactive reorder notifications, safety stock limits, and optimal pricing adjustments.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative space-y-4 p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <span className="font-heading text-4xl font-extrabold text-emerald-500/60 dark:text-emerald-500/40">04</span>
              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">Approve and automate</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
                Dispatch purchase orders to suppliers with one click and let AI handle routine replenishment.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 6. STATS SECTION */}
      <section className="py-24 bg-indigo-50/50 dark:bg-slate-950 border-y border-indigo-100 dark:border-slate-800/80 relative overflow-hidden transition-colors duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06)_0,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.12)_0,transparent_70%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <Reveal className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center items-center">
            {/* Stat 1 */}
            <div className="p-8 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-2 shadow-lg shadow-slate-200/50 dark:shadow-none hover:-translate-y-1 transition-transform duration-300">
              <p className="font-heading text-5xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500 dark:from-indigo-400 dark:to-violet-300">
                500+
              </p>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Products Tracked</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Empowering high-volume supermarket catalogs and multi-category retail inventory.</p>
            </div>

            {/* Stat 2 */}
            <div className="p-8 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-indigo-200 dark:border-indigo-500/30 space-y-2 shadow-xl shadow-indigo-100 dark:shadow-indigo-500/10 hover:-translate-y-1 transition-transform duration-300 md:scale-110 relative z-10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-indigo-600 hover:bg-indigo-500 text-white border-none shadow-md">Industry Best</Badge>
              </div>
              <p className="font-heading text-5xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-300 pt-2">
                97%
              </p>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Test Pass Rate</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Industry-leading demand prediction precision across all product categories.</p>
            </div>

            {/* Stat 3 */}
            <div className="p-8 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-2 shadow-lg shadow-slate-200/50 dark:shadow-none hover:-translate-y-1 transition-transform duration-300">
              <p className="font-heading text-5xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-400 dark:to-pink-300">
                30 Day
              </p>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Demand Forecast</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Continuous rolling AI projection window to prevent stockout emergencies.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 7. PRICING SECTION */}
      <PricingSection />

      {/* 8. CTA SECTION */}
      <section className="py-24 relative overflow-hidden bg-indigo-50/40 dark:bg-slate-950 border-t border-indigo-100 dark:border-slate-800/80 transition-colors duration-300">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-10 dark:opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.9),rgba(168,85,247,0.5)_40%,transparent_70%)] rounded-full" />
        </div>
        
        {/* Ambient Subtle Grid Line Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8 sm:max-w-2xl w-[95vw] sm:w-full">
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide gap-2">
                <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Supercharge Your Supermarket</span>
              </Badge>
              
              <h2 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.1]">
                Ready to take <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-500 to-violet-500 dark:from-indigo-400 dark:via-purple-400 dark:to-violet-400">
                  control of your inventory?
                </span>
              </h2>
              
              <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                Join forward-thinking supermarket managers who eliminate stockouts, reduce wastage, and save up to 15 hours weekly with RetailMind AI.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button asChild size="lg" className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-xl shadow-indigo-500/30 dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] px-8 h-14 text-base rounded-xl transition-all hover:scale-105">
                  <Link href="/create-workspace">
                    Start Free Trial
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="bg-white/50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 font-medium px-8 h-14 text-base rounded-xl backdrop-blur-sm transition-all shadow-sm">
                  <Link href="#about">
                    Contact Sales
                  </Link>
                </Button>
              </div>

              <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  <span>14-day free trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  <span>Cancel anytime</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  <span>24/7 expert support</span>
                </div>
              </div>
            </div>

            {/* Right Interactive Element */}
            <div className="relative lg:h-[500px] flex items-center justify-center group perspective-[1000px] mt-10 lg:mt-0">
              {/* Glowing ring */}
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.14),transparent_65%)] dark:bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.25),transparent_65%)]" />
              
              {/* Floating Cards Mockup */}
              <div className="relative w-full sm:max-w-md w-[95vw] sm:w-full transform-gpu transition-transform duration-700 lg:group-hover:rotate-y-[-10deg] lg:group-hover:rotate-x-[5deg]">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 rounded-2xl blur opacity-20 dark:opacity-30 group-hover:opacity-40 dark:group-hover:opacity-70 transition duration-1000" />
                
                <div className="relative rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700 shadow-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-slate-900 dark:text-white font-semibold text-sm">AI Auto-Reorder</p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">Triggered 2 mins ago</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">Active</Badge>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-[85%]" />
                    </div>
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-500 dark:text-slate-400">Accuracy Confidence</span>
                      <span className="text-indigo-600 dark:text-indigo-400">99.2%</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="p-3 rounded-lg bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Purchase Order #8932</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">Sent</span>
                    </div>
                  </div>
                </div>
                
                {/* Floating smaller cards */}
                <div className="absolute -bottom-6 -left-6 sm:-bottom-10 sm:-left-10 bg-white/90 dark:bg-slate-900/90 border border-slate-200/50 dark:border-slate-700 p-4 rounded-xl shadow-xl transform transition-transform duration-500 lg:group-hover:-translate-y-4 lg:group-hover:-translate-x-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Revenue Saved</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">+$12,450</p>
                    </div>
                  </div>
                </div>

                <div className="absolute -top-6 -right-6 sm:-top-10 sm:-right-10 bg-white/90 dark:bg-slate-900/90 border border-slate-200/50 dark:border-slate-700 p-4 rounded-xl shadow-xl transform transition-transform duration-500 lg:group-hover:translate-y-4 lg:group-hover:translate-x-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 dark:bg-purple-500/20 rounded-lg text-purple-600 dark:text-purple-400">
                      <Boxes className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Stockouts Avoided</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">47 items</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer id="about" className="bg-slate-950 border-t border-slate-800/80 pt-16 pb-12">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800/60">
            {/* Logo & Description Column */}
            <div className="space-y-4 md:col-span-1">
              <Logo href="/" size="sm" layout="horizontal" textClassName="text-white group-hover:text-indigo-400" />
              <p className="text-slate-400 text-sm leading-relaxed">
                Smart inventory management and demand forecasting SaaS platform for supermarkets.
              </p>
            </div>

            {/* Product Column */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-indigo-400 transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-indigo-400 transition-colors">Demand Forecasting</a></li>
                <li><a href="#features" className="hover:text-indigo-400 transition-colors">Automated Reorders</a></li>
                <li><a href="#pricing" className="hover:text-indigo-400 transition-colors">Pricing</a></li>
              </ul>
            </div>

            {/* Company Column */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#about" className="hover:text-indigo-400 transition-colors">About Us</a></li>
                <li><a href="#about" className="hover:text-indigo-400 transition-colors">Supermarket Stories</a></li>
                <li><a href="#about" className="hover:text-indigo-400 transition-colors">Careers</a></li>
                <li><a href="#about" className="hover:text-indigo-400 transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Legal Column */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Security</a></li>
                <li>
                  <CookieSettingsButton />
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 text-center sm:flex sm:items-center sm:justify-between text-xs text-slate-500">
            <p>© 2026 RetailMind AI. All rights reserved.</p>
            <p className="mt-2 sm:mt-0">Built for high-performance supermarket inventory operations.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
