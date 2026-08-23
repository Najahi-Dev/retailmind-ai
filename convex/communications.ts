"use node";
import { action, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Resend } from "resend";
import nodemailer from "nodemailer";



// Main action to send an email using a stored template
export const sendTemplateEmail = action({
  args: {
    templateName: v.string(),
    targetEmail: v.string(),
    variables: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    const template = await ctx.runQuery(internal.communicationsQueries.getTemplateByName, { name: args.templateName });
    
    if (!template) {
      throw new Error(`Template '${args.templateName}' not found.`);
    }
    if (!template.isActive) {
      throw new Error(`Template '${args.templateName}' is currently drafted/inactive.`);
    }
    if (template.channel !== "email") {
      throw new Error(`Template '${args.templateName}' is not configured for the email channel.`);
    }

    // Replace variables in subject and body
    let subject = template.subjectTemplate || "Notification from RetailMind";
    let body = template.bodyTemplate || "";

    for (const [key, value] of Object.entries(args.variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    }

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
        to: args.targetEmail,
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
});

// Direct action to send user credentials (used when an admin creates a new user)
export const sendUserCredentialsEmail = action({
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
    const body = `Hello ${args.userName},

An administrator has created an account for you on RetailMind${args.orgName ? ` for the organization ${args.orgName}` : ''}.

Your Role: ${args.role.toUpperCase()}

Your login credentials are:
Email: ${args.targetEmail}
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
  }
});
