'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';

const fadeInVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};
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
  Check,
  ArrowRight,
  Menu,
  X,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Store,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Play,
  CheckCircle2,
  Boxes,
  Layers,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Logo } from '@/components/logo';
import { ModeToggle } from '@/components/mode-toggle';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);

  const handleStartCheckout = async (plan: string) => {
    try {
      setStripeLoading(true);
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        } else if (data.redirectUrl) {
          router.push(data.redirectUrl);
          return;
        }
      }

      // Fallback for unauthenticated users
      router.push("/sign-in");
    } catch (err) {
      console.error("Checkout error:", err);
      router.push("/sign-in");
    } finally {
      setStripeLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
        <div className="absolute w-[450px] h-[450px] bg-indigo-600/20 rounded-full blur-[130px] animate-pulse pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 animate-pulse flex flex-col items-center gap-3"
        >
          <Logo size="lg" textClassName="text-white drop-shadow-md" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden transition-colors duration-300 no-scrollbar relative">
      {/* Dynamic Animated Background Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Animated Radial Dot Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1.2px,transparent_1.2px)] [background-size:36px_36px] opacity-[0.15] dark:opacity-[0.25]" />
        
        {/* Floating Glowing Gradient Orbs */}
        <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full bg-indigo-600/15 dark:bg-indigo-600/20 blur-[140px] animate-float-slow" />
        <div className="absolute top-[40%] right-[10%] w-[600px] h-[600px] rounded-full bg-purple-600/15 dark:bg-purple-600/20 blur-[160px] animate-pulse-glow" />
        <div className="absolute bottom-[15%] left-[20%] w-[550px] h-[550px] rounded-full bg-violet-600/15 dark:bg-violet-600/20 blur-[150px] animate-float-slow" />
        
        {/* Ambient Subtle Grid Line Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* 1. NAVBAR */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800/80 transition-all">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 h-20 sm:h-22 flex items-center justify-between relative">
          {/* Logo */}
          <Logo href="/" size="md" />

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
          </nav>

          {/* Desktop Auth CTA & Theme Toggle */}
          <div className="hidden md:flex items-center gap-4">
            <ModeToggle />
            <Button variant="ghost" asChild className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900">
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/30 font-medium px-5">
              <Link href="/sign-in">Get Started</Link>
            </Button>
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-3 md:hidden">
            <ModeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-slate-950/95 border-b border-slate-800 px-4 pt-4 pb-6 space-y-4"
          >
            <div className="flex flex-col space-y-3 text-sm font-medium text-slate-300">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-indigo-400 transition-colors py-1"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-indigo-400 transition-colors py-1"
              >
                How it Works
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-indigo-400 transition-colors py-1"
              >
                Pricing
              </a>
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-indigo-400 transition-colors py-1"
              >
                About
              </a>
            </div>
            <div className="pt-4 border-t border-slate-800/80 flex flex-col gap-3">
              <Button variant="outline" asChild className="w-full border-slate-800 text-slate-200 hover:bg-slate-900">
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button asChild className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30">
                <Link href="/sign-in">Get Started</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-28 pb-24 lg:pt-36 lg:pb-32 overflow-hidden">
        {/* Animated Background Gradients & Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse" />
        <div className="absolute top-1/3 left-1/3 w-[450px] h-[450px] bg-violet-600/15 rounded-full blur-[130px] pointer-events-none -z-10" />

        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Top Centered Logo Icon */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center pb-2"
            >
              <Logo size="lg" href="/" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 animate-spin-slow" />
                <span>Next-Gen Supermarket AI Platform</span>
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-heading text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]"
            >
              Smart Inventory.{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 dark:from-indigo-400 dark:via-purple-300 dark:to-violet-400 bg-clip-text text-transparent">
                AI Driven Decisions.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-normal"
            >
              RetailMind AI helps supermarkets predict demand, automate reorders and optimise pricing using artificial intelligence.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Button asChild size="lg" className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-lg shadow-indigo-600/30 px-8 h-12 text-base rounded-xl group">
                <Link href="/sign-in">
                  Get Started Free
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => setDemoOpen(true)}
                className="w-full sm:w-auto border-slate-300 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white font-medium px-8 h-12 text-base rounded-xl backdrop-blur-sm gap-2"
              >
                <Play className="w-4 h-4 text-indigo-500 dark:text-indigo-400 fill-indigo-500 dark:fill-indigo-400" />
                Watch Demo
              </Button>
            </motion.div>
          </div>

          {/* Floating Interactive Dashboard Mockup Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-14 relative max-w-5xl mx-auto"
          >
            {/* Glowing Backdrop Border */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600 rounded-3xl blur-xl opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

            <div className="relative rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xl text-slate-100">
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          </motion.div>
        </div>
      </section>

      {/* 3. PROBLEM SECTION */}
      <section className="py-20 bg-slate-100/70 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800/80 relative transition-colors">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              The Problem With Manual Inventory
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base">
              Traditional spreadsheet-based stock management creates costly friction for modern supermarkets.
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {/* Card 1 */}
            <motion.div variants={fadeInVariants}>
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 hover:border-red-500/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-13 h-13 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 dark:text-red-400 group-hover:scale-110 transition-transform">
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
            </motion.div>

            {/* Card 2 */}
            <motion.div variants={fadeInVariants}>
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 hover:border-amber-500/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-13 h-13 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
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
            </motion.div>

            {/* Card 3 */}
            <motion.div variants={fadeInVariants}>
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 hover:border-indigo-500/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-13 h-13 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
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
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 4. FEATURES SECTION */}
      <section id="features" className="py-24 relative">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto mb-20 space-y-4 pt-4">
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

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {/* Feature 1 */}
            <motion.div variants={fadeInVariants}>
              <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-900 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-13 h-13 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
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
            </motion.div>

            {/* Feature 2 */}
            <motion.div variants={fadeInVariants}>
              <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-900 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-13 h-13 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
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
            </motion.div>

            {/* Feature 3 */}
            <motion.div variants={fadeInVariants}>
              <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-900 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-13 h-13 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:bg-violet-600 group-hover:text-white transition-all">
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
            </motion.div>

            {/* Feature 4 */}
            <motion.div variants={fadeInVariants}>
              <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-900 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-13 h-13 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
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
            </motion.div>

            {/* Feature 5 */}
            <motion.div variants={fadeInVariants}>
              <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-900 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-13 h-13 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
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
            </motion.div>

            {/* Feature 6 */}
            <motion.div variants={fadeInVariants}>
              <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-900 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-13 h-13 rounded-2xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-all">
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
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 5. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-24 bg-slate-100/70 dark:bg-slate-900/40 border-y border-slate-200 dark:border-slate-800/80 transition-colors">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-3">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              How RetailMind AI Works
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base">
              Get up and running in 4 straightforward steps for total inventory control.
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative"
          >
            {/* Step 1 */}
            <motion.div variants={fadeInVariants} className="relative space-y-4 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <span className="font-heading text-4xl font-extrabold text-indigo-500/60 dark:text-indigo-500/40">01</span>
              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">Connect your inventory</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
                Seamlessly sync your existing POS catalog or upload product CSV datasets in just a few clicks.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div variants={fadeInVariants} className="relative space-y-4 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <span className="font-heading text-4xl font-extrabold text-purple-500/60 dark:text-purple-500/40">02</span>
              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">AI analyses your data</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
                Neural networks identify sales patterns, consumer trends, seasonal peaks, and stock velocity.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div variants={fadeInVariants} className="relative space-y-4 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <span className="font-heading text-4xl font-extrabold text-violet-500/60 dark:text-violet-500/40">03</span>
              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">Get smart suggestions</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
                Receive proactive reorder notifications, safety stock limits, and optimal pricing adjustments.
              </p>
            </motion.div>

            {/* Step 4 */}
            <motion.div variants={fadeInVariants} className="relative space-y-4 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <span className="font-heading text-4xl font-extrabold text-emerald-500/60 dark:text-emerald-500/40">04</span>
              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">Approve and automate</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
                Dispatch purchase orders to suppliers with one click and let AI handle routine replenishment.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 6. STATS SECTION (Dark Visual Flow Breaker) */}
      <section className="py-20 bg-gradient-to-r from-slate-950 via-indigo-950/80 to-slate-950 border-y border-indigo-500/20 relative overflow-hidden text-slate-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.12)_0,transparent_70%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
          >
            {/* Stat 1 */}
            <motion.div variants={fadeInVariants} className="p-8 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-sm space-y-2">
              <p className="font-heading text-5xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-300">
                500+
              </p>
              <h4 className="text-lg font-semibold text-white">Products Tracked</h4>
              <p className="text-slate-400 text-sm">Empowering high-volume supermarket catalogs and multi-category retail inventory.</p>
            </motion.div>

            {/* Stat 2 */}
            <motion.div variants={fadeInVariants} className="p-8 rounded-2xl bg-slate-900/90 border border-indigo-500/30 backdrop-blur-sm space-y-2 shadow-xl shadow-indigo-500/10">
              <p className="font-heading text-5xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                97%
              </p>
              <h4 className="text-lg font-semibold text-white">Test Pass Rate</h4>
              <p className="text-slate-400 text-sm">Industry-leading demand prediction precision across all product categories.</p>
            </motion.div>

            {/* Stat 3 */}
            <motion.div variants={fadeInVariants} className="p-8 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-sm space-y-2">
              <p className="font-heading text-5xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300">
                30 Day
              </p>
              <h4 className="text-lg font-semibold text-white">Demand Forecast</h4>
              <p className="text-slate-400 text-sm">Continuous rolling AI projection window to prevent stockout emergencies.</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 7. PRICING SECTION */}
      <section id="pricing" className="py-24 relative">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-3">
            <h2 className="font-heading text-3xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight">
              Simple Pricing
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base">
              Transparent, predictable plans built to grow with your supermarket business.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-4">
            {/* Starter Plan */}
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm relative overflow-visible">
              <CardHeader className="space-y-4 pt-6">
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Starter</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400 text-xs mt-1 min-h-[32px]">
                    For single store outlets getting started with stock tracking
                  </CardDescription>
                </div>
                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">LKR 0</span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs">/ forever</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 flex-1 flex flex-col justify-between pt-2">
                <ul className="space-y-3.5 text-sm text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" /> 
                    <span>Up to 100 Products Tracked</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" /> 
                    <span>Basic Stock Level View</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" /> 
                    <span>Manual Purchase Orders</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-slate-400 dark:text-slate-500">
                    <span className="w-4 h-4 inline-block shrink-0" />
                    <span>Standard Email Support</span>
                  </li>
                </ul>
                <Button asChild variant="outline" className="w-full border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 mt-6 h-11 rounded-xl font-medium">
                  <Link href="/sign-in">Get Started Free</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Growth Plan (Most Popular Highlighted) */}
            <Card className="bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-500/80 rounded-3xl relative flex flex-col justify-between shadow-2xl shadow-indigo-600/15 overflow-visible">
              {/* Floating Top Badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                <Badge className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-0 text-xs font-semibold px-4 py-1 uppercase tracking-wider shadow-md shadow-indigo-600/30">
                  Most Popular
                </Badge>
              </div>
              <CardHeader className="space-y-4 pt-6">
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Growth</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-300 text-xs mt-1 min-h-[32px]">
                    Complete AI demand forecasting & automated reorders
                  </CardDescription>
                </div>
                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">LKR 4,900</span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs">/ month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 flex-1 flex flex-col justify-between pt-2">
                <ul className="space-y-3.5 text-sm text-slate-700 dark:text-slate-200 font-medium">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" /> 
                    <span>Unlimited Products & SKUs</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" /> 
                    <span>AI Demand Forecasting Engine</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" /> 
                    <span>Automated Reorder Suggestions</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" /> 
                    <span>Expiry & Spoilage Reduction</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" /> 
                    <span>Priority 24/7 Support</span>
                  </li>
                </ul>
                <Button
                  onClick={() => handleStartCheckout("growth")}
                  disabled={stripeLoading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-lg shadow-indigo-600/30 mt-6 h-11 rounded-xl"
                >
                  {stripeLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Start 14-Day Free Trial
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm relative overflow-visible">
              <CardHeader className="space-y-4 pt-6">
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Enterprise</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400 text-xs mt-1 min-h-[32px]">
                    For multi-branch supermarket chains & franchise networks
                  </CardDescription>
                </div>
                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">Custom</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 flex-1 flex flex-col justify-between pt-2">
                <ul className="space-y-3.5 text-sm text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" /> 
                    <span>Multi-Location Store Sync</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" /> 
                    <span>Custom POS API Integrations</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" /> 
                    <span>Dedicated Neural Model Tuning</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" /> 
                    <span>Dedicated Account Manager & SLA</span>
                  </li>
                </ul>
                <Button asChild variant="outline" className="w-full border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 mt-6 h-11 rounded-xl font-medium">
                  <a href="mailto:sales@retailmind.ai?subject=RetailMind%20AI%20Enterprise%20Plan%20Inquiry">
                    Contact Enterprise Sales
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 8. CTA SECTION */}
      <section className="py-20 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-br from-indigo-900/90 via-slate-900 to-violet-950/90 border border-indigo-500/30 p-10 sm:p-16 text-center overflow-hidden shadow-2xl text-white">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
              <h2 className="font-heading text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Ready to take control of your inventory?
              </h2>
              <p className="text-slate-200 text-base sm:text-lg">
                Join forward-thinking supermarket managers who eliminate stockouts and save hours weekly with RetailMind AI.
              </p>
              <div className="pt-4">
                <Button asChild size="lg" className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-xl shadow-indigo-600/40 px-10 h-14 text-lg rounded-xl">
                  <Link href="/sign-in">Get Started Free</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer id="about" className="bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/80 pt-16 pb-12 transition-colors">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-200 dark:border-slate-800/60">
            {/* Logo & Description Column */}
            <div className="space-y-4 md:col-span-1">
              <Logo href="/" size="sm" />
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Smart inventory management and demand forecasting SaaS platform for supermarkets.
              </p>
            </div>

            {/* Product Column */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Demand Forecasting</a></li>
                <li><a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Automated Reorders</a></li>
                <li><a href="#pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Pricing</a></li>
              </ul>
            </div>

            {/* Company Column */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Company</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><a href="#about" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">About Us</a></li>
                <li><a href="#about" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Supermarket Stories</a></li>
                <li><a href="#about" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Careers</a></li>
                <li><a href="#about" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Legal Column */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Security</a></li>
                <li>
                  <button
                    onClick={() => window.dispatchEvent(new Event("open-cookie-preferences"))}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left"
                  >
                    Cookie Settings
                  </button>
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

      {/* Interactive Watch Demo Dialog */}
      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-400" />
              RetailMind AI Platform Walkthrough
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Discover how AI demand forecasting and automated purchase orders streamline supermarket operations.
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-video w-full rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-6 text-center space-y-4 relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 animate-pulse">
              <Play className="w-8 h-8 fill-indigo-400 ml-1" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white">Interactive Product Preview</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Experience real-time AI inventory tracking, automated PO generation, and 30-day demand predictions.
              </p>
            </div>
            <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-6">
              <Link href="/sign-in" onClick={() => setDemoOpen(false)}>
                Try RetailMind AI Live
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
