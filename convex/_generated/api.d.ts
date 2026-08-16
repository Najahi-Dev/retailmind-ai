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
import type * as alerts from "../alerts.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as authInternal from "../authInternal.js";
import type * as crons from "../crons.js";
import type * as inventory from "../inventory.js";
import type * as lib_roleGuard from "../lib/roleGuard.js";
import type * as migrations_multiTenantMigration from "../migrations/multiTenantMigration.js";
import type * as organizations from "../organizations.js";
import type * as pricing from "../pricing.js";
import type * as purchaseOrders from "../purchaseOrders.js";
import type * as reorder from "../reorder.js";
import type * as seed from "../seed.js";
import type * as subscriptions from "../subscriptions.js";
import type * as suppliers from "../suppliers.js";
import type * as supportTickets from "../supportTickets.js";
import type * as users from "../users.js";
import type * as wipeDb from "../wipeDb.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminBackup: typeof adminBackup;
  alerts: typeof alerts;
  audit: typeof audit;
  auth: typeof auth;
  authInternal: typeof authInternal;
  crons: typeof crons;
  inventory: typeof inventory;
  "lib/roleGuard": typeof lib_roleGuard;
  "migrations/multiTenantMigration": typeof migrations_multiTenantMigration;
  organizations: typeof organizations;
  pricing: typeof pricing;
  purchaseOrders: typeof purchaseOrders;
  reorder: typeof reorder;
  seed: typeof seed;
  subscriptions: typeof subscriptions;
  suppliers: typeof suppliers;
  supportTickets: typeof supportTickets;
  users: typeof users;
  wipeDb: typeof wipeDb;
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
