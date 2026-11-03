"use node";
import { action, internalAction, ActionCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { Resend } from "resend";
import nodemailer from "nodemailer";

/** Removes CR/LF so a value cannot break out of a header (e.g. Subject). */
function singleLine(value: string, max = 200): string {
  return value.replace(/[\r\n]+/g, " ").slice(0, max);
}

async function sendTemplate(
  ctx: ActionCtx,
  templateName: string,
  targetEmail: string,
  variables: Record<string, string>,
) {
  const template = await ctx.runQuery(internal.communicationsQueries.getTemplateByName, {
    name: templateName,
  });

  if (!template) {
    throw new ConvexError(`Template '${templateName}' not found.`);
  }
  if (!template.isActive) {
    throw new ConvexError(`Template '${templateName}' is currently drafted/inactive.`);
  }
  if (template.channel !== "email") {
    throw new ConvexError(`Template '${templateName}' is not configured for the email channel.`);
  }

  // Replace variables in subject and body. The body is sent as plain text (never HTML),
  // and variable values are stripped of line breaks in the subject.
  let subject = template.subjectTemplate || "Notification from RetailMind";
  let body = template.bodyTemplate || "";

  for (const [key, value] of Object.entries(variables)) {
    const safeKey = key.replace(/[^A-Za-z0-9_]/g, "");
    if (!safeKey) continue;
    const regex = new RegExp(`\\{\\{${safeKey}\\}\\}`, "g");
    subject = subject.replace(regex, () => singleLine(String(value)));
    body = body.replace(regex, () => String(value).slice(0, 2000));
  }
  subject = singleLine(subject);

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY environment variable is not configured in the backend.");
  }

  const resend = new Resend(resendApiKey);

  // In production, this should be a verified domain (e.g., notifications@retailmind.ai).
  // For Resend sandbox/testing, we must use their test domain.
  const fromAddress = "RetailMind System <onboarding@resend.dev>";

  try {
    const response = await resend.emails.send({
      from: fromAddress,
      to: targetEmail,
      subject: subject,
      text: body,
    });

    if (response.error) {
      console.error("Resend API Error:", response.error);
      throw new Error(`Resend rejected the email: ${response.error.message}`);
    }

    return { success: true, messageId: response.data?.id };
  } catch (error: any) {
    console.error("Email Sending Failed:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

// Internal only: send an email using a stored template (scheduled by trusted backend code).
export const sendTemplateEmail = internalAction({
  args: {
    templateName: v.string(),
    targetEmail: v.string(),
    variables: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    return await sendTemplate(ctx, args.templateName, args.targetEmail, args.variables);
  },
});

/**
 * Public (super admin only): send a test rendering of a template to the CALLER's own
 * e-mail address. Rate limited per user.
 */
export const sendTemplateTestEmail = action({
  args: {
    token: v.optional(v.string()),
    templateName: v.string(),
    variables: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args): Promise<{ success: boolean; messageId?: string }> => {
    if (!args.token) throw new ConvexError("Unauthorized: Invalid session");
    const caller = await ctx.runQuery(internal.sessions.resolveAccessToken, { token: args.token });
    if (!caller) throw new ConvexError("Unauthorized: Invalid session");
    if (caller.role !== "super_admin" || caller.impersonatedBy) {
      throw new ConvexError("Access denied: Super administrator privileges required");
    }
    if (!caller.email) throw new ConvexError("Your account has no e-mail address.");

    await ctx.runMutation(internal.rateLimits.consume, {
      key: `email:user:${caller.userId}`,
      policy: "emailPerUser",
    });

    return await sendTemplate(ctx, args.templateName, caller.email, args.variables ?? {});
  },
});

// Internal only: send user credentials (scheduled by trusted backend code after an
// authorized admin creates a user). Plain-text body.
export const sendUserCredentialsEmail = internalAction({
  args: {
    targetEmail: v.string(),
    userName: v.string(),
    password: v.string(),
    orgName: v.optional(v.string()),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const gmailEmail = process.env.GMAIL_EMAIL;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailEmail || !gmailPassword) {
      console.error("GMAIL_EMAIL or GMAIL_APP_PASSWORD is not configured in the backend.");
      return { success: false };
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailEmail,
        pass: gmailPassword,
      },
    });

    const subject = `Welcome to RetailMind - Your Account Details`;
    const body = `Hello ${singleLine(args.userName)},

An administrator has created an account for you on RetailMind${args.orgName ? ` for the organization ${singleLine(args.orgName)}` : ""}.

Your Role: ${singleLine(args.role).toUpperCase()}

Your login credentials are:
Email: ${singleLine(args.targetEmail)}
Password: ${args.password}

Please log in and change your password as soon as possible.

Best regards,
The RetailMind Team`;

    try {
      const info = await transporter.sendMail({
        from: `"RetailMind System" <${gmailEmail}>`,
        to: args.targetEmail,
        subject: subject,
        text: body,
      });

      console.log("Email sent successfully: " + info.messageId);
      return { success: true };
    } catch (error: any) {
      console.error("Credentials Email Sending Failed:", error);
      return { success: false };
    }
  },
});
