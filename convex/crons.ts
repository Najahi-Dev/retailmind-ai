// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal, api } from "./_generated/api";

const crons = cronJobs();

// Every night 2:00 AM — all products check pannu
crons.daily(
  "nightly-reorder-check",
  { hourUTC: 20, minuteUTC: 30 }, // 2:00 AM Sri Lanka time (UTC+5:30)
  internal.reorder.generateReorderSuggestions,
  {},
);

crons.daily(
  "generate-forecasts",
  { hourUTC: 19, minuteUTC: 30 }, // 1:00 AM Sri Lanka time (UTC+5:30)
  api.forecasting.generateAllForecasts,
  {},
);

crons.daily(
  "generate-price-suggestions",
  { hourUTC: 21, minuteUTC: 0 },   // 2:30 AM Sri Lanka
  internal.pricing.generatePriceSuggestions
);

crons.daily(
  "run-dunning-engine",
  { hourUTC: 21, minuteUTC: 30 },  // 3:00 AM Sri Lanka
  internal.billingEngine.runDunningEngine
);

export default crons;
