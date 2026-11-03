/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminBackup from "../adminBackup.js";
import type * as aiOperationsAdmin from "../aiOperationsAdmin.js";
import type * as alerts from "../alerts.js";
import type * as analyticsAdmin from "../analyticsAdmin.js";
import type * as apply120Days from "../apply120Days.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as authInternal from "../authInternal.js";
import type * as billingEngine from "../billingEngine.js";
import type * as communications from "../communications.js";
import type * as communicationsAdmin from "../communicationsAdmin.js";
import type * as communicationsQueries from "../communicationsQueries.js";
import type * as crons from "../crons.js";
import type * as forecasting from "../forecasting.js";
import type * as guardrails from "../guardrails.js";
import type * as inventory from "../inventory.js";
import type * as lib_jwt from "../lib/jwt.js";
import type * as lib_password from "../lib/password.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_roleGuard from "../lib/roleGuard.js";
import type * as lib_serverSecret from "../lib/serverSecret.js";
import type * as lib_testAuth from "../lib/testAuth.js";
import type * as mailer from "../mailer.js";
import type * as migrations_multiTenantMigration from "../migrations/multiTenantMigration.js";
import type * as organizations from "../organizations.js";
import type * as plansAdmin from "../plansAdmin.js";
import type * as pricing from "../pricing.js";
import type * as publicPlans from "../publicPlans.js";
import type * as purchaseOrders from "../purchaseOrders.js";
import type * as rateLimits from "../rateLimits.js";
import type * as reactivateOrgs from "../reactivateOrgs.js";
import type * as reorder from "../reorder.js";
import type * as seed from "../seed.js";
import type * as seedMockForecasts from "../seedMockForecasts.js";
import type * as seedPlans from "../seedPlans.js";
import type * as sessions from "../sessions.js";
import type * as subscriptions from "../subscriptions.js";
import type * as superAdmin from "../superAdmin.js";
import type * as superAdminActions from "../superAdminActions.js";
import type * as suppliers from "../suppliers.js";
import type * as supportTickets from "../supportTickets.js";
import type * as system from "../system.js";
import type * as systemPrompts from "../systemPrompts.js";
import type * as telemetry from "../telemetry.js";
import type * as users from "../users.js";
import type * as usersAdmin from "../usersAdmin.js";
import type * as wipeDb from "../wipeDb.js";
import type * as workflowAdmin from "../workflowAdmin.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminBackup: typeof adminBackup;
  aiOperationsAdmin: typeof aiOperationsAdmin;
  alerts: typeof alerts;
  analyticsAdmin: typeof analyticsAdmin;
  apply120Days: typeof apply120Days;
  audit: typeof audit;
  auth: typeof auth;
  authInternal: typeof authInternal;
  billingEngine: typeof billingEngine;
  communications: typeof communications;
  communicationsAdmin: typeof communicationsAdmin;
  communicationsQueries: typeof communicationsQueries;
  crons: typeof crons;
  forecasting: typeof forecasting;
  guardrails: typeof guardrails;
  inventory: typeof inventory;
  "lib/jwt": typeof lib_jwt;
  "lib/password": typeof lib_password;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/roleGuard": typeof lib_roleGuard;
  "lib/serverSecret": typeof lib_serverSecret;
  "lib/testAuth": typeof lib_testAuth;
  mailer: typeof mailer;
  "migrations/multiTenantMigration": typeof migrations_multiTenantMigration;
  organizations: typeof organizations;
  plansAdmin: typeof plansAdmin;
  pricing: typeof pricing;
  publicPlans: typeof publicPlans;
  purchaseOrders: typeof purchaseOrders;
  rateLimits: typeof rateLimits;
  reactivateOrgs: typeof reactivateOrgs;
  reorder: typeof reorder;
  seed: typeof seed;
  seedMockForecasts: typeof seedMockForecasts;
  seedPlans: typeof seedPlans;
  sessions: typeof sessions;
  subscriptions: typeof subscriptions;
  superAdmin: typeof superAdmin;
  superAdminActions: typeof superAdminActions;
  suppliers: typeof suppliers;
  supportTickets: typeof supportTickets;
  system: typeof system;
  systemPrompts: typeof systemPrompts;
  telemetry: typeof telemetry;
  users: typeof users;
  usersAdmin: typeof usersAdmin;
  wipeDb: typeof wipeDb;
  workflowAdmin: typeof workflowAdmin;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
