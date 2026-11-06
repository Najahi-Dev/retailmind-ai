"use client";
// Client-boundary re-exports so the server-rendered landing page can use these
// shadcn primitives (they import the `radix-ui` barrel, which is client-only).
export { Button } from "@/components/ui/button";
export { Badge } from "@/components/ui/badge";
