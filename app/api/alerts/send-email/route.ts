// app/api/alerts/send-email/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      email,
      subject,
      alertType = "low_stock",
      priority = "high",
      message = "Inventory threshold alert triggered",
      productName,
      sku,
    } = body;

    const apiKey = process.env.RESEND_API_KEY;

    const priorityColors: Record<string, string> = {
      critical: "#ef4444",
      high: "#f97316",
      medium: "#eab308",
      low: "#64748b",
    };

    const badgeColor = priorityColors[priority] ?? "#64748b";

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
              <div class="badge">${priority} Priority • ${alertType.replace("_", " ")}</div>
            </div>
            <div class="content">
              <div class="message">${message}</div>
              ${
                productName
                  ? `
                <div class="product-box">
                  <div class="product-title">${productName}</div>
                  ${sku ? `<div class="product-sku">SKU: ${sku}</div>` : ""}
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

    if (!apiKey || apiKey === "re_dummy") {
      console.log(`[Email Alert Mock Send] To: ${email ?? "admin@retailmind.ai"}, Subject: ${subject ?? message}`);
      return NextResponse.json({
        success: true,
        delivered: true,
        mock: true,
        message: "Email alert notification logged (Resend API key pending in env)",
      });
    }

    const resend = new Resend(apiKey);

    const data = await resend.emails.send({
      from: "RetailMind AI Alerts <alerts@retailmind.ai>",
      to: email ? [email] : ["admin@retailmind.ai"],
      subject: subject ?? `[${priority.toUpperCase()}] ${message}`,
      html: htmlContent,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Failed to send alert email notification:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email notification" },
      { status: 500 }
    );
  }
}
