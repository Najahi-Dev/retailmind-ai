import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run every night at 2 AM
crons.daily(
  "generate-reorder-suggestions",
  { hourUTC: 20, minuteUTC: 30 }, // 2 AM Sri Lanka (UTC+5:30)
  internal.reorder.generateReorderSuggestions
);

export default crons;