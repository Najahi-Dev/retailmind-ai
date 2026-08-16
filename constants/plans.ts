// constants/plans.ts

export interface PlanMetadata {
  displayName: string;
  tagline: string;
  tier: "STARTER" | "GROWTH" | "ENTERPRISE";
  price: string;
  priceSubtext: string;
  trialSubtext: string;
  description: string;
  billingCycle: string;
  productLimit: number | "Unlimited";
  skuLabel: string;
  features: string[];
  highlight?: boolean;
}

export const PLAN_CONFIG: Record<"STARTER" | "GROWTH" | "ENTERPRISE", PlanMetadata> = {
  STARTER: {
    displayName: "Starter",
    tagline: "Single Branch",
    tier: "STARTER",
    price: "LKR 2,500",
    priceSubtext: "/ month",
    trialSubtext: "🛡 14-day free trial included",
    description: "Essential inventory tracking for single-branch stores getting started.",
    billingCycle: "Monthly",
    productLimit: 100,
    skuLabel: "Up to 100 Active SKUs",
    features: [
      "Up to 100 Active SKUs",
      "Single Store Location",
      "Low Stock & Expiry Alerts",
      "Manual Purchase Orders (COD & Cheque logging)",
      "2 Staff User Accounts",
      "Standard Email Support",
    ],
  },
  GROWTH: {
    displayName: "Growth",
    tagline: "MOST POPULAR",
    tier: "GROWTH",
    price: "LKR 4,900",
    priceSubtext: "/ month",
    trialSubtext: "🛡 14-day free trial included",
    description: "Complete AI demand forecasting & automated replenishment engine.",
    billingCycle: "Monthly",
    productLimit: "Unlimited",
    skuLabel: "Unlimited SKUs",
    features: [
      "Unlimited Products & Active SKUs",
      "Multi-Branch Support (Up to 3 Stores)",
      "AI SKU Demand Forecasting Engine",
      "Automated Reorder & Safety Stock Engine",
      "Dynamic Expiry Markdowns & Price Cuts",
      "Unlimited Manager & Staff Accounts",
      "Priority 24/7 Support",
    ],
    highlight: true,
  },
  ENTERPRISE: {
    displayName: "Enterprise",
    tagline: "Multi-Chain",
    tier: "ENTERPRISE",
    price: "Custom",
    priceSubtext: "",
    trialSubtext: "Tailored Onboarding & Migration Support",
    description: "For multi-branch supermarket chains & franchise retail networks.",
    billingCycle: "Custom / Annual",
    productLimit: "Unlimited",
    skuLabel: "Unlimited SKUs",
    features: [
      "Unlimited Multi-Location Store Sync",
      "Custom POS API & ERP Integrations",
      "Dedicated Neural Forecasting Model Tuning",
      "Vendor & Supplier Fulfillment Portal",
      "Full RBAC Access Delegation Engine",
      "Dedicated Account Manager & 99.9% SLA",
    ],
  },
};
