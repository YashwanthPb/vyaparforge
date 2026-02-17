import { type InvoiceData, formatINRPlain } from "./types";

export function ClassicInvoice({ data }: { data: InvoiceData }) {
  return (
    <div className="classic-invoice bg-white text-black" style={{ fontFamily: "'Times New Roman', Georgia, serif", fontSize: "11px", lineHeight: 1.4 }}>
      {/* Outer border */}
      <div style={{ border: "2px solid #000", padding: "0" }}>
        {/* Company Header */}
        <div style={{ borderBottom: "2px solid #000", padding: "12px 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0, letterSpacing: "1px", textTransform: "uppercase" }}>
            {data.seller.name}
          </h1>
          <p style={{ fontSize: "10px", margin: "2px 0 0", color: "#333" }}>
            {data.seller.address}, {data.seller.city} - {data.seller.pincode}
          </p>
          <p style={{ fontSize: "10px", margin: "1px 0 0", color: "#333" }}>
            Phone: {data.seller.phone} | Email: {data.seller.email}
          </p>
        </div>

        {/* TAX INVOICE label */}
        <div style={{ borderBottom: "1px solid #000", padding: "6px 0", textAlign: "center", backgroundColor: "#f5f5f5" }}>
          <h2 style={{ fontSize: "14px", fontWeight: "bold", margin: 0, letterSpacing: "2px", textTransform: "uppercase" }}>
            Tax Invoice
          </h2>
        </div>

        {/* Seller & Buyer two-column layout */}
        <div style={{ display: "flex", borderBottom: "1px solid #000" }}>
          {/* Left - Seller Details */}
          <div style={{ flex: 1, padding: "8px 12px", borderRight: "1px solid #000" }}>
            <p style={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>Supplier Details</p>
            <p style={{ fontWeight: "bold", fontSize: "12px" }}>{data.seller.name}</p>
            <p>{data.seller.address}</p>
            <p>{data.seller.city} - {data.seller.pincode}</p>
            <p>State: {data.seller.state} | Code: {data.seller.stateCode}</p>
            <p><strong>GSTIN:</strong> {data.seller.gstin}</p>
            <p><strong>PAN:</strong> {data.seller.pan}</p>
          </div>
          {/* Right - Buyer Details */}
          <div style={{ flex: 1, padding: "8px 12px" }}>
            <p style={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>Buyer Details</p>
            <p style={{ fontWeight: "bold", fontSize: "12px" }}>{data.buyer.name}</p>
            {data.buyer.division && <p>{data.buyer.division}</p>}
            <p>{data.buyer.address}, {data.buyer.city}</p>
            <p>State: {data.buyer.state} | Code: {data.buyer.stateCode}</p>
            <p><strong>GSTIN:</strong> {data.buyer.gstin}</p>
            <p><strong>Place of Supply:</strong> {data.placeOfSupply}</p>
          </div>
        </div>

        {/* Invoice metadata row */}
        <div style={{ display: "flex", borderBottom: "1px solid #000", fontSize: "10px" }}>
          <div style={{ flex: 1, padding: "6px 12px", borderRight: "1px solid #000" }}>
            <strong>Invoice No:</strong> {data.invoiceNumber}
          </div>
          <div style={{ flex: 1, padding: "6px 12px", borderRight: "1px solid #000" }}>
            <strong>Date:</strong> {data.date}
          </div>
          <div style={{ flex: 1, padding: "6px 12px", borderRight: "1px solid #000" }}>
            <strong>PO Reference:</strong> {data.poReference}
          </div>
          <div style={{ flex: 1, padding: "6px 12px" }}>
            <strong>Delivery Note:</strong> {data.deliveryNote || "—"}
          </div>
        </div>

        {/* Additional reference row */}
        <div style={{ display: "flex", borderBottom: "1px solid #000", fontSize: "10px" }}>
          <div style={{ flex: 1, padding: "6px 12px", borderRight: "1px solid #000" }}>
            <strong>Work Order:</strong> {data.workOrderRef || "—"}
          </div>
          <div style={{ flex: 1, padding: "6px 12px" }}>
            <strong>Batch Number:</strong> {data.batchNumberRef || "—"}
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5" }}>
              <th style={thStyle({ width: "35px", textAlign: "center" })}>S.No</th>
              <th style={thStyle({ width: "100px" })}>Part Number</th>
              <th style={thStyle({})}>Description</th>
              <th style={thStyle({ width: "70px" })}>HSN/SAC</th>
              <th style={thStyle({ width: "80px" })}>Work Order</th>
              <th style={thStyle({ width: "50px", textAlign: "right" })}>Qty</th>
              <th style={thStyle({ width: "40px", textAlign: "center" })}>Unit</th>
              <th style={thStyle({ width: "75px", textAlign: "right" })}>Rate (₹)</th>
              <th style={thStyle({ width: "85px", textAlign: "right", borderRight: "none" })}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={item.sno} style={{ backgroundColor: i % 2 === 1 ? "#fafafa" : "#fff" }}>
                <td style={tdStyle({ textAlign: "center" })}>{item.sno}</td>
                <td style={tdStyle({ fontWeight: "bold" })}>{item.partNumber}</td>
                <td style={tdStyle({})}>{item.description}</td>
                <td style={tdStyle({})}>{item.hsnSac}</td>
                <td style={tdStyle({})}>{item.workOrder || "—"}</td>
                <td style={tdStyle({ textAlign: "right" })}>{item.qty}</td>
                <td style={tdStyle({ textAlign: "center" })}>{item.unit}</td>
                <td style={tdStyle({ textAlign: "right" })}>{formatINRPlain(item.rate)}</td>
                <td style={tdStyle({ textAlign: "right", borderRight: "none" })}>{formatINRPlain(item.amount)}</td>
              </tr>
            ))}
            {/* Empty rows to fill space for short invoices */}
            {data.items.length < 5 && Array.from({ length: 5 - data.items.length }).map((_, i) => (
              <tr key={`empty-${i}`} style={{ backgroundColor: (data.items.length + i) % 2 === 1 ? "#fafafa" : "#fff" }}>
                <td style={tdStyle({ textAlign: "center" })}>&nbsp;</td>
                <td style={tdStyle({})}>&nbsp;</td>
                <td style={tdStyle({})}>&nbsp;</td>
                <td style={tdStyle({})}>&nbsp;</td>
                <td style={tdStyle({})}>&nbsp;</td>
                <td style={tdStyle({ textAlign: "right" })}>&nbsp;</td>
                <td style={tdStyle({ textAlign: "center" })}>&nbsp;</td>
                <td style={tdStyle({ textAlign: "right" })}>&nbsp;</td>
                <td style={tdStyle({ textAlign: "right", borderRight: "none" })}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tax Summary */}
        <div style={{ borderTop: "2px solid #000" }}>
          <div style={{ display: "flex" }}>
            {/* Amount in words - left */}
            <div style={{ flex: 1, padding: "8px 12px", borderRight: "1px solid #000" }}>
              <p style={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>Amount in Words</p>
              <p style={{ fontSize: "11px", fontStyle: "italic" }}>{data.amountInWords}</p>
            </div>
            {/* Tax breakdown - right */}
            <div style={{ width: "280px", padding: "0" }}>
              <div style={summaryRowStyle}>
                <span>Taxable Amount</span>
                <span style={{ fontWeight: "bold" }}>₹ {formatINRPlain(data.subtotal)}</span>
              </div>
              {data.cgst > 0 && (
                <div style={summaryRowStyle}>
                  <span>CGST @ 9%</span>
                  <span>₹ {formatINRPlain(data.cgst)}</span>
                </div>
              )}
              {data.sgst > 0 && (
                <div style={summaryRowStyle}>
                  <span>SGST @ 9%</span>
                  <span>₹ {formatINRPlain(data.sgst)}</span>
                </div>
              )}
              {data.igst > 0 && (
                <div style={summaryRowStyle}>
                  <span>IGST @ 18%</span>
                  <span>₹ {formatINRPlain(data.igst)}</span>
                </div>
              )}
              <div style={summaryRowStyle}>
                <span>Total Tax</span>
                <span>₹ {formatINRPlain(data.totalTax)}</span>
              </div>
              <div style={{ ...summaryRowStyle, backgroundColor: "#f5f5f5", fontWeight: "bold", fontSize: "13px", borderBottom: "none" }}>
                <span>Grand Total</span>
                <span>₹ {formatINRPlain(data.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div style={{ borderTop: "1px solid #000", display: "flex" }}>
          <div style={{ flex: 1, padding: "8px 12px", borderRight: "1px solid #000" }}>
            <p style={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>Bank Details</p>
            <p><strong>Bank:</strong> {data.seller.bankName}</p>
            <p><strong>Branch:</strong> {data.seller.bankBranch}</p>
            <p><strong>A/c No:</strong> {data.seller.accountNumber}</p>
            <p><strong>IFSC:</strong> {data.seller.ifscCode}</p>
          </div>
          <div style={{ flex: 1, padding: "8px 12px" }}>
            <p style={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>Terms & Conditions</p>
            <p>1. Payment due within 30 days of invoice date.</p>
            <p>2. Goods once sold will not be taken back.</p>
            <p>3. Subject to Bengaluru jurisdiction only.</p>
          </div>
        </div>

        {/* Footer - Signature */}
        <div style={{ borderTop: "2px solid #000", display: "flex" }}>
          <div style={{ flex: 1, padding: "8px 12px", borderRight: "1px solid #000", textAlign: "center" }}>
            <p style={{ fontSize: "9px", color: "#666", marginBottom: "40px" }}>Receiver&apos;s Signature & Stamp</p>
            <p style={{ borderTop: "1px dashed #999", paddingTop: "4px", fontSize: "10px" }}>Authorized Signatory</p>
          </div>
          <div style={{ flex: 1, padding: "8px 12px", textAlign: "center" }}>
            <p style={{ fontSize: "10px", fontWeight: "bold", marginBottom: "36px" }}>For {data.seller.name}</p>
            <p style={{ borderTop: "1px dashed #999", paddingTop: "4px", fontSize: "10px" }}>Authorised Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Style helpers ──────────────────────────────────────────────────
function thStyle(extra: Record<string, string | undefined>): React.CSSProperties {
  return {
    padding: "6px 8px",
    borderBottom: "1px solid #000",
    borderRight: "1px solid #000",
    fontSize: "10px",
    fontWeight: "bold",
    textTransform: "uppercase",
    textAlign: "left",
    ...extra,
  } as React.CSSProperties;
}

function tdStyle(extra: Record<string, string | undefined>): React.CSSProperties {
  return {
    padding: "5px 8px",
    borderBottom: "1px solid #ddd",
    borderRight: "1px solid #ddd",
    fontSize: "10.5px",
    verticalAlign: "top",
    ...extra,
  } as React.CSSProperties;
}

const summaryRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "4px 12px",
  borderBottom: "1px solid #ddd",
  fontSize: "10.5px",
};
