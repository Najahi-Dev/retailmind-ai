"use client";

export interface POInvoicePrintData {
  poNumber: string;
  invoiceNumber?: string;
  createdAt: number;
  supplierName: string;
  supplierEmail?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  salesPersonName?: string;
  totalValue: number;
  paymentMethod?: string;
  paymentStatus?: string;
  amountPaid?: number;
  lineItems: Array<{
    productName: string;
    sku?: string;
    unitCost: number;
    quantityOrdered: number;
    lineTotal?: number;
  }>;
}

/**
 * Universal Print Helper - Sample POS/ERP Invoice Print Format
 * Renders the exact clean commercial invoice layout matching standard ERP invoice prints.
 */
export function printPOInvoiceSampleFormat(data: POInvoicePrintData) {
  if (typeof window === "undefined") return;

  const invoiceNo = data.invoiceNumber || `INV-${data.poNumber.replace(/^PO-/, "")}`;
  const dateFormatted = new Date(data.createdAt).toISOString().replace("T", " ").substring(0, 16);
  
  const totalQty = data.lineItems.reduce((acc, item) => acc + (item.quantityOrdered || 0), 0);
  const itemCount = data.lineItems.length;

  const formatNumber = (num: number) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);

  const lineRowsHtml = data.lineItems
    .map(
      (item, idx) => `
      <tr>
        <td style="padding: 8px 6px; border-bottom: 1px solid #f0f0f0;">${idx + 1}</td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #f0f0f0; font-weight: 600;">${item.productName || "Item"}</td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #f0f0f0; text-align: right;">${formatNumber(item.unitCost)}</td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #f0f0f0; text-align: center;">${item.quantityOrdered}</td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #f0f0f0; text-align: right;">0.00</td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #f0f0f0; text-align: right; font-weight: 600;">${formatNumber(item.lineTotal || item.unitCost * item.quantityOrdered)}</td>
      </tr>
    `
    )
    .join("");

  const barcodeApiUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(invoiceNo)}&scale=2&height=14&incltext=0`;

  // Create hidden print iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice #${invoiceNo}</title>
        <meta charset="utf-8">
        <style>
          @page {
            size: A4;
            margin: 20mm;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0;
            padding: 30px 40px;
            font-size: 12px;
            line-height: 1.4;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .top-brand-bar {
            display: flex;
            justify-content: flex-end;
            font-size: 11px;
            font-weight: 700;
            color: #333333;
            letter-spacing: 0.5px;
            margin-bottom: 15px;
          }
          .header-grid {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
          }
          .logo-box {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .company-title {
            font-size: 16px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0;
          }
          .company-sub {
            font-size: 11px;
            color: #555555;
            margin-top: 4px;
          }
          .invoice-heading {
            text-align: right;
          }
          .invoice-heading h1 {
            font-size: 24px;
            font-weight: 800;
            margin: 0;
            letter-spacing: -0.5px;
          }
          .invoice-heading p {
            font-size: 13px;
            font-weight: 700;
            font-family: monospace;
            margin: 2px 0 0 0;
          }
          .header-line {
            border-bottom: 1px solid #000000;
            margin: 15px 0 20px 0;
          }
          .meta-grid {
            display: flex;
            justify-content: space-between;
            margin-bottom: 24px;
            font-size: 12px;
          }
          .meta-col {
            line-height: 1.6;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .items-table th {
            border-top: 1px solid #000000;
            border-bottom: 1px solid #000000;
            padding: 8px 6px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .summary-grid {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 12px;
          }
          .breakdown-left p {
            margin: 3px 0;
          }
          .totals-right {
            width: 280px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
          }
          .subtotal-row {
            border-top: 1px solid #000000;
            padding-top: 8px;
            margin-top: 8px;
            font-weight: 700;
          }
          .grand-total-row {
            font-size: 16px;
            font-weight: 800;
            padding-top: 6px;
          }
          .terms-block {
            margin-top: 25px;
            margin-bottom: 20px;
          }
          .terms-block h4 {
            font-size: 14px;
            font-weight: 800;
            margin: 0 0 4px 0;
          }
          .terms-block p {
            font-size: 11px;
            color: #444444;
            margin: 0;
          }
          .barcode-box {
            text-align: center;
            margin: 25px 0;
          }
          .footer-box {
            text-align: center;
            font-size: 11px;
            color: #666666;
            border-top: 1px solid #e0e0e0;
            padding-top: 12px;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="top-brand-bar">
          RETAILMIND | ERP
        </div>

        <div class="header-grid">
          <div>
            <div class="logo-box">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <div>
                <h2 class="company-title">RETAILMIND (PVT) LTD</h2>
              </div>
            </div>
            <div class="company-sub">
              Address &nbsp;•&nbsp; +94779366916 &nbsp;•&nbsp; hello@retailmind.com
            </div>
          </div>

          <div class="invoice-heading">
            <h1>Invoice</h1>
            <p># ${invoiceNo}</p>
          </div>
        </div>

        <div class="header-line"></div>

        <div class="meta-grid">
          <div class="meta-col">
            <strong>Invoice to:</strong><br>
            ${data.supplierName}<br>
            ${data.supplierPhone || "+94771323880"}<br>
            ${data.supplierEmail || "supplier@gmail.com"}
          </div>

          <div class="meta-col" style="text-align: right;">
            <table style="margin-ml: auto; text-align: left; font-size: 12px;">
              <tr>
                <td style="padding-right: 20px; font-weight: 700;">Invoice No:</td>
                <td>${invoiceNo}</td>
              </tr>
              <tr>
                <td style="padding-right: 20px; font-weight: 700;">Date:</td>
                <td>${dateFormatted}</td>
              </tr>
            </table>
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 5%; text-align: left;">#</th>
              <th style="width: 45%; text-align: left;">ITEM</th>
              <th style="width: 15%; text-align: right;">RATE</th>
              <th style="width: 10%; text-align: center;">QTY</th>
              <th style="width: 10%; text-align: right;">DISCOUNT</th>
              <th style="width: 15%; text-align: right;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${lineRowsHtml}
          </tbody>
        </table>

        <div class="summary-grid">
          <div class="breakdown-left">
            <p><strong>No of Items:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${itemCount}</p>
            <p><strong>Total Quantity:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${totalQty}</p>
            <p><strong>Sales Person:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${data.salesPersonName || "Najahi"}</p>
            <p><strong>Payment Method:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${data.paymentMethod || 'N/A'}</p>
            <p><strong>Payment Status:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${data.paymentStatus || 'N/A'}</p>
            <br>
            <p><strong>Paid:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${formatNumber(data.amountPaid ?? 0)}</p>
            <p><strong>Due:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${formatNumber(data.totalValue - (data.amountPaid ?? 0))}</p>
          </div>

          <div class="totals-right">
            <div class="totals-row subtotal-row">
              <span>Sub Total:</span>
              <span>${formatNumber(data.totalValue)}</span>
            </div>
            <div class="totals-row grand-total-row">
              <span>Grand Total:</span>
              <span>${formatNumber(data.totalValue)}</span>
            </div>
          </div>
        </div>

        <div class="terms-block">
          <h4>Thank you for your business</h4>
          <p><strong>Terms & Conditions:</strong> The invoice was created on a computer and is valid without the signature and seal.</p>
        </div>

        <div class="barcode-box">
          <img src="${barcodeApiUrl}" alt="Barcode ${invoiceNo}" style="max-width: 320px; height: 55px; margin: 0 auto; display: block;" />
        </div>

        <div class="footer-box">
          Software: <a href="https://softlenz.com" target="_blank" style="color: #000; text-decoration: underline;">retailmind.com</a> | +94 77 93 66 916
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1500);
  }, 250);
}

/**
 * Standard Print Helper for DOM elements
 */
export function printElement(elementId: string, documentTitle: string = "Commercial Document") {
  if (typeof window === "undefined") return;

  const targetEl = document.getElementById(elementId);
  if (!targetEl) {
    window.print();
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${documentTitle}</title>
        <meta charset="utf-8">
        <style>
          *, *::before, *::after { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #ffffff !important; color: #0f172a !important; margin: 0; padding: 24px; }
          .p-5 { padding: 1.25rem; } .sm\\:p-8 { padding: 2rem; } .space-y-6 > * + * { margin-top: 1.5rem; }
          .space-y-3 > * + * { margin-top: 0.75rem; } .space-y-2 > * + * { margin-top: 0.5rem; } .space-y-1 > * + * { margin-top: 0.25rem; }
          .flex { display: flex; } .flex-col { flex-direction: column; } .flex-row { flex-direction: row; } .items-center { align-items: center; }
          .justify-between { justify-content: space-between; } .justify-center { justify-content: center; } .grid { display: grid; }
          .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); } .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .gap-4 { gap: 1rem; } .gap-6 { gap: 1.5rem; } .border-b { border-bottom: 1px solid #e2e8f0; } .border-t { border-top: 1px solid #e2e8f0; }
          .border { border: 1px solid #e2e8f0; } .rounded-xl { border-radius: 0.75rem; } .rounded-2xl { border-radius: 1rem; }
          .bg-slate-50 { background-color: #f8fafc; } .p-4 { padding: 1rem; } .p-3 { padding: 0.75rem; }
          .text-xs { font-size: 0.75rem; } .text-sm { font-size: 0.875rem; } .text-base { font-size: 1rem; } .text-lg { font-size: 1.125rem; } .text-xl { font-size: 1.25rem; } .text-2xl { font-size: 1.5rem; }
          .font-bold { font-weight: 700; } .font-extrabold { font-weight: 800; } .font-semibold { font-weight: 600; } .font-mono { font-family: monospace; }
          .uppercase { text-transform: uppercase; } .text-slate-400 { color: #94a3b8; } .text-slate-500 { color: #64748b; } .text-slate-600 { color: #475569; } .text-slate-900 { color: #0f172a; } .text-indigo-600 { color: #4f46e5; }
          .text-right { text-align: right; } .text-center { text-align: center; } .w-full { width: 100%; }
          table { width: 100%; border-collapse: collapse; margin-top: 1rem; margin-bottom: 1rem; }
          th, td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 0.8rem; }
          th { background: #f1f5f9; text-align: left; font-weight: 700; color: #334155; }
          svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
        </style>
      </head>
      <body>
        ${targetEl.outerHTML}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1500);
  }, 250);
}
