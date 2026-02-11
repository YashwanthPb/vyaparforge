import { type InvoiceData, formatINRPlain } from "./types";

const ACCENT = "#2563EB";

export function MinimalInvoice({ data }: { data: InvoiceData }) {
  return (
    <div className="minimal-invoice bg-white text-black" style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", fontSize: "11px", lineHeight: 1.6, padding: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "16px", fontWeight: "600", margin: 0, color: "#111" }}>{data.seller.name}</h1>
          <p style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>{data.seller.tagline}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "28px", fontWeight: "200", color: "#ddd", margin: 0, lineHeight: 1 }}>Invoice</p>
          <p style={{ fontSize: "11px", fontWeight: "600", color: ACCENT, marginTop: "4px" }}>{data.invoiceNumber}</p>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", gap: "32px", marginBottom: "28px", paddingBottom: "16px", borderBottom: "1px solid #f0f0f0" }}>
        <div>
          <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "1px", color: "#aaa", marginBottom: "2px" }}>Date</p>
          <p style={{ fontWeight: "500" }}>{data.date}</p>
        </div>
        <div>
          <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "1px", color: "#aaa", marginBottom: "2px" }}>PO Reference</p>
          <p style={{ fontWeight: "500" }}>{data.poReference}</p>
        </div>
        <div>
          <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "1px", color: "#aaa", marginBottom: "2px" }}>Place of Supply</p>
          <p style={{ fontWeight: "500" }}>{data.placeOfSupply}</p>
        </div>
      </div>

      {/* From / To */}
      <div style={{ display: "flex", gap: "48px", marginBottom: "28px" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "1px", color: "#aaa", marginBottom: "6px" }}>From</p>
          <p style={{ fontWeight: "600", fontSize: "12px" }}>{data.seller.name}</p>
          <p style={{ color: "#555" }}>{data.seller.address}, {data.seller.city} - {data.seller.pincode}</p>
          <p style={{ color: "#555" }}>State: {data.seller.state} ({data.seller.stateCode})</p>
          <p style={{ color: "#555", marginTop: "4px" }}>GSTIN: {data.seller.gstin}</p>
          <p style={{ color: "#555" }}>PAN: {data.seller.pan}</p>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "1px", color: "#aaa", marginBottom: "6px" }}>Bill To</p>
          <p style={{ fontWeight: "600", fontSize: "12px" }}>{data.buyer.name}</p>
          <p style={{ color: "#555" }}>{data.buyer.division}</p>
          <p style={{ color: "#555" }}>{data.buyer.address}, {data.buyer.city}</p>
          <p style={{ color: "#555" }}>State: {data.buyer.state} ({data.buyer.stateCode})</p>
          <p style={{ color: "#555", marginTop: "4px" }}>GSTIN: {data.buyer.gstin}</p>
        </div>
      </div>

      {/* Items table - minimal borders */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
        <thead>
          <tr>
            <th style={minThStyle({ width: "30px", textAlign: "center" })}>#</th>
            <th style={minThStyle({ width: "90px" })}>Part No.</th>
            <th style={minThStyle({})}>Description</th>
            <th style={minThStyle({ width: "65px" })}>HSN/SAC</th>
            <th style={minThStyle({ width: "70px" })}>Work Order</th>
            <th style={minThStyle({ width: "45px", textAlign: "right" })}>Qty</th>
            <th style={minThStyle({ width: "70px", textAlign: "right" })}>Rate</th>
            <th style={minThStyle({ width: "80px", textAlign: "right" })}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => (
            <tr key={item.sno}>
              <td style={minTdStyle({ textAlign: "center", color: "#999" })}>{item.sno}</td>
              <td style={minTdStyle({ fontWeight: "500" })}>{item.partNumber}</td>
              <td style={minTdStyle({})}>{item.description}</td>
              <td style={minTdStyle({ color: "#777" })}>{item.hsnSac}</td>
              <td style={minTdStyle({ color: "#777" })}>{item.workOrder || "—"}</td>
              <td style={minTdStyle({ textAlign: "right" })}>{item.qty} {item.unit}</td>
              <td style={minTdStyle({ textAlign: "right" })}>₹{formatINRPlain(item.rate)}</td>
              <td style={minTdStyle({ textAlign: "right", fontWeight: "500" })}>₹{formatINRPlain(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Tax summary - right aligned */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
        <div style={{ width: "240px" }}>
          <div style={minSummaryRow}>
            <span style={{ color: "#888" }}>Subtotal</span>
            <span>₹ {formatINRPlain(data.subtotal)}</span>
          </div>
          {data.cgst > 0 && (
            <div style={minSummaryRow}>
              <span style={{ color: "#888" }}>CGST @ 9%</span>
              <span>₹ {formatINRPlain(data.cgst)}</span>
            </div>
          )}
          {data.sgst > 0 && (
            <div style={minSummaryRow}>
              <span style={{ color: "#888" }}>SGST @ 9%</span>
              <span>₹ {formatINRPlain(data.sgst)}</span>
            </div>
          )}
          {data.igst > 0 && (
            <div style={minSummaryRow}>
              <span style={{ color: "#888" }}>IGST @ 18%</span>
              <span>₹ {formatINRPlain(data.igst)}</span>
            </div>
          )}
          {/* Grand Total line */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: `2px solid ${ACCENT}`, marginTop: "4px", fontSize: "14px", fontWeight: "700", color: ACCENT }}>
            <span>Total</span>
            <span>₹ {formatINRPlain(data.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Amount in words */}
      <div style={{ marginBottom: "24px", padding: "10px 0", borderTop: "1px solid #f0f0f0" }}>
        <p style={{ fontSize: "10px", color: "#aaa", marginBottom: "2px" }}>Amount in Words</p>
        <p style={{ fontStyle: "italic", color: "#555" }}>{data.amountInWords}</p>
      </div>

      {/* Bank + Signature */}
      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "16px", borderTop: "1px solid #f0f0f0" }}>
        <div style={{ fontSize: "10px", color: "#777" }}>
          <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "1px", color: "#aaa", marginBottom: "4px" }}>Bank Details</p>
          <p>{data.seller.bankName} — {data.seller.bankBranch}</p>
          <p>A/c: {data.seller.accountNumber} | IFSC: {data.seller.ifscCode}</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "10px", color: "#888", marginBottom: "36px" }}>For {data.seller.name}</p>
          <div style={{ width: "160px", borderBottom: "1px solid #ddd", marginBottom: "4px" }} />
          <p style={{ fontSize: "9px", color: "#aaa" }}>Authorized Signatory</p>
        </div>
      </div>
    </div>
  );
}

function minThStyle(extra: Record<string, string | undefined>): React.CSSProperties {
  return {
    padding: "8px 6px",
    borderBottom: "2px solid #111",
    fontSize: "9px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "#555",
    textAlign: "left",
    ...extra,
  } as React.CSSProperties;
}

function minTdStyle(extra: Record<string, string | undefined>): React.CSSProperties {
  return {
    padding: "7px 6px",
    borderBottom: "1px solid #f0f0f0",
    fontSize: "10.5px",
    verticalAlign: "top",
    color: "#333",
    ...extra,
  } as React.CSSProperties;
}

const minSummaryRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "5px 0",
  fontSize: "11px",
};
