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
} from "../_lib/guard";

const money = z.number().finite().nonnegative().max(1e12);
const shortText = z.string().trim().max(200);

const bodySchema = z.object({
  recipientEmail: z.string().trim().email().max(254).optional(),
  invoiceNumber: z.string().trim().max(64).optional(),
  poNumber: z.string().trim().max(64).nullish(),
  supplierName: shortText.nullish(),
  supplierEmail: z.string().trim().email().max(254).nullish().or(z.literal("")),
  supplierPhone: z.string().trim().max(50).nullish(),
  supplierAddress: z.string().trim().max(500).nullish(),
  totalValue: money.optional(),
  lineItems: z
    .array(
      z.object({
        productName: shortText.nullish(),
        sku: z.string().trim().max(100).nullish(),
        productSku: z.string().trim().max(100).nullish(),
        unitCost: money.optional(),
        quantityOrdered: z.number().int().nonnegative().max(1e9).optional(),
        lineTotal: money.optional(),
      }),
    )
    .max(500)
    .default([]),
});

export async function POST(req: Request) {
  try {
    const auth = await requireCaller(req, ["admin", "manager"]);
    if ("response" in auth) return auth.response;
    const { caller, token } = auth;

    const parsed = bodySchema.safeParse(await readJson(req));
    if (!parsed.success) return jsonError(400, "Invalid request body");
    const {
      recipientEmail,
      invoiceNumber,
      poNumber,
      supplierName,
      supplierEmail,
      supplierPhone,
      supplierAddress,
      totalValue,
      lineItems,
    } = parsed.data;

    const client = getConvexServerClient();
    const limited = await enforceRateLimit(client, req, "send-invoice", caller.id);
    if (limited) return limited;

    const email = recipientEmail || supplierEmail;
    if (!email) return jsonError(400, "Recipient email is required");
    if (
      !(await isAllowedRecipient(client, token, caller, email, { orgUsers: true, orgSuppliers: true }))
    ) {
      return jsonError(403, "Recipient must be a supplier or member of your organization");
    }

    const invoiceNo = invoiceNumber || `INV-${poNumber?.replace(/^PO-/, "") || "1001"}`;
    const dateStr = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const formattedTotalLKR = `LKR ${Number(totalValue || 0).toLocaleString("en-LK")}`;

    // Item specification table rows matching exact UI layout
    const lineItemsHtml = lineItems
      .map((item) => {
        const lineTotalLKR = `LKR ${Number(item.lineTotal || (item.unitCost ?? 0) * (item.quantityOrdered ?? 0) || 0).toLocaleString("en-LK")}`;
        const unitCostLKR = `LKR ${Number(item.unitCost || 0).toLocaleString("en-LK")}`;
        return `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td class="table-cell-mobile" style="padding: 10px; font-weight: 700; color: #0f172a;">${escapeHtml(item.productName || "Purchase Item")}</td>
            <td class="table-cell-mobile" style="padding: 10px; font-family: monospace; color: #64748b;">${escapeHtml(item.sku || item.productSku || "SKU-ITEM")}</td>
            <td class="table-cell-mobile" style="padding: 10px; text-align: right; font-family: monospace; color: #475569;">${escapeHtml(unitCostLKR)}</td>
            <td class="table-cell-mobile" style="padding: 10px; text-align: center; font-weight: 700; color: #0f172a;">${escapeHtml(item.quantityOrdered || 1)}</td>
            <td class="table-cell-mobile" style="padding: 10px; text-align: right; font-family: monospace; font-weight: 700; color: #4f46e5;">${escapeHtml(lineTotalLKR)}</td>
          </tr>
        `;
      })
      .join("");

    // Barcode API image URL for Code128
    const barcodeImageUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(invoiceNo)}&scale=2&height=12&incltext=0`;

    // 100% Mobile Responsive HTML Email Body
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Commercial Invoice ${escapeHtml(invoiceNo)}</title>
        <style>
          /* Global & Client Reset */
          body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
          table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
          
          /* Responsive Mobile Breakpoints */
          @media only screen and (max-width: 600px) {
            .email-container {
              width: 100% !important;
              max-width: 100% !important;
              padding: 16px !important;
              border-radius: 12px !important;
            }
            .stack-column {
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              box-sizing: border-box !important;
              margin-bottom: 12px !important;
            }
            .mobile-text-left {
              text-align: left !important;
            }
            .mobile-mt-12 {
              margin-top: 12px !important;
            }
            .table-cell-mobile {
              padding: 8px 4px !important;
              font-size: 11px !important;
            }
            .barcode-img {
              max-width: 180px !important;
            }
            .header-title-mobile {
              font-size: 20px !important;
            }
          }
        </style>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 16px; color: #0f172a;">
        <div class="email-container" style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); padding: 28px; box-sizing: border-box;">
          
          <!-- Header Row: High-Res Logo & Invoice Title -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px;">
            <tr>
              <td class="stack-column" style="vertical-align: top; text-align: left;">
                <table style="border-collapse: collapse;">
                  <tr>
                    <td style="vertical-align: middle; padding-right: 10px;">
                      <div style="width: 38px; height: 38px; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border-radius: 12px; text-align: center; line-height: 38px; color: #ffffff; font-size: 18px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.25); border: 1px solid rgba(255,255,255,0.1);">
                        🧠
                      </div>
                    </td>
                    <td style="vertical-align: middle;">
                      <span style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">RetailMind</span>
                      <span style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 8px; margin-left: 6px; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(99,102,241,0.3);">AI</span>
                    </td>
                  </tr>
                </table>
                <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b; font-weight: 500;">
                  Supermarket Retail Network • Colombo, Sri Lanka
                </p>
              </td>
              <td class="stack-column mobile-text-left mobile-mt-12" style="vertical-align: top; text-align: right;">
                <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #4f46e5; display: block; margin-bottom: 4px;">
                  TAX COMMERCIAL INVOICE
                </span>
                <h1 class="header-title-mobile" style="margin: 0; font-size: 22px; font-family: monospace; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
                  ${escapeHtml(invoiceNo)}
                </h1>
                <p style="margin: 4px 0 0 0; font-size: 12px; font-family: monospace; color: #64748b;">
                  Date: ${escapeHtml(dateStr)} • PO Ref: ${escapeHtml(poNumber ?? "")}
                </p>
              </td>
            </tr>
          </table>

          <!-- 2-Column Responsive Grid: Billing & Vendor Info -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td class="stack-column" style="width: 50%; vertical-align: top; padding-right: 8px; box-sizing: border-box;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; min-height: 120px;">
                  <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; display: block; margin-bottom: 6px;">
                    BILLED TO (CUSTOMER / RETAILER)
                  </span>
                  <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #0f172a;">RetailMind AI Store Operations</p>
                  <p style="margin: 0 0 2px 0; font-size: 11px; color: #475569;">Main Commercial Warehouse, Branch #01</p>
                  <p style="margin: 0 0 4px 0; font-size: 11px; color: #475569;">No. 142 Galle Road, Colombo 03, Sri Lanka</p>
                  <p style="margin: 0; font-size: 10px; font-family: monospace; color: #64748b; word-break: break-all;">ops@retailmind.lk • +94 11 755 8800</p>
                </div>
              </td>
              <td class="stack-column" style="width: 50%; vertical-align: top; padding-left: 8px; box-sizing: border-box;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; min-height: 120px;">
                  <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; display: block; margin-bottom: 6px;">
                    ISSUED BY (VENDOR SUPPLIER)
                  </span>
                  <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #4f46e5;">${escapeHtml(supplierName || "Vendor Supplier Facilities")}</p>
                  <p style="margin: 0 0 2px 0; font-size: 11px; color: #475569;">${escapeHtml(supplierAddress || "Vendor Supplier Facilities")}</p>
                  <p style="margin: 0 0 2px 0; font-size: 10px; font-family: monospace; color: #64748b; word-break: break-all;">Email: ${escapeHtml(supplierEmail || email)}</p>
                  <p style="margin: 0; font-size: 10px; font-family: monospace; color: #64748b;">Phone: ${escapeHtml(supplierPhone || "+94 11 200 4455")}</p>
                </div>
              </td>
            </tr>
          </table>

          <!-- Line Items Table -->
          <div style="border: 1px solid #e2e8f0; border-radius: 14px; overflow-x: auto; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; min-width: 100%;">
              <thead>
                <tr style="background: #f8fafc; color: #475569; font-weight: 700; border-bottom: 1px solid #e2e8f0;">
                  <th class="table-cell-mobile" style="padding: 10px;">Item Specification</th>
                  <th class="table-cell-mobile" style="padding: 10px;">SKU</th>
                  <th class="table-cell-mobile" style="padding: 10px; text-align: right;">Unit Price</th>
                  <th class="table-cell-mobile" style="padding: 10px; text-align: center;">Qty</th>
                  <th class="table-cell-mobile" style="padding: 10px; text-align: right;">Total (LKR)</th>
                </tr>
              </thead>
              <tbody>
                ${lineItemsHtml}
              </tbody>
            </table>
          </div>

          <!-- Bottom Responsive Grid: Barcode & Financial Calculation -->
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <!-- Barcode Box -->
              <td class="stack-column" style="width: 50%; vertical-align: bottom; padding-right: 8px; box-sizing: border-box;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; text-align: center;">
                  <div style="background: #ffffff; padding: 10px; border-radius: 10px; border: 1px solid #e2e8f0; display: inline-block; margin-bottom: 6px;">
                    <img class="barcode-img" src="${escapeHtml(barcodeImageUrl)}" alt="Barcode ${escapeHtml(invoiceNo)}" style="max-width: 200px; height: 42px; display: block; margin: 0 auto;" />
                    <span style="font-family: monospace; font-size: 10px; font-weight: 700; color: #0f172a; display: block; margin-top: 4px;">${escapeHtml(invoiceNo)}</span>
                  </div>
                  <p style="margin: 0; font-size: 9px; font-family: monospace; color: #94a3b8;">
                    Official RetailMind Invoice Verification Code
                  </p>
                </div>
              </td>

              <!-- Financial Totals Box -->
              <td class="stack-column" style="width: 50%; vertical-align: bottom; padding-left: 8px; box-sizing: border-box;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                    <tr>
                      <td style="padding: 3px 0; color: #64748b;">Subtotal (Net Amount):</td>
                      <td style="padding: 3px 0; text-align: right; font-family: monospace; font-weight: 600; color: #0f172a;">${escapeHtml(formattedTotalLKR)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 3px 0; color: #64748b;">VAT / NBT Tax (0% Exempt):</td>
                      <td style="padding: 3px 0; text-align: right; font-family: monospace; font-weight: 600; color: #0f172a;">LKR 0</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0 0 0; border-top: 1px solid #e2e8f0; font-weight: 800; font-size: 12px; color: #4f46e5;">Invoice Grand Total:</td>
                      <td style="padding: 8px 0 0 0; border-top: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: 800; font-size: 14px; color: #4f46e5;">${escapeHtml(formattedTotalLKR)}</td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
          </table>

        </div>
      </body>
      </html>
    `;

    const subject = headerSafe(`[Commercial Invoice] ${invoiceNo} for ${poNumber ?? ""}`);

    // ── 1. Dispatch via Resend ──
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const { error } = await resend.emails.send({
        from: "RetailMind AI <onboarding@resend.dev>",
        to: [email],
        subject,
        html: htmlContent,
      });
      if (error) {
        console.error("Resend invoice email error:", error);
        return jsonError(502, "Failed to dispatch email");
      }
      return NextResponse.json({ success: true, provider: "resend" });
    }

    // ── 2. Dispatch via Brevo HTTP API ──
    const brevoApiKey = process.env.BREVO_API_KEY;
    if (brevoApiKey) {
      const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": brevoApiKey,
        },
        body: JSON.stringify({
          sender: { name: "RetailMind AI", email: "billing@retailmind.lk" },
          to: [{ email }],
          subject,
          htmlContent,
        }),
      });
      if (!brevoRes.ok) {
        console.error("Brevo invoice email error:", brevoRes.status);
        return jsonError(502, "Failed to dispatch email");
      }
      return NextResponse.json({ success: true, provider: "brevo" });
    }

    // No provider configured.
    return NextResponse.json({
      success: true,
      provider: "prepared",
      delivered: false,
      recipientEmail: email,
      message: `Commercial Invoice ${invoiceNo} prepared (no e-mail provider configured)`,
    });
  } catch (err) {
    const { status, message } = convexErrorResponse(err, "Failed to dispatch email");
    return jsonError(status, message);
  }
}
