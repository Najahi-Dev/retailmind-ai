"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
        403 - Access Restricted
      </h1>
      <p className="text-slate-600 dark:text-slate-400 max-w-md mb-8 text-sm">
        You do not have permission to view this section of RetailMind AI. Please contact your system administrator if you believe this is an error.
      </p>
      <Link href="/dashboard">
        <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}