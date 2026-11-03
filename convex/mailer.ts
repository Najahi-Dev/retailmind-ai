"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import nodemailer from "nodemailer";
import { renderPasswordResetEmail } from "./lib/emailTemplates";

// Helper to get initialized Nodemailer transporter
const getTransporter = () => {
  const user = process.env.GMAIL_USER || process.env.GMAIL_EMAIL;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be configured in environment variables");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });
};

/** HTML-escapes untrusted text before interpolating it into an e-mail body. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strips CR/LF and quotes so a value is safe inside a header display name/subject. */
function headerSafe(value: unknown, max = 120): string {
  return String(value ?? "").replace(/[\r\n"<>]/g, " ").trim().slice(0, max);
}

/** App origin is always derived from server configuration, never from caller input or Host headers. */
function getAppOrigin(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
  try {
    const url = new URL(base);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("bad protocol");
    return url.origin;
  } catch {
    return "http://localhost:3000";
  }
}

function getAppLoginUrl(): string {
  return new URL("/sign-in", getAppOrigin()).toString();
}

/**
 * Sends a transactional e-mail via Gmail SMTP when configured, otherwise Resend.
 * RESEND_FROM should be an address on a domain verified in Resend; the sandbox
 * sender (onboarding@resend.dev) only delivers to the Resend account owner.
 */
async function sendTransactionalEmail(to: string, subject: string, html: string, text: string) {
  const gmailUser = process.env.GMAIL_USER || process.env.GMAIL_EMAIL;
  if (gmailUser && process.env.GMAIL_APP_PASSWORD) {
    await getTransporter().sendMail({
      from: `"RetailMind AI" <${gmailUser}>`,
      to,
      subject: headerSafe(subject, 200),
      html,
      text,
    });
    console.log("Transactional e-mail sent via Gmail SMTP");
    return;
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("No e-mail provider configured (GMAIL_* or RESEND_API_KEY)");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "RetailMind AI <onboarding@resend.dev>",
      to: [to],
      subject: headerSafe(subject, 200),
      html,
      text,
    }),
  });
  if (!res.ok) {
    const detail = await res.json().then((b) => b?.message).catch(() => "");
    throw new Error(`Resend rejected the e-mail (${res.status})${detail ? `: ${detail}` : ""}`);
  }
  console.log("Transactional e-mail sent via Resend");
}

// Internal only: scheduled by authInternal.createPasswordReset. Never reveals to the
// requester whether the e-mail exists — failures are only logged.
export const sendPasswordResetEmail = internalAction({
  args: {
    toEmail: v.string(),
    toName: v.string(),
    token: v.string(),
    requestedAt: v.optional(v.number()),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const origin = getAppOrigin();
    const resetUrl = new URL("/reset-password", origin);
    resetUrl.searchParams.set("token", args.token);
    const { subject, html, text } = renderPasswordResetEmail({
      name: args.toName,
      resetUrl: resetUrl.toString(),
      appOrigin: origin,
      expiresInMinutes: 30,
      requestedAt: args.requestedAt ?? Date.now(),
      ip: args.ip,
      userAgent: args.userAgent,
    });
    try {
      await sendTransactionalEmail(args.toEmail, subject, html, text);
    } catch (err) {
      console.error("Password reset e-mail failed:", err instanceof Error ? err.message : err);
    }
    return null;
  },
});

// Internal only: scheduled by convex/users.ts after an authorized admin creates a user.
export const sendWorkspaceUserInviteEmail = internalAction({
  args: {
    toEmail: v.string(),
    toName: v.string(),
    inviterName: v.string(),
    inviterEmail: v.string(),
    workspaceName: v.string(),
    temporaryPassword: v.string(),
    // Ignored: the login link is always built from NEXT_PUBLIC_APP_URL / APP_URL.
    loginUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const transporter = getTransporter();
      const user = process.env.GMAIL_USER || process.env.GMAIL_EMAIL;
      const workspaceName = escapeHtml(args.workspaceName);
      const toName = escapeHtml(args.toName);
      const inviterName = escapeHtml(args.inviterName);
      const inviterEmail = escapeHtml(args.inviterEmail);
      const temporaryPassword = escapeHtml(args.temporaryPassword);
      const loginUrl = escapeHtml(getAppLoginUrl());

      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
            .header { background-color: #f3f4f6; padding: 24px; text-align: center; border-bottom: 1px solid #e5e7eb; }
            .header h2 { margin: 0; color: #111827; font-size: 24px; }
            .content { padding: 32px 24px; }
            .content p { font-size: 16px; color: #374151; line-height: 1.5; margin-bottom: 16px; }
            .password-block { background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 24px 0; text-align: center; }
            .password-label { margin: 0; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
            .password-value { margin: 8px 0 0; font-size: 24px; font-weight: 700; color: #111827; letter-spacing: 2px; }
            .button-container { text-align: center; margin-top: 32px; margin-bottom: 16px; }
            .button { background-color: #111827; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px; transition: background-color 0.2s; }
            .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-top: 1px solid #e5e7eb; }
            @media only screen and (max-width: 600px) {
              .container { margin: 20px; width: auto; }
              .content { padding: 24px 16px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Join ${workspaceName}</h2>
            </div>
            <div class="content">
              <p>Hi ${toName},</p>
              <p><strong>${inviterName}</strong> has invited you to join their workspace <strong>${workspaceName}</strong> on RetailMind AI.</p>
              
              <div class="password-block">
                <p class="password-label">Your temporary password</p>
                <p class="password-value">${temporaryPassword}</p>
              </div>
              
              <div class="button-container">
                <a href="${loginUrl}" class="button">Login to Workspace</a>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0;">This invitation was sent on behalf of ${inviterName} (${inviterEmail}). If you were not expecting it, you can ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Fixed sender display name; no caller-controlled From/Reply-To.
      const info = await transporter.sendMail({
        from: `"RetailMind AI" <${user}>`,
        to: args.toEmail,
        subject: `You've been invited to join ${headerSafe(args.workspaceName)} on RetailMind AI`,
        html: htmlBody,
      });

      console.log("Workspace user invite email sent successfully: " + info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error("Invite Email Sending Failed:", error);
      return { success: false, error: error.message };
    }
  },
});
