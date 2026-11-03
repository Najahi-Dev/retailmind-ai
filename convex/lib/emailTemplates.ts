// convex/lib/emailTemplates.ts
// Email-client-safe templates: table layout, inline styles, no external CSS,
// bulletproof button, hidden preheader, plain-text alternative.

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** "Chrome on Windows" style summary of a user-agent string. */
export function describeDevice(userAgent?: string): string {
  if (!userAgent) return "Unknown device";
  const ua = userAgent;
  const browser = /Edg\//.test(ua)
    ? "Microsoft Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : /curl|node|python|axios/i.test(ua)
              ? "Script / API client"
              : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /iPhone|iPad|iOS/.test(ua)
      ? "iOS"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
}

function formatTimestamp(ms: number): string {
  // Sri Lanka time is the platform default; UTC shown alongside for clarity.
  const local = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(ms));
  return `${local} (Sri Lanka time)`;
}

const BRAND = "#4f46e5";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const BG = "#f1f5f9";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export type PasswordResetEmailInput = {
  name: string;
  resetUrl: string;
  appOrigin: string;
  expiresInMinutes: number;
  requestedAt: number;
  ip?: string;
  userAgent?: string;
};

export function renderPasswordResetEmail(input: PasswordResetEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const name = escapeHtml(input.name?.trim() || "there");
  const link = escapeHtml(input.resetUrl);
  const origin = escapeHtml(input.appOrigin);
  const when = escapeHtml(formatTimestamp(input.requestedAt));
  const device = escapeHtml(describeDevice(input.userAgent));
  const ip = escapeHtml(input.ip && input.ip !== "unknown" ? input.ip : "Not available");
  const year = new Date(input.requestedAt).getFullYear();
  // Remote images only load from a public HTTPS origin (never from localhost).
  const logo = input.appOrigin.startsWith("https://")
    ? `<img src="${origin}/logo.png" width="40" height="40" alt="RetailMind AI" style="display:block;border:0;border-radius:10px;width:40px;height:40px">`
    : `<div style="width:40px;height:40px;border-radius:10px;background:${BRAND};color:#ffffff;font:bold 18px/40px ${FONT};text-align:center">R</div>`;

  const subject = "Reset your RetailMind AI password";
  const preheader = `Use this secure link to choose a new password. It expires in ${input.expiresInMinutes} minutes.`;

  const detailRow = (label: string, value: string) => `
          <tr>
            <td style="padding:6px 0;font:13px/20px ${FONT};color:${MUTED};width:110px;vertical-align:top">${label}</td>
            <td style="padding:6px 0;font:600 13px/20px ${FONT};color:${TEXT}">${value}</td>
          </tr>`;

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:${BG};-webkit-text-size-adjust:100%">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG}">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">

          <!-- Brand -->
          <tr>
            <td style="padding:0 4px 20px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle">${logo}</td>
                  <td style="vertical-align:middle;padding-left:12px;font:700 18px/24px ${FONT};color:${TEXT}">
                    RetailMind <span style="display:inline-block;padding:1px 7px;border-radius:6px;background:#eef2ff;color:${BRAND};font:700 11px/18px ${FONT};vertical-align:middle">AI</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border:1px solid ${BORDER};border-radius:14px;overflow:hidden">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="height:4px;background:${BRAND};line-height:4px;font-size:0">&nbsp;</td></tr>
                <tr>
                  <td style="padding:36px 40px 8px">
                    <p style="margin:0 0 8px;font:600 12px/16px ${FONT};letter-spacing:.08em;text-transform:uppercase;color:${BRAND}">Account security</p>
                    <h1 style="margin:0 0 20px;font:700 24px/32px ${FONT};color:${TEXT}">Reset your password</h1>
                    <p style="margin:0 0 16px;font:15px/24px ${FONT};color:${TEXT}">Hi ${name},</p>
                    <p style="margin:0 0 28px;font:15px/24px ${FONT};color:#334155">
                      We received a request to reset the password for your RetailMind AI account.
                      Click the button below to choose a new one. For your security, this link can be used
                      <strong>only once</strong> and expires in <strong>${input.expiresInMinutes} minutes</strong>.
                    </p>

                    <!-- Bulletproof button -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px">
                      <tr>
                        <td align="center" bgcolor="${BRAND}" style="border-radius:10px">
                          <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${link}" style="height:48px;v-text-anchor:middle;width:220px" arcsize="20%" fillcolor="${BRAND}" stroke="f"><center style="color:#ffffff;font:bold 15px Arial">Reset password</center></v:roundrect><![endif]-->
                          <!--[if !mso]><!-- -->
                          <a href="${link}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 32px;font:700 15px/20px ${FONT};color:#ffffff;text-decoration:none;border-radius:10px">Reset password</a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>

                    <!-- Request details -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid ${BORDER};border-radius:10px;margin:0 0 24px">
                      <tr>
                        <td style="padding:16px 20px">
                          <p style="margin:0 0 6px;font:700 13px/20px ${FONT};color:${TEXT}">Request details</p>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            ${detailRow("Requested", when)}
                            ${detailRow("Device", device)}
                            ${detailRow("IP address", ip)}
                          </table>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0 0 24px;font:14px/22px ${FONT};color:#334155">
                      <strong>Didn&#39;t request this?</strong> You can safely ignore this email &mdash; your password
                      will stay the same. If you keep receiving these emails, contact your workspace administrator.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 40px 32px;border-top:1px solid ${BORDER}">
                    <p style="margin:0 0 6px;font:12px/18px ${FONT};color:${MUTED}">Button not working? Copy and paste this link into your browser:</p>
                    <p style="margin:0;font:12px/18px ${FONT};word-break:break-all"><a href="${link}" style="color:${BRAND};text-decoration:underline">${link}</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 8px 0;text-align:center">
              <p style="margin:0 0 6px;font:12px/18px ${FONT};color:${MUTED}">
                For your security, RetailMind AI will never ask for your password by email.
              </p>
              <p style="margin:0;font:12px/18px ${FONT};color:#94a3b8">
                &copy; ${year} RetailMind AI &middot; Smart retail management &middot;
                <a href="${origin}" style="color:#94a3b8;text-decoration:underline">${origin.replace(/^https?:\/\//, "")}</a>
              </p>
              <p style="margin:8px 0 0;font:11px/16px ${FONT};color:#94a3b8">
                You received this email because a password reset was requested for your account.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    "RetailMind AI — Reset your password",
    "",
    `Hi ${input.name?.trim() || "there"},`,
    "",
    "We received a request to reset the password for your RetailMind AI account.",
    `Use the link below to choose a new one. It can be used once and expires in ${input.expiresInMinutes} minutes.`,
    "",
    input.resetUrl,
    "",
    "Request details",
    `  Requested:  ${formatTimestamp(input.requestedAt)}`,
    `  Device:     ${describeDevice(input.userAgent)}`,
    `  IP address: ${input.ip && input.ip !== "unknown" ? input.ip : "Not available"}`,
    "",
    "Didn't request this? You can safely ignore this email — your password will stay the same.",
    "",
    `© ${year} RetailMind AI · ${input.appOrigin}`,
  ].join("\n");

  return { subject, html, text };
}
