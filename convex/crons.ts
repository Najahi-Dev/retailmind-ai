// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every night 2:00 AM — all products check pannu
crons.daily(
  "nightly-reorder-check",
  { hourUTC: 20, minuteUTC: 30 }, // 2:00 AM Sri Lanka time (UTC+5:30)
  internal.reorder.generateReorderSuggestions,
  {},
);

export default crons;
