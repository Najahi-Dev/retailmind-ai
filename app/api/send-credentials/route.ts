// app/api/send-credentials/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, password, role } = body;

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
              <div class="message">Hello ${name},</div>
              <p>An administrator has created a RetailMind AI account for you with the role of <strong>${role}</strong>.</p>
              <p>You can use the following credentials to sign in to your workspace:</p>
              <div class="credentials-box">
                <div><strong>Email:</strong> ${email}</div>
                <div style="margin-top: 8px;"><strong>Temporary Password:</strong> ${password}</div>
              </div>
              <p style="font-size: 13px; color: #64748b; margin: 0;">
                For security reasons, we highly recommend changing your password after you log in for the first time.
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
      console.log(`[Email Credentials Mock Send] To: ${email}, Role: ${role}, Pwd: ${password}`);
      return NextResponse.json({
        success: true,
        delivered: false,
        mock: true,
        message: "Email logged. Configure GMAIL_EMAIL and GMAIL_APP_PASSWORD in .env.local to send real emails.",
      });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: userEmail,
        pass: userPass,
      },
      connectionTimeout: 10000, // 10 seconds timeout
      socketTimeout: 10000,
    });

    const info = await transporter.sendMail({
      from: `"RetailMind AI" <${userEmail}>`,
      to: email,
      subject: "Welcome to RetailMind AI - Your Account Credentials",
      html: htmlContent,
    });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("Failed to send credentials email:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email notification" },
      { status: 500 }
    );
  }
}
