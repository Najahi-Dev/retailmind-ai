// constants/plans.ts

export interface PlanMetadata {
  displayName: string;
  tier: "STARTER" | "GROWTH" | "ENTERPRISE";
  price: string;
  priceSubtext?: string;
  billingCycle: string;
  productLimit: number | "Unlimited";
  skuLabel: string;
  features: string[];
  highlight?: boolean;
}

export const PLAN_CONFIG: Record<"STARTER" | "GROWTH" | "ENTERPRISE", PlanMetadata> = {
  STARTER: {
    displayName: "Starter Plan",
    tier: "STARTER",
    price: "LKR 2,500 / mo",
    priceSubtext: "billed monthly",
    billingCycle: "Monthly",
    productLimit: 100,
    skuLabel: "100 SKUs",
    features: [
      "Up to 100 Products Tracked",
      "Basic Stock Level View",
      "Manual Purchase Orders",
      "Standard Email Support",
    ],
  },
  GROWTH: {
    displayName: "Growth Plan",
    tier: "GROWTH",
    price: "LKR 4,900 / mo",
    priceSubtext: "billed monthly",
    billingCycle: "Monthly",
    productLimit: "Unlimited",
    skuLabel: "Unlimited SKUs",
    features: [
      "Real-time Stock Discrepancy Tracking",
      "AI SKU Demand Forecasting (Enabled)",
      "Automated Reorder Suggestions (Enabled)",
      "Dynamic Margin Pricing Engine (Enabled)",
      "Priority 24/7 Support",
    ],
    highlight: true,
  },
  ENTERPRISE: {
    displayName: "Enterprise Plan",
    tier: "ENTERPRISE",
    price: "Custom",
    priceSubtext: "Contact sales",
    billingCycle: "Custom / Annual",
    productLimit: "Unlimited",
    skuLabel: "Unlimited SKUs",
    features: [
      "Multi-Location Store Sync",
      "Custom POS API Integrations",
      "Dedicated Neural Model Tuning",
      "Dedicated Account Manager & SLA",
    ],
  },
};
