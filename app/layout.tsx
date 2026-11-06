// app/layout.tsx
import { Poppins, Inter } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import ConvexClientProvider from "@/lib/convex-client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { CookieConsent } from "@/components/cookie-consent";
import { Analytics } from "@vercel/analytics/next";

// Headings only (h1–h6): 400–800. Poppins is not a variable font, so each weight is a file.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

// Inter is a variable font: one file covers every weight.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RetailMind AI - Smart Inventory & Demand Forecasting",
  description: "RetailMind AI helps supermarkets predict demand, automate reorders, and optimize pricing using artificial intelligence.",
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/logo-icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth no-scrollbar" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${poppins.variable} ${inter.variable} font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200 no-scrollbar transition-colors duration-300`}>
        <ConvexClientProvider>
          <ThemeProvider>
            <TooltipProvider>
              {children}
              <Analytics/>
            </TooltipProvider>
            <Toaster />
            <CookieConsent />
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}