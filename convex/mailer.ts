"use node";
import { action } from "./_generated/server";
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

export const sendWorkspaceUserInviteEmail = action({
  args: {
    toEmail: v.string(),
    toName: v.string(),
    inviterName: v.string(),
    inviterEmail: v.string(),
    workspaceName: v.string(),
    temporaryPassword: v.string(),
    loginUrl: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const transporter = getTransporter();
      const user = process.env.GMAIL_USER || process.env.GMAIL_EMAIL;

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
              <h2>Join ${args.workspaceName}</h2>
            </div>
            <div class="content">
              <p>Hi ${args.toName},</p>
              <p><strong>${args.inviterName}</strong> has invited you to join their workspace <strong>${args.workspaceName}</strong> on RetailMind AI.</p>
              
              <div class="password-block">
                <p class="password-label">Your temporary password</p>
                <p class="password-value">${args.temporaryPassword}</p>
              </div>
              
              <div class="button-container">
                <a href="${args.loginUrl}" class="button">Login to Workspace</a>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0;">Replies to this email will be sent directly to ${args.inviterName} (${args.inviterEmail})</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const fromField = `"${args.inviterName} from ${args.workspaceName} (RetailMind AI)" <${user}>`;

      const info = await transporter.sendMail({
        from: fromField,
        to: args.toEmail,
        replyTo: args.inviterEmail,
        subject: `You've been invited to join ${args.workspaceName}`,
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
