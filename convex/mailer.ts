"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import nodemailer from "nodemailer";

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

/** Login URL is always derived from server configuration, never from caller input. */
function getAppLoginUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://app.retailmind.ai";
  try {
    const url = new URL(base);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("bad protocol");
    return new URL("/login", url.origin).toString();
  } catch {
    return "https://app.retailmind.ai/login";
  }
}

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
