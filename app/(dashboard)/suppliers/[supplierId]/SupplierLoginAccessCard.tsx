// app/(dashboard)/suppliers/[supplierId]/SupplierLoginAccessCard.tsx
"use client";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { convexErrorMessage } from "@/lib/convex-error";
import { PasswordRequirements, isPasswordValid } from "@/components/auth/password-requirements";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyIcon, EyeIcon, EyeOffIcon, KeyRoundIcon, RefreshCwIcon, SaveIcon, WandSparklesIcon } from "lucide-react";

const PW_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";

function generatePassword() {
  // Cryptographically secure; the suffix guarantees the server password policy.
  const bytes = new Uint8Array(13);
  crypto.getRandomValues(bytes);
  let pw = "";
  for (const b of bytes) pw += PW_CHARS.charAt(b % PW_CHARS.length);
  return `${pw}Aa7`;
}

const formatDate = (ts?: number) =>
  ts
    ? new Date(ts).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "Never";

export default function SupplierLoginAccessCard({
  supplier,
}: {
  supplier: { _id: Id<"suppliers">; name: string; email: string; phone?: string };
}) {
  const { token, user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager" || user?.role === "super_admin";

  const account = useQuery(
    api.users.getSupplierLoginAccount,
    token && canManage ? { token, supplierId: supplier._id } : "skip",
  );
  const setSupplierPassword = useAction(api.users.setSupplierPassword);
  const createUser = useAction(api.users.createUser);

  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!canManage) return null;

  const hasAccount = !!account;
  const valid = isPasswordValid(password);

  const handleGenerate = () => {
    setPassword(generatePassword());
    setShow(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Password copied");
    } catch {
      toast.error("Could not copy password");
    }
  };

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      if (hasAccount) {
        const res = await setSupplierPassword({ token: token ?? undefined, supplierId: supplier._id, password });
        toast.success(`Password updated for ${res.email}. Share it with the supplier securely.`);
      } else {
        await createUser({
          token: token ?? undefined,
          name: supplier.name,
          email: supplier.email,
          phone: supplier.phone || undefined,
          role: "supplier",
          supplierId: supplier._id,
          password,
          sendEmail: false,
        });
        toast.success(`Login created for ${supplier.email}. Share the password with the supplier securely.`);
      }
      setPassword("");
      setShow(false);
    } catch (err) {
      toast.error(convexErrorMessage(err, "Failed to save password"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <KeyRoundIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Login Access
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          {hasAccount
            ? "Set a new password for this supplier's portal login. They will be signed out of existing sessions."
            : "This supplier has no portal login yet. Set a password to create one."}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {account === undefined ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <RefreshCwIcon className="animate-spin size-3.5 text-indigo-500" /> Loading login account...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-0 text-xs">
              {[
                { label: "Login Email", value: account?.email ?? supplier.email },
                {
                  label: "Account",
                  badge: hasAccount
                    ? account.isActive
                      ? { text: "Active", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" }
                      : { text: "Disabled", cls: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700" }
                    : { text: "No login", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
                },
                ...(hasAccount
                  ? [
                      { label: "Last Sign-in", value: formatDate(account.lastLogin) },
                      { label: "Password Changed", value: formatDate(account.passwordChangedAt) },
                    ]
                  : []),
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800/60 last:border-0"
                >
                  <span className="text-slate-500 font-medium shrink-0">{row.label}</span>
                  {"badge" in row && row.badge ? (
                    <Badge className={`text-xs font-bold px-2 py-0.5 border ${row.badge.cls}`}>{row.badge.text}</Badge>
                  ) : (
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-right break-all">{row.value}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <Label htmlFor="supplier-password" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {hasAccount ? "New Password" : "Password"}
              </Label>
              <div className="relative">
                <Input
                  id="supplier-password"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800 pr-16 font-mono"
                />
                <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
                  {password && (
                    <button
                      type="button"
                      onClick={handleCopy}
                      aria-label="Copy password"
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <CopyIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {show ? <EyeOffIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <PasswordRequirements password={password} />
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleGenerate} className="flex-1 h-9 text-xs rounded-xl">
                  <WandSparklesIcon className="size-3.5 mr-1.5" /> Generate Password
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!valid || saving}
                  className="flex-1 h-9 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 border-0"
                >
                  {saving ? (
                    <RefreshCwIcon className="animate-spin size-3.5 mr-1.5" />
                  ) : (
                    <SaveIcon className="size-3.5 mr-1.5" />
                  )}
                  {hasAccount ? "Update Password" : "Create Login"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
