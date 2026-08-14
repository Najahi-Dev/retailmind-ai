// app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";
import { Poppins, Inter } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import ConvexClientProvider from "@/lib/convex-client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { CookieConsent } from "@/components/cookie-consent";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "RetailMind AI - Smart Inventory & Demand Forecasting",
  description: "RetailMind AI helps supermarkets predict demand, automate reorders, and optimize pricing using artificial intelligence.",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/logo-icon.png", type: "image/png" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="scroll-smooth no-scrollbar" suppressHydrationWarning>
        <body className={`${poppins.variable} ${inter.variable} font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200 no-scrollbar transition-colors duration-300`}>
          <ConvexClientProvider>
            <ThemeProvider>
              <TooltipProvider>{children}</TooltipProvider>
              <Toaster />
              <CookieConsent />
            </ThemeProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}