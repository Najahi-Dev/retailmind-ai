// app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";
import { Poppins, Montserrat } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import ConvexClientProvider from "@/lib/convex-client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";

const poppins = Poppins({
  subsets:  ["latin"],
  weight:   ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

const montserrat = Montserrat({
  subsets:  ["latin"],
  weight:   ["400", "500", "600", "700", "800", "900"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title:       "RetailMind AI",
  description: "Smart Inventory & Demand Forecasting",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${poppins.variable} ${montserrat.variable}`}>
          <ConvexClientProvider>
            <ThemeProvider>
              <TooltipProvider>{children}</TooltipProvider>
            </ThemeProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}