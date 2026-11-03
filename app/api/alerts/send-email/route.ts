// app/api/alerts/send-email/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { convexErrorResponse, getConvexServerClient } from "@/lib/server/request";
import {
  enforceRateLimit,
  escapeHtml,
  headerSafe,
  isAllowedRecipient,
  jsonError,
  readJson,
  requireCaller,
} from "../../_lib/guard";

const bodySchema = z.object({
  // Optional: defaults to the caller. Must be the caller or a user of the caller's org.
  email: z.string().trim().email().max(254).optional(),
  subject: z.string().trim().max(200).optional(),
  alertType: z
    .enum(["low_stock", "critical_stock", "overstock", "demand_spike", "supplier_delay", "system"])
    .default("low_stock"),
  priority: z.enum(["critical", "high", "medium", "low"]).default("high"),
  message: z.string().trim().min(1).max(2000).default("Inventory threshold alert triggered"),
  productName: z.string().trim().max(200).optional(),
  sku: z.string().trim().max(100).optional(),
});

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#64748b",
};

export async function POST(req: Request) {
  try {
    const auth = await requireCaller(req, ["admin", "manager", "staff"]);
    if ("response" in auth) return auth.response;
    const { caller, token } = auth;

    const parsed = bodySchema.safeParse((await readJson(req)) ?? {});
    if (!parsed.success) return jsonError(400, "Invalid request body");
    const { subject, alertType, priority, message, productName, sku } = parsed.data;

    const client = getConvexServerClient();
    const limited = await enforceRateLimit(client, req, "alerts-send-email", caller.id);
    if (limited) return limited;

    const recipient = parsed.data.email ?? caller.email;
    if (!recipient) return jsonError(400, "No recipient address available");
    if (!(await isAllowedRecipient(client, token, caller, recipient, { orgUsers: true }))) {
      return jsonError(403, "Recipient must be a member of your organization");
    }

    const badgeColor = PRIORITY_COLORS[priority] ?? "#64748b";
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
            .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
            .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); color: #ffffff; padding: 28px; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #ffffff; background: ${badgeColor}; margin-top: 8px; }
            .content { padding: 28px; color: #334155; }
            .message { font-size: 15px; font-weight: 600; line-height: 1.6; color: #0f172a; margin-bottom: 20px; }
            .product-box { background: #f1f5f9; border-radius: 14px; padding: 16px; border: 1px solid #cbd5e1; margin-bottom: 20px; }
            .product-title { font-weight: 700; font-size: 14px; color: #0f172a; margin: 0; }
            .product-sku { font-family: monospace; font-size: 12px; color: #4f46e5; margin-top: 4px; }
            .footer { padding: 20px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>RetailMind AI — Alert Notification</h1>
              <div class="badge">${escapeHtml(priority)} Priority • ${escapeHtml(alertType.replace("_", " "))}</div>
            </div>
            <div class="content">
              <div class="message">${escapeHtml(message)}</div>
              ${
                productName
                  ? `
                <div class="product-box">
                  <div class="product-title">${escapeHtml(productName)}</div>
                  ${sku ? `<div class="product-sku">SKU: ${escapeHtml(sku)}</div>` : ""}
                </div>
              `
                  : ""
              }
              <p style="font-size: 13px; color: #64748b; margin: 0;">
                Log in to your RetailMind AI dashboard to inspect the alert priority queue, snooze, or dispatch purchase orders.
              </p>
            </div>
            <div class="footer">
              Automated Alert Dispatch • RetailMind AI Inventory Intelligence System
            </div>
          </div>
        </body>
      </html>
    `;

    const finalSubject = headerSafe(subject ?? `[${priority.toUpperCase()}] ${message}`);
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey || apiKey === "re_dummy") {
      console.log("[Email Alert Mock Send] Resend API key not configured; alert email not sent.");
      return NextResponse.json({
        success: true,
        delivered: false,
        mock: true,
        message: "Email alert notification logged (Resend API key pending in env)",
      });
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: "RetailMind AI Alerts <alerts@retailmind.ai>",
      to: [recipient],
      subject: finalSubject,
      html: htmlContent,
    });
    if (error) {
      console.error("Resend alert email error:", error);
      return jsonError(502, "Failed to send email notification");
    }

    return NextResponse.json({ success: true, delivered: true });
  } catch (err) {
    const { status, message } = convexErrorResponse(err, "Failed to send email notification");
    return jsonError(status, message);
  }
}
