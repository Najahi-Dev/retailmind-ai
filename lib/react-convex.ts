'use client';

/**
 * react-convex.ts
 *
 * Compatibility shim that wraps convex/react's `useQuery` with a
 * `{ data, isLoading, error }` shape and supports both:
 *   - string-based query names (e.g. "purchaseOrders:getPayments")
 *   - typed api references (e.g. api.purchaseOrders.getPayments)
 */

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

type ApiRef = Parameters<typeof useQuery>[0];

/**
 * Resolve a string like "purchaseOrders:getPayments" to the
 * corresponding typed api reference. Falls back to the raw string
 * (cast) when the path cannot be resolved at runtime.
 */
function resolveApiRef(nameOrRef: string | ApiRef): ApiRef {
  if (typeof nameOrRef !== 'string') return nameOrRef;

  // "module:functionName" → api[module][functionName]
  const [module, fnName] = nameOrRef.split(':');
  if (module && fnName) {
    const mod = (api as unknown as Record<string, Record<string, ApiRef>>)[module];
    if (mod && mod[fnName]) return mod[fnName];
  }

  // Dot-notation fallback: "purchaseOrders.getPayments"
  const parts = nameOrRef.split('.');
  let cursor: unknown = api;
  for (const part of parts) {
    cursor = (cursor as Record<string, unknown>)[part];
    if (!cursor) break;
  }
  if (cursor) return cursor as ApiRef;

  // Last-resort: return the string cast as ApiRef
  return nameOrRef as unknown as ApiRef;
}

/**
 * useConvexQuery
 *
 * A thin wrapper around `useQuery` from convex/react that returns a
 * familiar { data, isLoading, error } object.
 *
 * @param nameOrRef  - Convex query reference or colon-separated string
 *                     (e.g. "purchaseOrders:getPayments")
 * @param args       - Arguments to pass to the query
 */
export function useConvexQuery<T = unknown>(
  nameOrRef: string | ApiRef,
  args: Record<string, unknown> = {},
): { data: T | undefined; isLoading: boolean; error: Error | null } {
  const ref = resolveApiRef(nameOrRef);

  // useQuery returns `undefined` while loading, otherwise the result.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = useQuery(ref, args as any);

  return {
    data: result as T | undefined,
    isLoading: result === undefined,
    error: null, // Convex surfaces errors as thrown exceptions; kept for API parity
  };
}
