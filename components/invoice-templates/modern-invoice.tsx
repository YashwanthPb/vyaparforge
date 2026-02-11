import { type InvoiceData, formatINRPlain } from "./types";

const ACCENT = "#1A237E";
const ACCENT_LIGHT = "#E8EAF6";
const ACCENT_MID = "#3F51B5";

export function ModernInvoice({ data }: { data: InvoiceData }) {
  return (
    <div className="modern-invoice bg-white text-black" style={{ fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif", fontSize: "11px", lineHeight: 1.5 }}>
      {/* Header Bar */}
      <div style={{ backgroundColor: ACCENT, color: "#fff", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "6px 6px 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* Logo placeholder */}
          <div style={{ width: "48px", height: "48px", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "bold", letterSpacing: "1px" }}>
            SSI
          </div>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: "700", margin: 0, letterSpacing: "0.5px" }}>{data.seller.name}</h1>
            <p style={{ fontSize: "10px", margin: "2px 0 0", opacity: 0.8 }}>{data.seller.tagline}</p>
          </div>
        </div>
        <div style={{ backgroundColor: "rgba(255,255,255,0.2)", padding: "6px 16px", borderRadius: "4px", fontSize: "13px", fontWeight: "700", letterSpacing: "1px" }}>
          TAX INVOICE
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "20px 24px", border: "1px solid #e0e0e0", borderTop: "none", borderRadius: "0 0 6px 6px" }}>
        {/* Invoice meta */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "24px", fontSize: "10.5px" }}>
            <div>
              <span style={{ color: "#999", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Invoice No</span>
              <p style={{ fontWeight: "600", margin: "2px 0 0", fontSize: "12px", color: ACCENT }}>{data.invoiceNumber}</p>
            </div>
            <div>
              <span style={{ color: "#999", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Date</span>
              <p style={{ fontWeight: "600", margin: "2px 0 0" }}>{data.date}</p>
            </div>
            <div>
              <span style={{ color: "#999", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.5px" }}>PO Reference</span>
              <p style={{ fontWeight: "600", margin: "2px 0 0" }}>{data.poReference}</p>
            </div>
            <div>
              <span style={{ color: "#999", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Place of Supply</span>
              <p style={{ fontWeight: "600", margin: "2px 0 0" }}>{data.placeOfSupply}</p>
            </div>
          </div>
        </div>

        {/* Seller & Buyer Cards */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
          <div style={{ flex: 1, border: "1px solid #e0e0e0", borderRadius: "8px", padding: "12px 16px", backgroundColor: "#fafafa" }}>
            <p style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", color: ACCENT, letterSpacing: "0.5px", marginBottom: "6px" }}>From</p>
            <p style={{ fontWeight: "700", fontSize: "12px" }}>{data.seller.name}</p>
            <p style={{ color: "#555" }}>{data.seller.address}</p>
            <p style={{ color: "#555" }}>{data.seller.city} - {data.seller.pincode}</p>
            <p style={{ color: "#555" }}>State: {data.seller.state} ({data.seller.stateCode})</p>
            <p style={{ marginTop: "4px" }}><strong>GSTIN:</strong> {data.seller.gstin}</p>
            <p><strong>PAN:</strong> {data.seller.pan}</p>
          </div>
          <div style={{ flex: 1, border: "1px solid #e0e0e0", borderRadius: "8px", padding: "12px 16px", backgroundColor: "#fafafa" }}>
            <p style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", color: ACCENT, letterSpacing: "0.5px", marginBottom: "6px" }}>Bill To</p>
            <p style={{ fontWeight: "700", fontSize: "12px" }}>{data.buyer.name}</p>
            <p style={{ color: "#555" }}>{data.buyer.division}</p>
            <p style={{ color: "#555" }}>{data.buyer.address}, {data.buyer.city}</p>
            <p style={{ color: "#555" }}>State: {data.buyer.state} ({data.buyer.stateCode})</p>
            <p style={{ marginTop: "4px" }}><strong>GSTIN:</strong> {data.buyer.gstin}</p>
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
          <thead>
            <tr>
              <th style={modThStyle({ width: "32px", textAlign: "center" })}>S.No</th>
              <th style={modThStyle({ width: "90px" })}>Part No.</th>
              <th style={modThStyle({})}>Description</th>
              <th style={modThStyle({ width: "65px" })}>HSN/SAC</th>
              <th style={modThStyle({ width: "75px" })}>Work Order</th>
              <th style={modThStyle({ width: "50px", textAlign: "right" })}>Qty</th>
              <th style={modThStyle({ width: "70px", textAlign: "right" })}>Rate (₹)</th>
              <th style={modThStyle({ width: "80px", textAlign: "right" })}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={item.sno} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f8f9ff" }}>
                <td style={modTdStyle({ textAlign: "center" })}>{item.sno}</td>
                <td style={modTdStyle({ fontWeight: "600" })}>{item.partNumber}</td>
                <td style={modTdStyle({})}>{item.description}</td>
                <td style={modTdStyle({})}>{item.hsnSac}</td>
                <td style={modTdStyle({})}>{item.workOrder || "—"}</td>
                <td style={modTdStyle({ textAlign: "right" })}>{item.qty} {item.unit}</td>
                <td style={modTdStyle({ textAlign: "right" })}>{formatINRPlain(item.rate)}</td>
                <td style={modTdStyle({ textAlign: "right", fontWeight: "600" })}>{formatINRPlain(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tax Summary + Amount in Words */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
          {/* Amount in words */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", color: "#999", marginBottom: "4px" }}>Amount in Words</p>
            <p style={{ fontSize: "11px", fontStyle: "italic", color: "#333" }}>{data.amountInWords}</p>
            {data.remarks && (
              <div style={{ marginTop: "12px" }}>
                <p style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", color: "#999", marginBottom: "4px" }}>Remarks</p>
                <p style={{ fontSize: "10.5px", color: "#555" }}>{data.remarks}</p>
              </div>
            )}
          </div>

          {/* Tax box */}
          <div style={{ width: "260px", border: `1px solid ${ACCENT_LIGHT}`, borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ backgroundColor: ACCENT_LIGHT, padding: "6px 12px", fontSize: "9px", fontWeight: "700", textTransform: "uppercase", color: ACCENT, letterSpacing: "0.5px" }}>
              Tax Summary
            </div>
            <div style={{ padding: "0" }}>
              <div style={modSummaryRow}>
                <span>Taxable Amount</span>
                <span style={{ fontWeight: "600" }}>₹ {formatINRPlain(data.subtotal)}</span>
              </div>
              {data.cgst > 0 && (
                <div style={modSummaryRow}>
                  <span>CGST @ 9%</span>
                  <span>₹ {formatINRPlain(data.cgst)}</span>
                </div>
              )}
              {data.sgst > 0 && (
                <div style={modSummaryRow}>
                  <span>SGST @ 9%</span>
                  <span>₹ {formatINRPlain(data.sgst)}</span>
                </div>
              )}
              {data.igst > 0 && (
                <div style={modSummaryRow}>
                  <span>IGST @ 18%</span>
                  <span>₹ {formatINRPlain(data.igst)}</span>
                </div>
              )}
              {/* Grand Total */}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", backgroundColor: ACCENT, color: "#fff", fontWeight: "700", fontSize: "14px" }}>
                <span>Grand Total</span>
                <span>₹ {formatINRPlain(data.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "16px", fontSize: "10px" }}>
          <div style={{ flex: 1, backgroundColor: "#fafafa", borderRadius: "6px", padding: "10px 14px", border: "1px solid #eee" }}>
            <p style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", color: ACCENT_MID, marginBottom: "4px" }}>Bank Details</p>
            <p><strong>Bank:</strong> {data.seller.bankName}</p>
            <p><strong>Branch:</strong> {data.seller.bankBranch}</p>
            <p><strong>A/c No:</strong> {data.seller.accountNumber}</p>
            <p><strong>IFSC:</strong> {data.seller.ifscCode}</p>
          </div>
          <div style={{ flex: 1, backgroundColor: "#fafafa", borderRadius: "6px", padding: "10px 14px", border: "1px solid #eee" }}>
            <p style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", color: ACCENT_MID, marginBottom: "4px" }}>Terms & Conditions</p>
            <p>1. Payment due within 30 days of invoice date.</p>
            <p>2. Goods once sold will not be taken back.</p>
            <p>3. Subject to Bengaluru jurisdiction only.</p>
          </div>
        </div>

        {/* Signature */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #eee" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "180px", borderBottom: "1px dashed #ccc", marginBottom: "4px", height: "40px" }} />
            <p style={{ fontSize: "10px", color: "#999" }}>Receiver&apos;s Signature</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "10px", fontWeight: "600", color: ACCENT, marginBottom: "36px" }}>For {data.seller.name}</p>
            <div style={{ width: "180px", borderBottom: "1px dashed #ccc", marginBottom: "4px" }} />
            <p style={{ fontSize: "10px", color: "#999" }}>Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function modThStyle(extra: Record<string, string | undefined>): React.CSSProperties {
  return {
    padding: "8px 8px",
    backgroundColor: ACCENT,
    color: "#fff",
    fontSize: "9px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    textAlign: "left",
    ...extra,
  } as React.CSSProperties;
}

function modTdStyle(extra: Record<string, string | undefined>): React.CSSProperties {
  return {
    padding: "6px 8px",
    borderBottom: "1px solid #eee",
    fontSize: "10.5px",
    verticalAlign: "top",
    ...extra,
  } as React.CSSProperties;
}

const modSummaryRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "6px 12px",
  borderBottom: "1px solid #eee",
  fontSize: "10.5px",
};
