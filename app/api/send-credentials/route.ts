// app/api/send-credentials/route.ts
//
// SECURITY NOTE: e-mailing passwords is discouraged. Prefer a one-time,
// expiring "set your password" link. This endpoint is kept for compatibility
// but is restricted to admins / super admins, rate limited, and only delivers
// to an existing user of an organization the caller administers.
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { convexErrorResponse, getConvexServerClient } from "@/lib/server/request";
import {
  enforceRateLimit,
  escapeHtml,
  isAllowedRecipient,
  jsonError,
  readJson,
  requireCaller,
} from "../_lib/guard";

const bodySchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(200),
  role: z.enum(["admin", "manager", "staff", "supplier"]),
  // Required when the caller is a super admin (target tenant).
  orgId: z.string().regex(/^[A-Za-z0-9_]+$/).max(64).optional(),
});

export async function POST(req: Request) {
  try {
    const auth = await requireCaller(req, ["super_admin", "admin"]);
    if ("response" in auth) return auth.response;
    const { caller, token } = auth;

    const parsed = bodySchema.safeParse(await readJson(req));
    if (!parsed.success) return jsonError(400, "Invalid request body");
    const { email, name, password, role, orgId } = parsed.data;

    const client = getConvexServerClient();
    const limited = await enforceRateLimit(client, req, "send-credentials", caller.id);
    if (limited) return limited;

    // Recipient must be an existing user of an org the caller administers.
    let allowed = false;
    if (caller.role === "super_admin") {
      if (!orgId) return jsonError(400, "orgId is required");
      try {
        const org = await client.query(api.superAdmin.getOrganizationDetails, {
          token,
          orgId: orgId as Id<"organizations">,
        });
        const target = email.toLowerCase();
        allowed = !!org?.users?.some((u: { email?: string }) => (u.email ?? "").toLowerCase() === target);
      } catch {
        allowed = false;
      }
    } else {
      allowed =
        email.toLowerCase() !== (caller.email ?? "").toLowerCase() &&
        (await isAllowedRecipient(client, token, caller, email, { orgUsers: true }));
    }
    if (!allowed) return jsonError(403, "Recipient must be an existing user of the organization");

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
            .content { padding: 28px; color: #334155; }
            .message { font-size: 15px; font-weight: 600; line-height: 1.6; color: #0f172a; margin-bottom: 20px; }
            .credentials-box { background: #f1f5f9; border-radius: 14px; padding: 16px; border: 1px solid #cbd5e1; margin-bottom: 20px; font-family: monospace; }
            .footer { padding: 20px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>RetailMind AI — Account Created</h1>
            </div>
            <div class="content">
              <div class="message">Hello ${escapeHtml(name)},</div>
              <p>An administrator has created a RetailMind AI account for you with the role of <strong>${escapeHtml(role)}</strong>.</p>
              <p>You can use the following credentials to sign in to your workspace:</p>
              <div class="credentials-box">
                <div><strong>Email:</strong> ${escapeHtml(email)}</div>
                <div style="margin-top: 8px;"><strong>Temporary Password:</strong> ${escapeHtml(password)}</div>
              </div>
              <p style="font-size: 13px; color: #64748b; margin: 0;">
                For security reasons, please change your password after you log in for the first time.
              </p>
            </div>
            <div class="footer">
              Automated Welcome Email • RetailMind AI Inventory Intelligence System
            </div>
          </div>
        </body>
      </html>
    `;

    const userEmail = process.env.GMAIL_EMAIL;
    const userPass = process.env.GMAIL_APP_PASSWORD;

    if (!userEmail || !userPass) {
      // Never log the password (or the recipient's address).
      console.log("[Email Credentials Mock Send] Mail transport not configured; credentials email not sent.");
      return NextResponse.json({
        success: true,
        delivered: false,
        mock: true,
        message: "Email not sent: configure GMAIL_EMAIL and GMAIL_APP_PASSWORD to send real emails.",
      });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: userEmail, pass: userPass },
      connectionTimeout: 10000,
      socketTimeout: 10000,
    });

    await transporter.sendMail({
      from: `"RetailMind AI" <${userEmail}>`,
      to: email,
      subject: "Welcome to RetailMind AI - Your Account Credentials",
      html: htmlContent,
    });

    return NextResponse.json({ success: true, delivered: true });
  } catch (err) {
    // Do not pass `err` to the logger blindly: SMTP errors may echo message content.
    if (err instanceof Error && !("data" in err)) {
      console.error("Failed to send credentials email:", err.name);
      return jsonError(500, "Failed to send email notification");
    }
    const { status, message } = convexErrorResponse(err, "Failed to send email notification");
    return jsonError(status, message);
  }
}
